import * as wishlistService from '../../services/wishlist.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getWishlist = async (req, res, next) => {
  try {
    const items = await wishlistService.getWishlist(req.user.userId);
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    await wishlistService.addToWishlist(req.user.userId, productId);
    sendSuccess(res, null, 'Đã thêm vào danh sách yêu thích', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    await wishlistService.removeFromWishlist(req.user.userId, req.params.productId);
    sendSuccess(res, null, 'Đã xóa khỏi danh sách yêu thích');
  } catch (error) {
    next(error);
  }
};
