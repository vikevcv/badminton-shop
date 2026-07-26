import express from 'express';
import * as productController from '../../controllers/api/product.controller.js';
import { verifyToken, requireAdminOrStaff, optionalAuth } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

// Public
router.get('/newest/:categorySlug', productController.getNewestByCategory);
router.get('/search', productController.searchAndFilter);
router.get('/', optionalAuth, productController.getAllProducts);

// Admin
router.post('/', verifyToken, requireAdminOrStaff, upload.single('image'), productController.createProduct);
router.put('/:id', verifyToken, requireAdminOrStaff, productController.updateProduct);
router.delete('/:id', verifyToken, requireAdminOrStaff, productController.deleteProduct);
router.put('/:id/restore', verifyToken, requireAdminOrStaff, productController.restoreProduct);

// Variants
router.post('/:id/variants', verifyToken, requireAdminOrStaff, productController.createVariant);
router.put('/:id/variants/:variantId', verifyToken, requireAdminOrStaff, productController.updateVariant);
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
