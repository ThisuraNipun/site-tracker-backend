import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole
} from '../controllers/role.controller';

const router = Router();

// All role routes require authentication and 'manage_roles' permission
router.use(authenticate, requirePermissions(['manage_roles']));

router.post('/', createRole);
router.get('/', getRoles);
router.get('/:id', getRoleById);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
