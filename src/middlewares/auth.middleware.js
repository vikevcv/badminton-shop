import jwt from 'jsonwebtoken';
import * as UserModel from '../models/user.model.js';
import { sendError } from '../helpers/response.helper.js';

// Authentication (API)
export const verifyToken = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.signedCookies?.accessToken) {
    token = req.signedCookies.accessToken;
  }

  if (!token) {
    return sendError(res, 'Vui lòng đăng nhập để truy cập tài nguyên này!', [], 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findUserForAuth(decoded.userId);
    if (!user || user.status !== 'active' || user.token_version !== decoded.token_version) {
      return sendError(res, 'Token không hợp lệ hoặc tài khoản đã bị khóa!', [], 401);
    }

    req.user = decoded;
    req.token = token;
    
    next(); 
  } catch (error) {
    return sendError(res, 'Token không hợp lệ hoặc đã hết hạn!', [], 401);
  }
};

// Authorization (role-based)
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Bạn không có quyền thực hiện hành động này!', [], 403);
    }
    next();
  };
};

// Optional auth — req.user nếu token hợp lệ, không lỗi nếu thiếu
export const optionalAuth = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.signedCookies?.accessToken) {
    token = req.signedCookies.accessToken;
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findUserForAuth(decoded.userId);
    if (user && user.status === 'active' && user.token_version === decoded.token_version) {
      req.user = decoded;
      req.token = token;
    }
  } catch (_) { /* ignore invalid token */ }
  next();
};

// Set res.locals.user cho Handlebars templates
export const setViewLocals = async (req, res, next) => {
  const token = req.signedCookies?.accessToken;
  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findUserForAuth(decoded.userId);
    if (user && user.status === 'active' && user.token_version === decoded.token_version) {
      res.locals.user = {
        id: decoded.userId,
        fullName: decoded.fullName,
        role: decoded.role
      };
    } else {
      res.locals.user = null;
    }
  } catch (_) {
    res.locals.user = null;
  }
  next();
};

// Require auth (Web SSR)
export const requireAuth = (req, res, next) => {
  const token = req.signedCookies?.accessToken;
  if (!token) {
    res.cookie('returnTo', req.originalUrl, {
      httpOnly: true, sameSite: 'strict', maxAge: 5 * 60 * 1000, path: '/'
    });
    return res.redirect('/login');
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_) {
    res.cookie('returnTo', req.originalUrl, {
      httpOnly: true, sameSite: 'strict', maxAge: 5 * 60 * 1000, path: '/'
    });
    return res.redirect('/login');
  }
};