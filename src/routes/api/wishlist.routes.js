import express from 'express';
import * as wishlistController from '../../controllers/api/wishlist.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, wishlistController.getWishlist);

router.post('/', verifyToken, validate({
  source: 'body',
  fields: {
    productId: { name: 'Sản phẩm', rules: [['required'], ['positiveInt']] }
  }
}), wishlistController.addToWishlist);

router.delete('/:productId', verifyToken, wishlistController.removeFromWishlist);

export default router;
