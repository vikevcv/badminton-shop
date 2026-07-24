import * as userManagementService from '../../services/user-management.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const result = await userManagementService.getAllUsers({
      role: req.query.role || null,
      status: req.query.status || null,
      keyword: req.query.keyword || null,
      page, limit
    });
    sendSuccess(res, result.users, null, { pagination: result.pagination });
  } catch (error) { next(error); }
};

export const getUserDetail = async (req, res, next) => {
  try {
    const user = await userManagementService.getUserDetail(req.params.id);
    sendSuccess(res, user);
  } catch (error) { next(error); }
};

export const banUser = async (req, res, next) => {
  try {
    await userManagementService.banUser(req.params.id, req.user.userId);
    sendSuccess(res, null, 'Khóa tài khoản thành công');
  } catch (error) { next(error); }
};

export const unbanUser = async (req, res, next) => {
  try {
    await userManagementService.unbanUser(req.params.id);
    sendSuccess(res, null, 'Mở khóa tài khoản thành công');
  } catch (error) { next(error); }
};

export const changeRole = async (req, res, next) => {
  try {
    await userManagementService.changeRole(req.params.id, req.body.role);
    sendSuccess(res, null, 'Cập nhật vai trò thành công');
  } catch (error) { next(error); }
};
