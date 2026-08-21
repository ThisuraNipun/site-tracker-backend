import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendSuccess, sendError } from '../utils/response';
import { sendEmail } from '../utils/email';
import { getWelcomeTemplate } from '../utils/emailTemplates';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  phone: z.string().max(20).optional(),
  roleId: z.number().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.email('Invalid email address').optional(),
  phone: z.string().max(20).optional(),
  roleId: z.number().optional(),
  isActive: z.boolean().optional()
});

export const createUser = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const validationResult = createUserSchema.safeParse(req.body);
    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { name, email, phone, roleId } = validationResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
    {
      sendError(res, 409, 'Email is already in use');
      return;
    }

    if (roleId)
    {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role)
      {
        sendError(res, 400, 'Selected role does not exist');
        return;
      }
    }

    // Generate random password
    const temporaryPassword = crypto.randomBytes(6).toString('hex'); // 12 character password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(temporaryPassword, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        roleId
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        roleId: true,
        createdAt: true
      }
    });

    // Send welcome email with temporary password
    await sendEmail({
      to: email,
      ...getWelcomeTemplate(name, email, temporaryPassword)
    });

    sendSuccess(res, 201, { user }, 'User created successfully');
  } catch (error)
  {
    console.error('Create user error:', error);
    sendError(res, 500, 'Failed to create user');
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isActiveQuery = req.query.isActive as string;
    const roleIdQuery = parseInt(req.query.roleId as string);

    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (search)
    {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActiveQuery !== undefined)
    {
      whereClause.isActive = isActiveQuery === 'true';
    } else
    {
      whereClause.isActive = true;
    }

    if (!isNaN(roleIdQuery))
    {
      whereClause.roleId = roleIdQuery;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          roleId: true,
          createdAt: true,
          role: { select: { id: true, name: true } }
        }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    sendSuccess(res, 200, {
      users,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error)
  {
    console.error('Get users error:', error);
    sendError(res, 500, 'Failed to retrieve users');
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const id = parseInt(req.params.id as string);
    if (isNaN(id))
    {
      sendError(res, 400, 'Invalid user ID');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        role: {
          include: {
            permissions: { include: { permission: true } }
          }
        }
      }
    });

    if (!user)
    {
      sendError(res, 404, 'User not found');
      return;
    }

    const formattedUser = {
      ...user,
      permissions: user.role?.permissions.map(rp => rp.permission) || []
    };

    sendSuccess(res, 200, { user: formattedUser });
  } catch (error)
  {
    console.error('Get user by id error:', error);
    sendError(res, 500, 'Failed to retrieve user');
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const id = parseInt(req.params.id as string);
    if (isNaN(id))
    {
      sendError(res, 400, 'Invalid user ID');
      return;
    }

    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success)
    {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { name, email, phone, roleId, isActive } = validationResult.data;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser)
    {
      sendError(res, 404, 'User not found');
      return;
    }

    if (email && email !== existingUser.email)
    {
      const emailConflict = await prisma.user.findUnique({ where: { email } });
      if (emailConflict)
      {
        sendError(res, 409, 'Email is already in use by another user');
        return;
      }
    }

    if (roleId !== undefined && roleId !== existingUser.roleId)
    {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role)
      {
        sendError(res, 400, 'Selected role does not exist');
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        roleId: true,
        createdAt: true,
        role: { select: { name: true } }
      }
    });

    // If user is deactivated, delete their refresh tokens
    if (isActive === false)
    {
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    sendSuccess(res, 200, { user: updatedUser }, 'User updated successfully');
  } catch (error)
  {
    console.error('Update user error:', error);
    sendError(res, 500, 'Failed to update user');
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> =>
{
  try
  {
    const id = parseInt(req.params.id as string);
    if (isNaN(id))
    {
      sendError(res, 400, 'Invalid user ID');
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser)
    {
      sendError(res, 404, 'User not found');
      return;
    }

    await prisma.$transaction([
      // 1. Force logout by deleting refresh tokens
      prisma.refreshToken.deleteMany({ where: { userId: id } }),
      // 2. Soft delete the user
      prisma.user.update({
        where: { id },
        data: { isActive: false }
      })
    ]);

    sendSuccess(res, 200, null, 'User deleted (deactivated) successfully');
  } catch (error)
  {
    console.error('Delete user error:', error);
    sendError(res, 500, 'Failed to delete user');
  }
};
