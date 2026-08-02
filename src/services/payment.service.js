import pool from '../config/database.js';
import * as paymentModel from '../models/payment.model.js';
import * as orderModel from '../models/order.model.js';
import { VALID_TRANSITIONS, STATUS_LABELS, rollbackOrderResources } from './order.service.js';
import * as vnpayService from './vnpay.service.js';
import crypto from 'crypto';

const VALID_CALLBACK_STATUSES = ['success', 'failed', 'expired', 'refunded'];
const AVAILABLE_PROVIDERS = ['vnpay', 'manual'];
const generatePaymentCode = () => {
  return 'PAY' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
};
export const createPayment = async (userId, data) => {
  const { order_code, provider, method } = data;

  const order = await orderModel.findByOrderCode(order_code, userId);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  if (order.status !== 'pending_payment') {
    const error = new Error('Đơn hàng không ở trạng thái chờ thanh toán');
    error.status = 400;
    throw error;
  }

  if (!AVAILABLE_PROVIDERS.includes(provider)) {
    const error = new Error(`Cổng thanh toán ${provider} chưa được hỗ trợ (Coming soon)`);
    error.status = 400;
    throw error;
  }

  if (provider === 'manual') {
    const existingPending = await paymentModel.findPendingByOrderId(order.id);
    if (existingPending) {
      const error = new Error(
        `Đơn đang chờ thanh toán online (mã ${existingPending.payment_code}), vui lòng hoàn tất hoặc đợi hết hạn rồi thử lại`
      );
      error.status = 400;
      throw error;
    }

    const paymentCode = generatePaymentCode();
    const paymentId = await paymentModel.create({
      order_id: order.id,
      payment_code: paymentCode,
      provider,
      method,
      amount: order.final_amount,
      status: 'success'
    });
    await paymentModel.updateStatus(paymentId, 'success', `MANUAL-${paymentCode}`);

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes('confirmed')) {
      const error = new Error(`Không thể chuyển trạng thái từ "${STATUS_LABELS[order.status]}" sang "${STATUS_LABELS['confirmed']}"`);
      error.status = 400;
      throw error;
    }

    await orderModel.updateStatus(order.id, 'confirmed');
    await orderModel.addStatusHistory(order.id, order.status, 'confirmed', userId, 'Thanh toán khi nhận hàng');

    return {
      payment_code: paymentCode,
      status: 'success',
      message: 'Thanh toán khi nhận hàng thành công'
    };
  }

  if (provider === 'vnpay') {
    const existingPending = await paymentModel.findPendingByOrderId(order.id);
    if (existingPending && existingPending.provider === 'vnpay') {
      const stored = existingPending.gateway_response ? JSON.parse(existingPending.gateway_response) : null;
      return {
        payment_code: existingPending.payment_code,
        status: 'pending',
        redirect_url: stored?.payUrl
      };
    }

    const paymentCode = generatePaymentCode();
    const vnpayRes = vnpayService.createPayment({
      amount: order.final_amount,
      orderInfo: `Thanh toan don hang ${order.order_code}`,
      txnRef: paymentCode,
      ipAddr: data.ip_addr || '127.0.0.1'
    });

    await paymentModel.create({
      order_id: order.id,
      payment_code: paymentCode,
      provider,
      method,
      amount: order.final_amount,
      status: 'pending',
      gateway_response: { payUrl: vnpayRes.payUrl }
    });

    return {
      payment_code: paymentCode,
      status: 'pending',
      redirect_url: vnpayRes.payUrl
    };
  }
};

