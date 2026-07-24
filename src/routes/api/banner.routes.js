import express from 'express';
import * as bannerController from '../../controllers/api/banner.controller.js';
import { verifyToken, optionalAuth, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, bannerController.getAllBanners);
router.get('/:id', optionalAuth, bannerController.getBannerDetail);

router.post('/', verifyToken, authorizeRoles('admin'), upload.single('image'), validate({
  source: 'body',
  fields: {
    title: [['required', 'Tiêu đề']]
  }
}), bannerController.createBanner);
router.put('/:id', verifyToken, authorizeRoles('admin'), upload.single('image'), bannerController.updateBanner);
router.delete('/:id', verifyToken, authorizeRoles('admin'), bannerController.deleteBanner);
router.put('/:id/restore', verifyToken, authorizeRoles('admin'), bannerController.restoreBanner);

export default router;
