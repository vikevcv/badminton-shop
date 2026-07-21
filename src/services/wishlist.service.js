import * as wishlistModel from '../models/wishlist.model.js';
import * as productModel from '../models/product.model.js';

export const getWishlist = async (userId) => {
  const items = await wishlistModel.findByUser(userId);
  return items.map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    slug: item.slug,
    price: parseFloat(item.price),
    formattedPrice: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price || 0),
    imageUrl: item.image_url || '/images/default-racket.png',
    createdAt: item.created_at,
  }));
};

export const addToWishlist = async (userId, productId) => {
  const product = await productModel.findProductById(productId);
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }

  const existing = await wishlistModel.findOne(userId, productId);
  if (existing && !existing.deleted_at) {
    const error = new Error('Sản phẩm đã có trong danh sách yêu thích');
    error.status = 400;
    throw error;
  }

  if (existing && existing.deleted_at) {
    await wishlistModel.reactivate(userId, productId);
    return;
  }

  await wishlistModel.create(userId, productId);
};

export const removeFromWishlist = async (userId, productId) => {
  const existing = await wishlistModel.findOne(userId, productId);
  if (!existing) {
    const error = new Error('Sản phẩm không có trong danh sách yêu thích');
    error.status = 404;
    throw error;
  }

  if (existing.deleted_at) {
    const error = new Error('Sản phẩm đã được xóa khỏi danh sách yêu thích trước đó');
    error.status = 400;
    throw error;
  }

  await wishlistModel.remove(userId, productId);
};
