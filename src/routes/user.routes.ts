import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions, requireAnyPermission } from '../middlewares/rbac.middleware';
import
  {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser
  } from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Create, Update, Delete require specific permissions or 'users:manage'
router.post('/', requireAnyPermission(['users:manage', 'users:create']), createUser);
router.put('/:id', requireAnyPermission(['users:manage', 'users:update']), updateUser);
router.delete('/:id', requireAnyPermission(['users:manage', 'users:delete']), deleteUser);

// View requires either 'users:manage' OR 'users:view'
router.get('/', requireAnyPermission(['users:manage', 'users:view']), getUsers);
router.get('/:id', requireAnyPermission(['users:manage', 'users:view']), getUserById);

export default router;
