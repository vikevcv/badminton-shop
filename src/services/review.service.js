import * as reviewModel from '../models/review.model.js';
import * as productModel from '../models/product.model.js';

export const getProductReviews = async (productSlug, page, limit) => {
  const result = await reviewModel.findByProductSlug(productSlug, page, limit);
  return {
    reviews: result.reviews,
    pagination: {
      page, limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  };
};

export const addReview = async (userId, productSlug, rating, comment) => {
  const product = await productModel.findProductBySlug(productSlug);
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }

  const existing = await reviewModel.findByUserAndProduct(userId, product.id);
  if (existing) {
    const error = new Error('Bạn đã đánh giá sản phẩm này rồi');
    error.status = 400;
    throw error;
  }

  if (rating < 1 || rating > 5) {
    const error = new Error('Đánh giá từ 1 đến 5 sao');
    error.status = 400;
    throw error;
  }

  const id = await reviewModel.create(userId, product.id, rating, comment || null);
  return id;
};

export const updateReview = async (reviewId, userId, rating, comment) => {
  const review = await reviewModel.findById(reviewId);
  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.status = 404;
    throw error;
  }
  if (Number(review.user_id) !== Number(userId)) {
    const error = new Error('Bạn chỉ có thể chỉnh sửa đánh giá của chính mình');
    error.status = 403;
    throw error;
  }
  if (rating < 1 || rating > 5) {
    const error = new Error('Đánh giá từ 1 đến 5 sao');
    error.status = 400;
    throw error;
  }
  await reviewModel.updateReview(reviewId, rating, comment || null);
};

export const deleteReview = async (reviewId, userId, role) => {
  const review = await reviewModel.findById(reviewId);
  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.status = 404;
    throw error;
  }
  if (Number(review.user_id) !== Number(userId) && role !== 'admin') {
    const error = new Error('Bạn chỉ có thể xóa đánh giá của chính mình');
    error.status = 403;
    throw error;
  }
  await reviewModel.deleteReview(reviewId);
};
