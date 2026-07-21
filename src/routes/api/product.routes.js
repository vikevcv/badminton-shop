import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as productController from '../../controllers/api/product.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../public/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `tmp-${Date.now()}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

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
