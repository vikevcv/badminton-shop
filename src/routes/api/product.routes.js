import express from 'express';
import * as productController from '../../controllers/api/product.controller.js';
import { verifyToken, requireAdminOrStaff, optionalAuth, requireAdmin } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

// Public
router.get('/newest/:categorySlug', productController.getNewestByCategory);
router.get('/search', productController.searchAndFilter);
router.get('/', optionalAuth, productController.getAllProducts);

// Admin
router.post('/', verifyToken, requireAdminOrStaff, upload.single('image'), validate({
  source: 'body',
  fields: {
    name: {name: 'Tên sản phẩm', rules: [['required']]},
    category_id: { name: 'Danh mục', rules: [['required'], ['positiveInt']] },
    brand_id: { name: 'Thương hiệu', rules: [['required'], ['positiveInt']] }
  }
}), productController.createProduct);
router.put('/:id', verifyToken, requireAdminOrStaff, validate({
  source: 'body',
  fields: {
    category_id: { name: 'Danh mục', rules: [['positiveInt']] },
    brand_id: { name: 'Thương hiệu', rules: [['positiveInt']] }
  }
}), productController.updateProduct);
router.delete('/:id', verifyToken, requireAdminOrStaff, productController.deleteProduct);
router.put('/:id/restore', verifyToken, requireAdminOrStaff, productController.restoreProduct);
router.put('/:id/slug', verifyToken, requireAdmin, validate({
    source: 'body',
    fields: {
        slug: { name: 'Slug', rules: [['required']]}
    }    
}), productController.updateProductSlug);

// Variants
router.post('/:id/variants', verifyToken, requireAdminOrStaff, validate({
  source: 'body',
  fields: {
    price: { name: 'Giá bán', rules: [['required'], ['positiveNumber']] },
    cost_price: { name: 'Giá vốn', rules: [['nonNegativeNumber']] },
    stock_quantity: { name: 'Số lượng tồn kho', rules: [['nonNegativeInt']] },
    status: { name: 'Trạng thái', rules: [['oneOf', ['active', 'inactive', 'discontinued']]] },
    attribute_value_ids: { name: 'Thuộc tính', rules: [['positiveIntArray']] }
  }
}), productController.createVariant);
router.put('/:id/variants/:variantId', verifyToken, requireAdminOrStaff, validate({
  source: 'body',
  fields: {
    price: { name: 'Giá bán', rules: [['positiveNumber']] },
    cost_price: { name: 'Giá vốn', rules: [['nonNegativeNumber']] },
    status: { name: 'Trạng thái', rules: [['oneOf', ['active', 'inactive', 'discontinued']]] },
    attribute_value_ids: { name: 'Thuộc tính', rules: [['positiveIntArray']] }
  }
}), productController.updateVariant);
router.delete('/:id/variants/:variantId', verifyToken, requireAdminOrStaff, productController.deleteVariant);
router.put('/:id/variants/:variantId/restore', verifyToken, requireAdminOrStaff, productController.restoreVariant);

// Images
router.post('/:id/images', verifyToken, requireAdminOrStaff, upload.single('image'), productController.addImage);
router.delete('/:id/images/:imageId', verifyToken, requireAdminOrStaff, productController.deleteImage);
router.put('/:id/images/:imageId', verifyToken, requireAdminOrStaff, upload.single('image'), productController.updateImage);
router.put('/:id/images/:imageId/restore', verifyToken, requireAdminOrStaff, productController.restoreImage);

// Product detail (must be last — catch-all slug)
router.get('/:slug', productController.getProductDetail);

export default router;
