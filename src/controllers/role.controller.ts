import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { sendSuccess, sendError } from '../utils/response';

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  permissionIds: z.array(z.number()).optional()
});

const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').optional(),
  permissionIds: z.array(z.number()).optional(),
  isActive: z.boolean().optional()
});

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createRoleSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { name, permissionIds } = validationResult.data;

    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      sendError(res, 409, 'Role already exists');
      return;
    }

    if (permissionIds && permissionIds.length > 0) {
      const validPermissions = await prisma.permission.count({
        where: { id: { in: permissionIds } }
      });
      if (validPermissions !== permissionIds.length) {
        sendError(res, 400, 'One or more permission IDs are invalid');
        return;
      }
    }

    // Prepare permission connections
    const permissionsData = permissionIds?.map(id => ({
      permission: { connect: { id } }
    })) || [];

    const role = await prisma.role.create({
      data: {
        name,
        permissions: {
          create: permissionsData
        }
      },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    sendSuccess(res, 201, { role }, 'Role created successfully');
  } catch (error) {
    console.error('Create role error:', error);
    sendError(res, 500, 'Failed to create role');
  }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isActiveQuery = req.query.isActive as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (isActiveQuery !== undefined) {
      whereClause.isActive = isActiveQuery === 'true';
    } else {
      whereClause.isActive = true; // By default, fetch only active roles
    }

    const [roles, totalCount] = await Promise.all([
      prisma.role.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }),
      prisma.role.count({ where: whereClause })
    ]);

    // Format roles to map nested permissions easily
    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: role.permissions.map(rp => rp.permission)
    }));

    sendSuccess(res, 200, {
      roles: formattedRoles,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get roles error:', error);
    sendError(res, 500, 'Failed to retrieve roles');
  }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid role ID');
      return;
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    if (!role) {
      sendError(res, 404, 'Role not found');
      return;
    }

    const formattedRole = {
      ...role,
      permissions: role.permissions.map(rp => rp.permission)
    };

    sendSuccess(res, 200, { role: formattedRole });
  } catch (error) {
    console.error('Get role error:', error);
    sendError(res, 500, 'Failed to retrieve role');
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid role ID');
      return;
    }

    const validationResult = updateRoleSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(res, 400, validationResult.error.issues[0].message);
      return;
    }

    const { name, permissionIds, isActive } = validationResult.data;

    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      sendError(res, 404, 'Role not found');
      return;
    }

    if (existingRole.isSystem) {
      sendError(res, 403, 'System roles (like Super Admin/Guest) cannot be modified');
      return;
    }

    if (name) {
      const nameCheck = await prisma.role.findFirst({
        where: { name, id: { not: id } }
      });
      if (nameCheck) {
        sendError(res, 409, 'Role name already exists');
        return;
      }
    }

    if (permissionIds && permissionIds.length > 0) {
      const validPermissions = await prisma.permission.count({
        where: { id: { in: permissionIds } }
      });
      if (validPermissions !== permissionIds.length) {
        sendError(res, 400, 'One or more permission IDs are invalid');
        return;
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    await prisma.$transaction(async (tx) => {
      // 1. Update basic fields
      await tx.role.update({
        where: { id },
        data: updateData
      });

      // 2. Sync permissions if provided
      if (permissionIds) {
        // Delete all existing permissions for this role
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        });

        // Insert new permissions
        if (permissionIds.length > 0) {
          const newPermissions = permissionIds.map(permId => ({
            roleId: id,
            permissionId: permId
          }));
          await tx.rolePermission.createMany({
            data: newPermissions
          });
        }
      }
    });

    // Fetch the updated role
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    const formattedRole = {
      ...updatedRole,
      permissions: updatedRole?.permissions.map(rp => rp.permission)
    };

    sendSuccess(res, 200, { role: formattedRole }, 'Role updated successfully');
  } catch (error) {
    console.error('Update role error:', error);
    sendError(res, 500, 'Failed to update role');
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid role ID');
      return;
    }

    const roleToDelete = await prisma.role.findUnique({ where: { id } });
    if (!roleToDelete) {
      sendError(res, 404, 'Role not found');
      return;
    }

    if (roleToDelete.isSystem) {
      sendError(res, 403, 'System roles cannot be deleted');
      return;
    }

    // Find the Guest role to reassign users
    const guestRole = await prisma.role.findFirst({
      where: { name: 'Guest' }
    });

    if (!guestRole) {
      sendError(res, 500, 'Guest role is missing from the system. Cannot proceed with deletion.');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Reassign users to Guest role
      await tx.user.updateMany({
        where: { roleId: id },
        data: { roleId: guestRole.id }
      });

      // 2. Soft delete the role
      await tx.role.update({
        where: { id },
        data: { isActive: false }
      });
    });

    sendSuccess(res, 200, null, 'Role deleted successfully and users reassigned to Guest');
  } catch (error) {
    console.error('Delete role error:', error);
    sendError(res, 500, 'Failed to delete role');
  }
};
