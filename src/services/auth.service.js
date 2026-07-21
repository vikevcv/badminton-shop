import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as UserModel from '../models/user.model.js';
import * as passwordResetModel from '../models/password-reset.model.js';
import * as tokenBlacklistModel from '../models/token-blacklist.model.js';
import { sendWelcome, sendForgotPassword } from './mail.service.js';

const SALT_ROUNDS = 10;

const buildUserResponse = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role
});

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role, token_version: user.token_version || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
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

  const token = generateToken(user);

  return {
    token,
    user: buildUserResponse(user)
  };
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
  return true;
};

export const logout = async (token) => {
  const decoded = jwt.decode(token);
  if (decoded && decoded.exp) {
    const tokenHash = tokenBlacklistModel.hashToken(token);
    const expiresAt = new Date(decoded.exp * 1000);
    await tokenBlacklistModel.add(tokenHash, expiresAt);
  }
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
