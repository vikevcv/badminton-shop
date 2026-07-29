import express from 'express';
import * as AuthApiController from '../../controllers/api/auth.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.post('/register', validate({
  source: 'body',
  fields: {
    fullName: { name: 'Họ và tên', rules: [['required']] },
    email: { name: 'Email', rules: [['required'], ['email']] },
    password: { name: 'Mật khẩu', rules: [['required'], ['minLength', 6]] },
    phone: { name: 'Số điện thoại', rules: [['phone']] }
  }
}), AuthApiController.register);

router.post('/login', validate({
  source: 'body',
  fields: {
    email: { name: 'Email', rules: [['required']] },
    password: { name: 'Mật khẩu', rules: [['required']] }
  }
}), AuthApiController.login);

router.post('/forgot-password', validate({
  source: 'body',
  fields: { email: { name: 'Email', rules: [['required'], ['email']] } }
}), AuthApiController.forgotPassword);

router.post('/reset-password', validate({
  source: 'body',
  fields: {
    token: { name: 'Token', rules: [['required']] },
    newPassword: { name: 'Mật khẩu mới', rules: [['required'], ['minLength', 6]] }
  }
}), AuthApiController.resetPassword);

router.get('/me', verifyToken, AuthApiController.getProfile);

router.put('/me', verifyToken, validate({
  source: 'body',
  fields: { fullName: { name: 'Họ và tên', rules: [['required']] }, phone: { name: 'Số điện thoại', rules: [['phone']] } }
}), AuthApiController.updateProfile);

router.put('/change-password', verifyToken, validate({
  source: 'body',
  fields: {
    currentPassword: { name: 'Mật khẩu hiện tại', rules: [['required']] },
    newPassword: { name: 'Mật khẩu mới', rules: [['required'], ['minLength', 6]] }
  }
}), AuthApiController.changePassword);

router.post('/logout', verifyToken, AuthApiController.logout);

router.post('/refresh', AuthApiController.refreshToken);

export default router;
