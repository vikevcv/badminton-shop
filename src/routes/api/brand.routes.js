import express from 'express';
import * as brandController from '../../controllers/api/brand.controller.js';
import { verifyToken, optionalAuth, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, brandController.getAllBrands);
router.get('/:id', brandController.getBrand);
router.post('/', verifyToken, authorizeRoles('admin'), upload.single('logo'), brandController.createBrand);
router.put('/:id', verifyToken, authorizeRoles('admin'), upload.single('logo'), brandController.updateBrand);
router.delete('/:id', verifyToken, authorizeRoles('admin'), brandController.deleteBrand);
router.put('/:id/restore', verifyToken, authorizeRoles('admin'), brandController.restoreBrand);

export default router;
