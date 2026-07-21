import express from 'express';
import * as userController from '../../controllers/api/user-management.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('admin'), userController.getAllUsers);
router.get('/:id', verifyToken, authorizeRoles('admin'), userController.getUserDetail);
router.put('/:id/ban', verifyToken, authorizeRoles('admin'), userController.banUser);
router.put('/:id/unban', verifyToken, authorizeRoles('admin'), userController.unbanUser);
router.put('/:id/role', verifyToken, authorizeRoles('admin'), validate({
  source: 'body',
  fields: { role: [['required', 'Vai trò']] }
}), userController.changeRole);

export default router;
