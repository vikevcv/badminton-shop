import express from 'express';
import * as bannerController from '../../controllers/api/banner.controller.js';
import { verifyToken, optionalAuth, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, bannerController.getAllBanners);
router.get('/:id', optionalAuth, bannerController.getBannerDetail);

router.post('/', verifyToken, authorizeRoles('admin'), validate({
  source: 'body',
  fields: {
    title: [['required', 'Tiêu đề']],
    image_url: [['required', 'Ảnh']]
  }
}), bannerController.createBanner);
router.put('/:id', verifyToken, authorizeRoles('admin'), bannerController.updateBanner);
router.delete('/:id', verifyToken, authorizeRoles('admin'), bannerController.deleteBanner);
router.put('/:id/restore', verifyToken, authorizeRoles('admin'), bannerController.restoreBanner);

export default router;
