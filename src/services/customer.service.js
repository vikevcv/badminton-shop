import * as customerProfileModel from '../models/customer-profile.model.js';
import * as userModel from '../models/user.model.js';
import * as orderModel from '../models/order.model.js';

export const getProfile = async (userId) => {
  const profile = await customerProfileModel.findByUserId(userId);
  return profile || {};
};

export const updateProfile = async (userId, data) => {
  await customerProfileModel.createOrUpdate(userId, data);
  return true;
};

export const searchCustomers = async (keyword, page = 1, limit = 20) => {
  const result = await userModel.searchCustomers(keyword, page, limit);
  return {
    customers: result.customers,
    total: result.total,
    pagination: {
      page, limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  };
};

export const getCustomerOrders = async (userId, page = 1, limit = 10) => {
  const user = await userModel.findUserById(userId);
  if (!user) {
    const error = new Error('Không tìm thấy khách hàng');
    error.status = 404;
    throw error;
  }
  const result = await orderModel.findByUserId(userId, page, limit);
  return {
    orders: result.orders,
    total: result.total,
    pagination: {
      page, limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  };
};
