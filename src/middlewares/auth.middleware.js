import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { isBlacklisted, hashToken } from '../models/token-blacklist.model.js';
import { sendError } from '../helpers/response.helper.js';

// Authentication (API)
export const verifyToken = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.session && req.session.token) {
    token = req.session.token;
  }

  if (!token) {
    return sendError(res, 'Vui lòng đăng nhập để truy cập tài nguyên này!', [], 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const blacklisted = await isBlacklisted(hashToken(token));
    if (blacklisted) {
      return sendError(res, 'Token đã bị thu hồi!', [], 401);
    }

    const [users] = await pool.query(
      'SELECT status, token_version FROM users WHERE id = ? AND deleted_at IS NULL',
      [decoded.userId]
    );
    if (!users.length || users[0].status !== 'active' || users[0].token_version !== decoded.token_version) {
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
  } else if (req.session && req.session.token) {
    token = req.session.token;
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const blacklisted = await isBlacklisted(hashToken(token));
    if (!blacklisted) {
      const [users] = await pool.query(
        'SELECT status, token_version FROM users WHERE id = ? AND deleted_at IS NULL',
        [decoded.userId]
      );
      if (users.length && users[0].status === 'active' && users[0].token_version === decoded.token_version) {
        req.user = decoded;
        req.token = token;
      }
    }
  } catch (_) { /* ignore invalid token */ }
  next();
};

// Require auth (Web SSR)
export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};