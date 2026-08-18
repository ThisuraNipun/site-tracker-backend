import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';
import {
  createPermission,
  getPermissions,
  updatePermission,
  deletePermission
} from '../controllers/permission.controller';

const router = Router();

// All permission routes require authentication and 'manage_roles' permission
router.use(authenticate, requirePermissions(['manage_roles']));

router.post('/', createPermission);
router.get('/', getPermissions);
router.put('/:id', updatePermission);
router.delete('/:id', deletePermission);

export default router;
