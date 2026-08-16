import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const register = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success)
    {
      res.status(400).json({ success: false, error: validationResult.error.issues[0].message });
      return;
    }

    const { name, email, password } = validationResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
    {
      res.status(409).json({ success: false, error: 'User already exists' });
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

    const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error)
  {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success)
    {
      res.status(400).json({ success: false, error: validationResult.error.issues[0].message });
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
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
    {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const userPermissions = user.role?.permissions.map(rp => rp.permission.name) || [];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role?.name,
        permissions: userPermissions
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Exclude passwordHash from response
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          permissions: userPermissions
        },
        token
      }
    });
  } catch (error)
  {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to login user' });
  }
};
