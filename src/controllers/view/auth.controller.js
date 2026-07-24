import jwt from 'jsonwebtoken';
import * as AuthService from '../../services/auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  signed: true
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS, path: '/', maxAge: 30 * 60 * 1000
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS, path: '/api/auth/refresh', maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.clearCookie('returnTo', { path: '/' });
};

const clearReturnToCookie = (res) => {
  res.clearCookie('returnTo', { path: '/' });
};

export const loginForm = (req, res) => {
  res.render('login', {
    title: 'Đăng nhập | Badminton Shop',
    layout: 'main'
  });
};

export const registerForm = (req, res) => {
  res.render('register', {
    title: 'Đăng ký | Badminton Shop',
    layout: 'main'
  });
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', {
        title: 'Đăng nhập | Badminton Shop',
        error: 'Vui lòng nhập email và mật khẩu.'
      });
    }

    const result = await AuthService.login(email, password);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    const redirectTo = req.cookies?.returnTo || '/';
    clearReturnToCookie(res);
    res.redirect(redirectTo);
  } catch (error) {
    res.render('login', {
      title: 'Đăng nhập | Badminton Shop',
      error: error.message
    });
  }
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.render('register', {
        title: 'Đăng ký | Badminton Shop',
        error: 'Vui lòng điền đầy đủ thông tin bắt buộc.'
      });
    }

    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Đăng ký | Badminton Shop',
        error: 'Mật khẩu xác nhận không khớp.'
      });
    }

    await AuthService.register({ fullName, email, password, phone });
    const result = await AuthService.login(email, password);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.redirect('/');
  } catch (error) {
    res.render('register', {
      title: 'Đăng ký | Badminton Shop',
      error: error.message
    });
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.signedCookies?.accessToken;
    const decoded = token ? jwt.decode(token) : null;
    if (token && decoded?.userId) {
      await AuthService.logout(token, decoded.userId).catch(() => {});
    }
  } catch (_) {}

  clearAuthCookies(res);
  res.redirect('/login');
};
