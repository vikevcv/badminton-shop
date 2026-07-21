import express from 'express';
import * as AuthApiController from '../../controllers/api/auth.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.post('/register', validate({
  source: 'body',
  fields: {
    fullName: [['required', 'Họ và tên']],
    email: [['required', 'Email'], ['email']],
    password: [['required', 'Mật khẩu'], ['minLength', 'Mật khẩu', 6]],
    phone: [['phone']]
  }
}), AuthApiController.register);

router.post('/login', validate({
  source: 'body',
  fields: {
    email: [['required', 'Email']],
    password: [['required', 'Mật khẩu']]
  }
}), AuthApiController.login);

router.post('/forgot-password', validate({
  source: 'body',
  fields: { email: [['required', 'Email'], ['email']] }
}), AuthApiController.forgotPassword);

router.post('/reset-password', validate({
  source: 'body',
  fields: {
    token: [['required', 'Token']],
    newPassword: [['required', 'Mật khẩu mới'], ['minLength', 'Mật khẩu mới', 6]]
  }
}), AuthApiController.resetPassword);

router.get('/me', verifyToken, AuthApiController.getProfile);

router.put('/me', verifyToken, validate({
  source: 'body',
  fields: { fullName: [['required', 'Họ và tên']], phone: [['phone']] }
}), AuthApiController.updateProfile);

router.put('/change-password', verifyToken, validate({
  source: 'body',
  fields: {
    currentPassword: [['required', 'Mật khẩu hiện tại']],
    newPassword: [['required', 'Mật khẩu mới'], ['minLength', 'Mật khẩu mới', 6]]
  }
}), AuthApiController.changePassword);

router.post('/logout', verifyToken, AuthApiController.logout);

export default router;
