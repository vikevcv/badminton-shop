import * as paymentService from '../../services/payment.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const createPayment = async (req, res, next) => {
  try {
    const result = await paymentService.createPayment(req.user.userId, req.body);
    sendSuccess(res, result, 'Tạo thanh toán thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const handleCallback = async (req, res, next) => {
  try {
    await paymentService.handleCallback(req.body, req.headers);
    sendSuccess(res, null, 'Xử lý callback thành công');
  } catch (error) {
    next(error);
  }
};
