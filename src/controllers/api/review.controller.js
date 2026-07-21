import * as reviewService from '../../services/review.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getProductReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await reviewService.getProductReviews(req.params.slug, page, limit);
    sendSuccess(res, result.reviews, null, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const reviewId = await reviewService.addReview(req.user.userId, req.params.slug, rating, comment);
    sendSuccess(res, { reviewId }, 'Đánh giá thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    await reviewService.updateReview(req.params.id, req.user.userId, rating, comment);
    sendSuccess(res, null, 'Cập nhật đánh giá thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.params.id, req.user.userId, req.user.role);
    sendSuccess(res, null, 'Xóa đánh giá thành công');
  } catch (error) {
    next(error);
  }
};
