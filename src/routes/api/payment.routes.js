import express from 'express';
import * as paymentController from '../../controllers/api/payment.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.post('/', verifyToken, validate({
  source: 'body',
  fields: {
    order_code: {
      name: 'Mã đơn hàng',
      rules: [['required'], ['maxLength', 50]]
    },
    provider: {
      name: 'Cổng thanh toán',
      rules: [['required'], ['oneOf', ['momo', 'vnpay', 'zalopay', 'paypal', 'stripe', 'manual']]]
    },
    method: {
      name: 'Phương thức thanh toán',
      rules: [['required'], ['oneOf', ['wallet', 'bank_transfer', 'credit_card', 'cash']]]
    }
  }
}), paymentController.createPayment);

router.post('/callback', paymentController.handleCallback);

export default router;
