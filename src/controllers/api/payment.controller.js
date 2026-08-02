import * as paymentService from '../../services/payment.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

const resolveClientIp = (req) => {
  const raw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || req.ip
    || '127.0.0.1';
  if (raw.includes('::')) return '127.0.0.1';
  return raw;
};

export const createPayment = async (req, res, next) => {
  try {
    const result = await paymentService.createPayment(req.user.userId, {
      ...req.body,
      ip_addr: resolveClientIp(req)
    });
    sendSuccess(res, result, 'Tạo thanh toán thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const handleVnpayIpn = async (req, res) => {
  try {
    const result = await paymentService.handleVnpayCallback(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(200).json({
      RspCode: error.rspCode || '97',
      Message: error.message || 'Unknown error'
    });
  }
};

export const getPaymentStatus = async (req, res, next) => {
  try {
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);
    const result = await paymentService.getPaymentStatus(
      req.params.code,
      isAdminOrStaff ? null : req.user.userId
    );
    sendSuccess(res, result, 'Lấy trạng thái thanh toán thành công');
  } catch (error) {
    next(error);
  }
};
