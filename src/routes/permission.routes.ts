import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions, requireAnyPermission } from '../middlewares/rbac.middleware';
import {
  createPermission,
  getPermissions,
  updatePermission,
  deletePermission
} from '../controllers/permission.controller';

const router = Router();

// All permission routes require authentication
router.use(authenticate);

router.post('/', requireAnyPermission(['permissions:manage', 'permissions:create']), createPermission);
router.get('/', requireAnyPermission(['permissions:manage', 'permissions:view']), getPermissions);
router.put('/:id', requireAnyPermission(['permissions:manage', 'permissions:update']), updatePermission);
router.delete('/:id', requireAnyPermission(['permissions:manage', 'permissions:delete']), deletePermission);

export default router;
