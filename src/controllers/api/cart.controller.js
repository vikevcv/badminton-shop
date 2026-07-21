import * as cartService from '../../services/cart.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.userId);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const { variant_id, quantity, metadata } = req.body;
    const itemId = await cartService.addToCart(req.user.userId, variant_id, quantity, metadata);
    sendSuccess(res, { itemId }, 'Đã thêm vào giỏ hàng', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateItemQuantity = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    await cartService.updateQuantity(req.user.userId, parseInt(req.params.id), quantity);
    sendSuccess(res, null, 'Cập nhật số lượng thành công');
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    await cartService.removeItem(req.user.userId, parseInt(req.params.id));
    sendSuccess(res, null, 'Đã xóa sản phẩm khỏi giỏ hàng');
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    await cartService.clearCart(req.user.userId);
    sendSuccess(res, null, 'Đã xóa toàn bộ giỏ hàng');
  } catch (error) {
    next(error);
  }
};
