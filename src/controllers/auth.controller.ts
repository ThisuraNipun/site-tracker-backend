import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import crypto from 'crypto';
import { sendEmail } from '../utils/email';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters')
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const setTokensCookies = (res: Response, accessToken: string, refreshToken: string) =>
{
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const register = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { name, email, password } = validationResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
    {
      sendError(res, 409, 'User already exists');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        createdAt: true
      }
    });

    const accessToken = generateAccessToken({ id: user.id, email: user.email, roleId: user.roleId });
    const refreshToken = generateRefreshToken({ id: user.id });

    const userAgent = req.headers['user-agent'];

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        device: userAgent,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    setTokensCookies(res, accessToken, refreshToken);
    sendSuccess(res, 201, { user });
  } catch (error)
  {
    console.error('Registration error:', error);
    sendError(res, 500, 'Failed to register user');
  }
};

export const login = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { email, password } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user)
    {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
    {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    const userPermissions = user.role?.permissions.map(rp => rp.permission.name) || [];

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role?.name,
      permissions: userPermissions
    });

    const refreshToken = generateRefreshToken({ id: user.id });

    const userAgent = req.headers['user-agent'];

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        device: userAgent,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    setTokensCookies(res, accessToken, refreshToken);

    const { passwordHash, ...userWithoutPassword } = user;
    sendSuccess(res, 200, {
      user: {
        ...userWithoutPassword,
        permissions: userPermissions
      }
    }, 'Login successful!');
  } catch (error)
  {
    console.error('Login error:', error);
    sendError(res, 500, 'Failed to login user');
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> =>
{
  try
  {
    const userId = req.user?.id;

    if (!userId)
    {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user)
    {
      sendError(res, 404, 'User not found');
      return;
    }

    const userPermissions = user.role?.permissions.map(rp => rp.permission.name) || [];
    const { passwordHash, ...userWithoutPassword } = user;

    sendSuccess(res, 200, {
      ...userWithoutPassword,
      permissions: userPermissions
    }, 'User profile retrieved');
  } catch (error)
  {
    console.error('GetMe error:', error);
    sendError(res, 500, 'Failed to get user profile');
  }
};

export const logout = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken)
    {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    sendSuccess(res, 200, null, 'Logged out successfully');
  } catch (error)
  {
    console.error('Logout error:', error);
    sendError(res, 500, 'Failed to logout user');
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const token = req.cookies.refreshToken;

    if (!token)
    {
      sendError(res, 401, 'No refresh token provided');
      return;
    }

    const decoded = verifyRefreshToken(token) as any;

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token }
    });

    if (!storedToken || storedToken.expiresAt < new Date())
    {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      sendError(res, 401, 'Invalid or expired refresh token');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user)
    {
      sendError(res, 401, 'User no longer exists');
      return;
    }

    const userPermissions = user.role?.permissions.map(rp => rp.permission.name) || [];

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role?.name,
      permissions: userPermissions
    });

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    sendSuccess(res, 200, null, 'Token refreshed successfully');
  } catch (error)
  {
    console.error('Refresh token error:', error);
    sendError(res, 401, 'Invalid refresh token');
  }
};


export const forgotPassword = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = forgotPasswordSchema.safeParse(req.body);
    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { email } = validationResult.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
    {
      // Always return 200 OK to prevent email enumeration
      sendSuccess(res, 200, null, 'If that email exists in our system, we have sent a reset link');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
      html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 5 minutes.</p>`
    });

    sendSuccess(res, 200, null, 'If that email exists in our system, we have sent a reset link');
  } catch (error)
  {
    console.error('Forgot password error:', error);
    sendError(res, 500, 'Failed to process request');
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { token, newPassword } = validationResult.data;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() }
      }
    });

    if (!user)
    {
      sendError(res, 400, 'Token is invalid or has expired');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    // Delete all refresh tokens to logout from all devices
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Successful',
      text: 'Your password has been successfully reset.',
      html: '<p>Your password has been successfully reset.</p>'
    });

    sendSuccess(res, 200, null, 'Password has been reset successfully');
  } catch (error)
  {
    console.error('Reset password error:', error);
    sendError(res, 500, 'Failed to reset password');
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> =>
{
  try
  {
    const userId = req.user?.id;
    if (!userId)
    {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { oldPassword, newPassword } = validationResult.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
    {
      sendError(res, 404, 'User not found');
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch)
    {
      sendError(res, 400, 'Invalid old password');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    sendSuccess(res, 200, null, 'Password changed successfully');
  } catch (error)
  {
    console.error('Change password error:', error);
    sendError(res, 500, 'Failed to change password');
  }
};
