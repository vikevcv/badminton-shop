import * as AuthService from '../../services/auth.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const register = async (req, res, next) => {
  try {
    const userId = await AuthService.register(req.body);
    sendSuccess(res, { userId }, 'Đăng ký tài khoản thành công!', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    sendSuccess(res, result, 'Đăng nhập thành công!');
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await AuthService.getProfile(req.user.userId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    await AuthService.updateProfile(req.user.userId, req.body);
    sendSuccess(res, null, 'Cập nhật thông tin thành công');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
    sendSuccess(res, null, 'Đổi mật khẩu thành công');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await AuthService.logout(req.token);
    sendSuccess(res, null, 'Đăng xuất thành công');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const token = await AuthService.forgotPassword(email);
    const data = process.env.NODE_ENV === 'development' ? { token } : null;
    sendSuccess(res, data, 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    sendSuccess(res, null, 'Đặt lại mật khẩu thành công');
  } catch (error) {
    next(error);
  }
};