export const handleCallback = async (data, headers = {}, options = {}) => {
  if (!options.skipSecret) {
    const secret = headers['x-webhook-secret'];
    const expectedSecret = process.env.PAYMENT_CALLBACK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      const error = new Error('Webhook secret không hợp lệ');
      error.status = 401;
      throw error;
    }
  }

  const { payment_code, transaction_id, status, gateway_response } = data;

  if (!VALID_CALLBACK_STATUSES.includes(status)) {
    const error = new Error('Trạng thái thanh toán không hợp lệ');
    error.status = 400;
    throw error;
  }

  const payment = await paymentModel.findByPaymentCode(payment_code);
  if (!payment) {
    const error = new Error('Không tìm thấy giao dịch');
    error.status = 404;
    throw error;
  }

  if (payment.status === 'success' || payment.status === 'refunded') {
    return true;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await paymentModel.updateStatus(
      payment.id, status, transaction_id || null,
      gateway_response || null, conn
    );

    const order = await orderModel.findByIdForUpdate(payment.order_id, conn);
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    if (status === 'success') {
      if (order.status !== 'pending_payment') {
        const error = new Error(`Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: ${STATUS_LABELS[order.status] || order.status})`);
        error.status = 400;
        throw error;
      }

      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes('confirmed')) {
        const error = new Error(`Không thể chuyển trạng thái từ "${STATUS_LABELS[order.status]}" sang "${STATUS_LABELS['confirmed']}"`);
        error.status = 400;
        throw error;
      }

      await orderModel.updateStatusWithHistory(
        order.id, order.status, 'confirmed', null,
        `Thanh toán thành công - ${transaction_id}`, conn
      );
    }

    if (status === 'failed' || status === 'expired') {
      if (order.status !== 'pending_payment') {
        const error = new Error(`Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: ${STATUS_LABELS[order.status] || order.status})`);
        error.status = 400;
        throw error;
      }

      await orderModel.updateStatusWithHistory(
        order.id, order.status, 'payment_failed', null,
        `Thanh toán ${status === 'failed' ? 'thất bại' : 'hết hạn'} - ${transaction_id}`, conn
      );
    }

    if (status === 'refunded') {
      if (['confirmed', 'completed', 'preparing', 'shipping'].includes(order.status)) {
        const items = await orderModel.findItemsByOrderId(order.id);
        await rollbackOrderResources(order, items, conn, null, 'refund', `Hoàn tiền đơn hàng ${order.order_code}`);
      }

      const prevStatus = order.status;
      await orderModel.updateStatusWithHistory(
        order.id, prevStatus, 'refunded', null,
        `Hoàn tiền - ${transaction_id}`, conn
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return true;
};

export const getPaymentsByOrderCode = async (orderCode, userId = null) => {
  const order = await orderModel.findByOrderCode(orderCode, userId);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }
  return await paymentModel.findByOrderId(order.id);
};

export const handleVnpayCallback = async (payload) => {
  if (!vnpayService.verifyReturnSignature(payload)) {
    const error = new Error('Chữ ký VNPay không hợp lệ');
    error.rspCode = '97';
    throw error;
  }

  const payment = await paymentModel.findByPaymentCode(payload.vnp_TxnRef);
  if (!payment) {
    const error = new Error('Không tìm thấy giao dịch');
    error.rspCode = '01';
    throw error;
  }

  if (payment.provider !== 'vnpay') {
    const error = new Error('Thông tin giao dịch không hợp lệ');
    error.rspCode = '01';
    throw error;
  }

  if (Number(payload.vnp_Amount) !== Math.round(Number(payment.amount) * 100)) {
    const error = new Error('Số tiền giao dịch không khớp');
    error.rspCode = '04';
    throw error;
  }

  if (payment.status === 'success' || payment.status === 'refunded') {
    return { RspCode: '02', Message: 'Transaction already processed' };
  }

  const status = vnpayService.normalizeStatus(payload.vnp_TransactionStatus || payload.vnp_ResponseCode);

  await handleCallback(
    {
      payment_code: payload.vnp_TxnRef,
      transaction_id: String(payload.vnp_TransactionNo || ''),
      status,
      gateway_response: payload
    },
    {},
    { skipSecret: true }
  );

  return { RspCode: '00', Message: 'success' };
};

export const getPaymentStatus = async (code, userId = null) => {
  const payment = await paymentModel.findByPaymentCode(code);
  if (!payment) {
    const error = new Error('Không tìm thấy giao dịch');
    error.status = 404;
    throw error;
  }

  const order = await orderModel.findById(payment.order_id);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  if (userId !== null && order.user_id !== userId) {
    const error = new Error('Bạn không có quyền truy cập giao dịch này');
    error.status = 403;
    throw error;
  }

  let gateway = null;
  if (payment.provider === 'vnpay') {
    gateway = await vnpayService.queryTransaction({ txnRef: payment.payment_code, amount: payment.amount });

    if (payment.status === 'pending' && gateway.vnp_TransactionStatus) {
      const status = vnpayService.normalizeStatus(gateway.vnp_TransactionStatus);
      if (status === 'success' || status === 'failed') {
        await handleCallback(
          {
            payment_code: payment.payment_code,
            transaction_id: String(gateway.vnp_TransactionNo || ''),
            status,
            gateway_response: gateway
          },
          {},
          { skipSecret: true }
        );
      }
    }
  }

  const refreshed = await paymentModel.findByPaymentCode(code);
  return { payment: refreshed, gateway };
};
