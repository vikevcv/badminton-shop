import express from 'express';
import * as categoryController from '../../controllers/api/category.controller.js';
import { verifyToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', verifyToken, requireAdmin, validate({
  source: 'body',
  fields: {
    name: [['required', 'Tên danh mục']]
  }
}), categoryController.createCategory);
router.put('/:id', verifyToken, requireAdmin, validate({
  source: 'body',
  fields: {
    name: [['required', 'Tên danh mục']]
  }
}), categoryController.updateCategory);
router.delete('/:id', verifyToken, requireAdmin, categoryController.deleteCategory);
router.put('/:id/restore', verifyToken, requireAdmin, categoryController.restoreCategory);

export default router;
