import express from 'express';
import * as reviewController from '../../controllers/api/review.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/:slug', reviewController.getProductReviews);

router.post('/:slug', verifyToken, validate({
  source: 'body',
  fields: {
    rating: [['required', 'Đánh giá'], ['inRange', 'Đánh giá', 1, 5]]
  }
}), reviewController.addReview);

router.put('/:id', verifyToken, validate({
  source: 'body',
  fields: {
    rating: [['required', 'Đánh giá'], ['inRange', 'Đánh giá', 1, 5]]
  }
}), reviewController.updateReview);

router.delete('/:id', verifyToken, reviewController.deleteReview);

export default router;
