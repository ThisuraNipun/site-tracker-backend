import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions, requireAnyPermission } from '../middlewares/rbac.middleware';
import
  {
    createRole,
    getRoles,
    getRoleById,
    updateRole,
    deleteRole
  } from '../controllers/role.controller';

const router = Router();

// All role routes require authentication
router.use(authenticate);

router.post('/', requireAnyPermission(['roles:manage', 'roles:create']), createRole);
router.get('/', requireAnyPermission(['roles:manage', 'roles:view']), getRoles);
router.get('/:id', requireAnyPermission(['roles:manage', 'roles:view']), getRoleById);
router.put('/:id', requireAnyPermission(['roles:manage', 'roles:update']), updateRole);
router.delete('/:id', requireAnyPermission(['roles:manage', 'roles:delete']), deleteRole);

export default router;
