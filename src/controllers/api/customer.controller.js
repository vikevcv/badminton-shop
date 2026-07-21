import * as customerProfileModel from '../../models/customer-profile.model.js';
import * as userModel from '../../models/user.model.js';
import * as orderModel from '../../models/order.model.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await customerProfileModel.findByUserId(req.user.userId);
    sendSuccess(res, profile || {});
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    await customerProfileModel.createOrUpdate(req.user.userId, req.body);
    sendSuccess(res, null, 'Cập nhật thông tin thành công');
  } catch (error) {
    next(error);
  }
};

export const searchCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const keyword = req.query.keyword || '';
    const result = await userModel.searchCustomers(keyword, page, limit);
    sendSuccess(res, result.customers, null, { pagination: { page, limit, totalItems: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = parseInt(req.params.id);
    const user = await userModel.findUserById(userId);
    if (!user) {
      const error = new Error('Không tìm thấy khách hàng');
      error.status = 404;
      throw error;
    }
    const result = await orderModel.findByUserId(userId, page, limit);
    sendSuccess(res, result.orders, null, { pagination: { page, limit, totalItems: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) {
    next(error);
  }
};
