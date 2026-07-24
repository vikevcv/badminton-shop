import * as userModel from '../models/user.model.js';
import * as refreshTokenModel from '../models/refresh-token.model.js';

export const getAllUsers = async ({ role, status, keyword, page, limit }) => {
  const result = await userModel.findAllUsers({ role, status, keyword, page, limit });
  return {
    users: result.users,
    total: result.total,
    pagination: {
      page, limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit)
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

export const banUser = async (id, changedBy) => {
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
  await userModel.updateUserStatus(id, 'banned', changedBy);
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
    const error = new Error('Không thể thay đổi vai trò của admin khác');
    error.status = 400;
    throw error;
  }
  await userModel.updateUserRole(id, role);
  return true;
};
