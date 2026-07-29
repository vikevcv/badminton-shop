import express from 'express';
import * as categoryController from '../../controllers/api/category.controller.js';
import { verifyToken, requireAdmin, requireAdminOrStaff, optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', categoryController.getAllCategories);
router.get('/:id', optionalAuth, categoryController.getCategory);
router.post('/', verifyToken, requireAdminOrStaff, validate({
  source: 'body',
  fields: {
    name: { name: 'Tên danh mục', rules: [['required']] }
  }
}), categoryController.createCategory);
router.put('/:id', verifyToken, requireAdminOrStaff, validate({
  source: 'body',
  fields: {
    name: { name: 'Tên danh mục', rules: [['required']] }
  }
}), categoryController.updateCategory);
router.delete('/:id', verifyToken, requireAdmin, categoryController.deleteCategory);
router.put('/:id/restore', verifyToken, requireAdmin, categoryController.restoreCategory);

export default router;
