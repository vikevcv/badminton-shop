import * as AuthService from '../../services/auth.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 30 * 60 * 1000,
  signed: true
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  signed: true
};

const setAccessCookie = (res, accessToken) => {
  if (accessToken) {
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  } else {
    res.clearCookie('accessToken', { path: '/' });
  }
};

const setRefreshCookie = (res, refreshToken) => {
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  } else {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  }
};

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
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    }, 'Đăng nhập thành công!');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const refreshTokenString = req.body?.refreshToken || req.signedCookies?.refreshToken || req.cookies?.refreshToken;
    if (!refreshTokenString) {
      const error = new Error('Refresh token không được cung cấp');
      error.status = 401;
      throw error;
    }
    const result = await AuthService.refreshAccessToken(refreshTokenString);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, result, 'Làm mới token thành công');
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
    await AuthService.logout(req.token, req.user.userId);
    setAccessCookie(res, null);
    setRefreshCookie(res, null);
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
