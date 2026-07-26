import express from 'express';
import * as brandController from '../../controllers/api/brand.controller.js';
import { verifyToken, optionalAuth, requireAdmin } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, brandController.getAllBrands);
router.get('/:id', brandController.getBrand);
router.post('/', verifyToken, requireAdmin, upload.single('logo'), brandController.createBrand);
router.put('/:id', verifyToken, requireAdmin, upload.single('logo'), brandController.updateBrand);
router.delete('/:id', verifyToken, requireAdmin, brandController.deleteBrand);
router.put('/:id/restore', verifyToken, requireAdmin, brandController.restoreBrand);

export default router;
