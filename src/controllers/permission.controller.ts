import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { sendSuccess, sendError } from '../utils/response';

const createPermissionSchema = z.object({
  name: z.string().min(1, 'Permission name is required'),
  description: z.string().optional()
});

const updatePermissionSchema = z.object({
  name: z.string().min(1, 'Permission name is required').optional(),
  description: z.string().optional()
});

export const createPermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createPermissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { name, description } = validationResult.data;

    const existingPermission = await prisma.permission.findUnique({ where: { name } });
    if (existingPermission) {
      sendError(res, 409, 'Permission already exists');
      return;
    }

    const permission = await prisma.permission.create({
      data: { name, description }
    });

    sendSuccess(res, 201, { permission }, 'Permission created successfully');
  } catch (error) {
    console.error('Create permission error:', error);
    sendError(res, 500, 'Failed to create permission');
  }
};

export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [permissions, totalCount] = await Promise.all([
      prisma.permission.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id: 'asc' }
      }),
      prisma.permission.count({ where: whereClause })
    ]);

    sendSuccess(res, 200, {
      permissions,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    sendError(res, 500, 'Failed to retrieve permissions');
  }
};

export const updatePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid permission ID');
      return;
    }

    const validationResult = updatePermissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const data = validationResult.data;

    if (data.name) {
      const existing = await prisma.permission.findFirst({
        where: { name: data.name, id: { not: id } }
      });
      if (existing) {
        sendError(res, 409, 'Permission name already exists');
        return;
      }
    }

    const updated = await prisma.permission.update({
      where: { id },
      data
    });

    sendSuccess(res, 200, { permission: updated }, 'Permission updated successfully');
  } catch (error: any) {
    console.error('Update permission error:', error);
    if (error.code === 'P2025') {
      sendError(res, 404, 'Permission not found');
    } else {
      sendError(res, 500, 'Failed to update permission');
    }
  }
};

export const deletePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid permission ID');
      return;
    }

    await prisma.permission.delete({
      where: { id }
    });

    sendSuccess(res, 200, null, 'Permission deleted successfully');
  } catch (error: any) {
    console.error('Delete permission error:', error);
    if (error.code === 'P2025') {
      sendError(res, 404, 'Permission not found');
    } else {
      sendError(res, 500, 'Failed to delete permission');
    }
  }
};
