import * as customerProfileModel from '../models/customer-profile.model.js';
import * as userModel from '../models/user.model.js';
import * as orderModel from '../models/order.model.js';
import { isValidDate } from '../utils/validator.util.js';
export const getProfile = async (userId) => {
  const profile = await customerProfileModel.findByUserId(userId);
  return profile || null;
};


export const updateProfile = async (userId, data) => {
  const existing = await customerProfileModel.findByUserId(userId);

  if ('birthday' in data) {
    const isValidBirthday = isValidDate(data.birthday);

    if (!isValidBirthday) {
      const error = new Error(
        'Sai định dạng ngày sinh hoặc ngày sinh không hợp lệ (VD: YYYY-MM-DD)'
      );
      error.status = 400;
      throw error;
    }
  }

  if (existing) {
    await customerProfileModel.update(userId, data);
  } else {
    await customerProfileModel.create(userId, data);
  }
};

export const searchCustomers = async (keyword, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const where = [`role = 'customer'`];
  const params = [];

  if (keyword) {
    const kw = `%${keyword}%`;

    where.push(
      `(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)`
    );

    params.push(kw, kw, kw);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const total = await userModel.countCustomers(
    whereClause,
    params
  );

  const customers = await userModel.searchCustomers(
    whereClause,
    params,
    limit,
    offset
  );

  return {
    customers,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getCustomerOrders = async (
  userId,
  page = 1,
  limit = 10
) => {
  const user = await userModel.findUserById(userId);

  if (!user) {
    const error = new Error('Không tìm thấy khách hàng');
    error.status = 404;
    throw error;
  }

  const result = await orderModel.findByUserId(userId, page, limit);

  return {
    orders: result.orders,
    pagination: {
      page,
      limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  };
};
