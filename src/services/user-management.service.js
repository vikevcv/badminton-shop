import * as userModel from '../models/user.model.js';
import * as refreshTokenModel from '../models/refresh-token.model.js';

export const getAllUsers = async ({role, status, keyword, page, limit}) => {
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (role) {
    where.push('u.role = ?');
    params.push(role);
  }

  if (status) {
    where.push('u.status = ?');
    params.push(status);
  }

  if (keyword) {
    where.push(
      '(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'
    );

    const kw = `%${keyword}%`;

    params.push(kw, kw, kw);
  }

  const whereClause =
    where.length > 0
      ? `WHERE ${where.join(' AND ')}`
      : '';

  const total = await userModel.countAll(
    whereClause,
    params
  );

  const users = await userModel.findAll(
    whereClause,
    params,
    limit,
    offset
  );

  return {
    users,
    total,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getUserDetail = async (id) => {
  const user = await userModel.findUserByIdAdmin(id);
  if (!user) {
    const error = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }
  return user;
};

export const banUser = async (id) => {
  const user = await userModel.findUserById(id);
  if (!user) {
    const error = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }
  if (user.role === 'admin') {
    const error = new Error('Không thể khóa tài khoản admin');
    error.status = 400;
    throw error;
  }
  if (user.status === 'banned') {
    const error = new Error('Tài khoản này đã bị khóa trước đó');
    error.status = 400;
    throw error;
  }
  await userModel.updateUserStatus(id, 'banned');
  await refreshTokenModel.revokeAllByUserId(user.id);
  return true;
};

export const unbanUser = async (id) => {
  const user = await userModel.findUserById(id);
  if (!user) {
    const error = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }
  if (user.status !== 'banned') {
    const error = new Error('Tài khoản này chưa bị khóa');
    error.status = 400;
    throw error;
  }
  await userModel.updateUserStatus(id, 'active');
  return true;
};

export const changeRole = async (id, role) => {
  const validRoles = ['admin', 'staff', 'customer'];
  if (!validRoles.includes(role)) {
    const error = new Error('Vai trò không hợp lệ');
    error.status = 400;
    throw error;
  }
  const user = await userModel.findUserById(id);
  if (!user) {
    const error = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }
  if (user.role === 'admin') {
    const error = new Error('Không thể thay đổi vai trò của admin');
    error.status = 400;
    throw error;
  }
  await userModel.updateUserRole(id, role);
  return true;
};
