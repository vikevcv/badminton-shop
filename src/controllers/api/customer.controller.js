import * as customerService from '../../services/customer.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await customerService.getProfile(req.user.userId);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    await customerService.updateProfile(req.user.userId, req.body);
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
    const result = await customerService.searchCustomers(keyword, page, limit);
    sendSuccess(res, result.customers, null, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = parseInt(req.params.id);
    const result = await customerService.getCustomerOrders(userId, page, limit);
    sendSuccess(res, result.orders, null, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};
