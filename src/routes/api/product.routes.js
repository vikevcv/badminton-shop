import express from 'express';
import * as productController from '../../controllers/api/product.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

// Public
router.get('/newest/:categorySlug', productController.getNewestByCategory);
router.get('/search', productController.searchAndFilter);
router.get('/', productController.getAllProducts);

// Admin
router.post('/', verifyToken, authorizeRoles('admin', 'staff'), upload.single('image'), productController.createProduct);
router.put('/:id', verifyToken, authorizeRoles('admin', 'staff'), productController.updateProduct);
router.delete('/:id', verifyToken, authorizeRoles('admin', 'staff'), productController.deleteProduct);
router.put('/:id/restore', verifyToken, authorizeRoles('admin', 'staff'), productController.restoreProduct);

// Variants
router.post('/:id/variants', verifyToken, authorizeRoles('admin', 'staff'), productController.createVariant);
router.put('/:id/variants/:variantId', verifyToken, authorizeRoles('admin', 'staff'), productController.updateVariant);
router.delete('/:id/variants/:variantId', verifyToken, authorizeRoles('admin', 'staff'), productController.deleteVariant);
router.put('/:id/variants/:variantId/restore', verifyToken, authorizeRoles('admin', 'staff'), productController.restoreVariant);

// Images
router.post('/:id/images', verifyToken, authorizeRoles('admin', 'staff'), upload.single('image'), productController.addImage);
router.delete('/:id/images/:imageId', verifyToken, authorizeRoles('admin', 'staff'), productController.deleteImage);
router.put('/:id/images/:imageId', verifyToken, authorizeRoles('admin', 'staff'), upload.single('image'), productController.updateImage);
router.put('/:id/images/:imageId/restore', verifyToken, authorizeRoles('admin', 'staff'), productController.restoreImage);

// Product detail (must be last — catch-all slug)
router.get('/:slug', productController.getProductDetail);

export default router;
