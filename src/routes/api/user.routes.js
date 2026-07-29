import express from 'express';
import * as userController from '../../controllers/api/user-management.controller.js';
import { verifyToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, requireAdmin, userController.getAllUsers);
router.get('/:id', verifyToken, requireAdmin, userController.getUserDetail);
router.put('/:id/ban', verifyToken, requireAdmin, userController.banUser);
router.put('/:id/unban', verifyToken, requireAdmin, userController.unbanUser);
router.put('/:id/role', verifyToken, requireAdmin, validate({
  source: 'body',
  fields: { role: { name: 'Vai trò', rules: [['required']] } }
}), userController.changeRole);

export default router;
