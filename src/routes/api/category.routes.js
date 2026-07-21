import express from 'express';
import * as categoryController from '../../controllers/api/category.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', verifyToken, authorizeRoles('admin'), categoryController.createCategory);
router.put('/:id', verifyToken, authorizeRoles('admin'), categoryController.updateCategory);
router.delete('/:id', verifyToken, authorizeRoles('admin'), categoryController.deleteCategory);
router.put('/:id/restore', verifyToken, authorizeRoles('admin'), categoryController.restoreCategory);

export default router;
