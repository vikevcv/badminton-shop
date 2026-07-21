import * as userModel from '../../models/user.model.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const result = await userModel.findAllUsers({
      role: req.query.role || null,
      status: req.query.status || null,
      keyword: req.query.keyword || null,
      page, limit
    });
    sendSuccess(res, result.users, null, {
      pagination: {
        page, limit,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) { next(error); }
};

export const getUserDetail = async (req, res, next) => {
  try {
    const user = await userModel.findUserByIdAdmin(req.params.id);
    if (!user) {
      const error = new Error('Không tìm thấy người dùng');
      error.status = 404;
      throw error;
    }
    sendSuccess(res, user);
  } catch (error) { next(error); }
};

export const banUser = async (req, res, next) => {
  try {
    const user = await userModel.findUserById(req.params.id);
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
    await userModel.updateUserStatus(req.params.id, 'banned', req.user.userId);
    sendSuccess(res, null, 'Khóa tài khoản thành công');
  } catch (error) { next(error); }
};

export const unbanUser = async (req, res, next) => {
  try {
    const user = await userModel.findUserById(req.params.id);
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
    await userModel.updateUserStatus(req.params.id, 'active', req.user.userId);
    sendSuccess(res, null, 'Mở khóa tài khoản thành công');
  } catch (error) { next(error); }
};

export const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'staff', 'customer'];
    if (!validRoles.includes(role)) {
      const error = new Error('Vai trò không hợp lệ');
      error.status = 400;
      throw error;
    }
    const user = await userModel.findUserById(req.params.id);
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
    await userModel.updateUserRole(req.params.id, role);
    sendSuccess(res, null, 'Cập nhật vai trò thành công');
  } catch (error) { next(error); }
};
