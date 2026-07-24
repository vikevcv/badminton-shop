import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as UserModel from '../models/user.model.js';
import * as passwordResetModel from '../models/password-reset.model.js';
import * as refreshTokenModel from '../models/refresh-token.model.js';
import pool from '../config/database.js';
import { sendWelcome, sendForgotPassword } from './mail.service.js';

const SALT_ROUNDS = 10;

const parseDuration = (duration) => {
  const match = String(duration).match(/^(\d+)\s*(d|h|m|s)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1]);
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return value * (multipliers[match[2]] || 86400000);
};

const buildUserResponse = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role
});

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role, token_version: user.token_version || 0,
      fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '30m' }
  );
};

const generateRefreshToken = async (user) => {
  const refreshTokenString = refreshTokenModel.generateTokenString();
  const tokenHash = refreshTokenModel.hashToken(refreshTokenString);
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES || '7d'));

  await refreshTokenModel.create(user.id, tokenHash, family, expiresAt);

  return { refreshTokenString, family };
};

const rotate = async (oldTokenRecord) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const locked = await refreshTokenModel.findByIdForUpdate(oldTokenRecord.id, conn);

    if (!locked || locked.revoked_at) {
      await refreshTokenModel.revokeFamily(oldTokenRecord.family);
      await conn.commit();
      const error = new Error('Phiên đăng nhập đã bị đánh cắp, vui lòng đăng nhập lại');
      error.status = 401;
      throw error;
    }

    await refreshTokenModel.revokeById(oldTokenRecord.id, conn);

    const user = await UserModel.findUserById(oldTokenRecord.user_id);
    if (!user || user.status !== 'active') {
      await conn.rollback();
      const error = new Error('Tài khoản không hợp lệ');
      error.status = 401;
      throw error;
    }

    const refreshTokenString = refreshTokenModel.generateTokenString();
    const tokenHash = refreshTokenModel.hashToken(refreshTokenString);
    const expiresAt = new Date(Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES || '7d'));

    await refreshTokenModel.create(user.id, tokenHash, oldTokenRecord.family, expiresAt, conn);

    await conn.commit();
    return { refreshTokenString, user };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const register = async (data) => {
  const { fullName, email, password, phone } = data;

  const existingEmail = await UserModel.findUserByEmail(email);
  if (existingEmail) {
    const error = new Error('Email này đã được sử dụng!');
    error.status = 400;
    throw error;
  }

  if (phone) {
    const existingPhone = await UserModel.findUserByPhone(phone);
    if (existingPhone) {
      const error = new Error('Số điện thoại này đã được đăng ký!');
      error.status = 400;
      throw error;
    }
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUserId = await UserModel.createUser({
    fullName, email, hashedPassword, phone: phone || null
  });

  sendWelcome(email, fullName);

  return newUserId;
};

export const login = async (email, password) => {
  const user = await UserModel.findUserByEmail(email);

  if (!user) {
    const error = new Error('Email hoặc mật khẩu không chính xác!');
    error.status = 401;
    throw error;
  }

  if (user.status === 'banned') {
    const error = new Error('Tài khoản của bạn đã bị khóa vi phạm!');
    error.status = 403;
    throw error;
  }
  if (user.status === 'inactive') {
    const error = new Error('Tài khoản chưa được kích hoạt!');
    error.status = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Email hoặc mật khẩu không chính xác!');
    error.status = 401;
    throw error;
  }

  const accessToken = generateAccessToken(user);
  const { refreshTokenString } = await generateRefreshToken(user);

  return {
    accessToken,
    refreshToken: refreshTokenString,
    user: buildUserResponse(user)
  };
};

export const refreshAccessToken = async (refreshTokenString) => {
  const tokenHash = refreshTokenModel.hashToken(refreshTokenString);
  const tokenRecord = await refreshTokenModel.findByHash(tokenHash);

  if (!tokenRecord) {
    const error = new Error('Refresh token không hợp lệ');
    error.status = 401;
    throw error;
  }

  if (tokenRecord.revoked_at) {
    await refreshTokenModel.revokeFamily(tokenRecord.family);
    const error = new Error('Phiên đăng nhập đã bị đánh cắp, vui lòng đăng nhập lại');
    error.status = 401;
    throw error;
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    const error = new Error('Refresh token đã hết hạn');
    error.status = 401;
    throw error;
  }

  const { refreshTokenString: newRefreshTokenString, user } = await rotate(tokenRecord);
  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    refreshToken: newRefreshTokenString
  };
};

export const verifyAdminOrStaff = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'staff') return false;
    const user = await UserModel.findUserForAuth(decoded.userId);
    if (!user || user.status !== 'active' || user.token_version !== decoded.token_version) return false;
    return true;
  } catch {
    return false;
  }
};

export const getProfile = async (userId) => {
  const user = await UserModel.findUserById(userId);
  if (!user) {
    const error = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }
  return buildUserResponse(user);
};

export const updateProfile = async (userId, data) => {
  const { fullName, phone } = data;

  if (phone) {
    const existing = await UserModel.findUserByPhone(phone);
    if (existing && existing.id !== userId) {
      const error = new Error('Số điện thoại này đã được sử dụng!');
      error.status = 400;
      throw error;
    }
  }

  await UserModel.updateProfile(userId, { full_name: fullName, phone: phone || null });
  return true;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await UserModel.findUserById(userId);
  if (!user) {
    const error = new Error('Không tìm thấy người dùng');
    error.status = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error('Mật khẩu hiện tại không chính xác');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await UserModel.updatePassword(userId, hashedPassword);
  await UserModel.incrementTokenVersion(userId);
  await refreshTokenModel.revokeAllByUserId(userId);
  return true;
};

export const logout = async (token, userId) => {
  await UserModel.incrementTokenVersion(userId);
  await refreshTokenModel.revokeAllByUserId(userId);
  return true;
};

export const forgotPassword = async (email) => {
  const user = await UserModel.findUserByEmail(email);
  if (!user) {
    return true;
  }

  const token = passwordResetModel.generateToken();
  await passwordResetModel.create(email, token);

  sendForgotPassword(email, user.full_name, token);

  return token;
};

export const resetPassword = async (token, newPassword) => {
  const reset = await passwordResetModel.findByToken(token);
  if (!reset) {
    const error = new Error('Token không hợp lệ hoặc đã hết hạn');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await UserModel.updatePasswordByEmail(reset.email, hashedPassword);
  await passwordResetModel.deleteByEmail(reset.email);
  return true;
};
