import express from 'express';
import * as bannerController from '../../controllers/api/banner.controller.js';
import { verifyToken, optionalAuth, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, bannerController.getAllBanners);
router.get('/:id', optionalAuth, bannerController.getBannerDetail);

router.post('/', verifyToken, requireAdmin, upload.single('image'), validate({
  source: 'body',
  fields: {
    title: [['required', 'Tiêu đề']]
  }
}), bannerController.createBanner);
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), bannerController.updateBanner);
router.delete('/:id', verifyToken, requireAdmin, bannerController.deleteBanner);
router.put('/:id/restore', verifyToken, requireAdmin, bannerController.restoreBanner);

export default router;
