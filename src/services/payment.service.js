import pool from '../config/database.js';
import * as paymentModel from '../models/payment.model.js';
import * as orderModel from '../models/order.model.js';
import { VALID_TRANSITIONS, STATUS_LABELS, rollbackOrderResources } from './order.service.js';

const VALID_CALLBACK_STATUSES = ['success', 'failed', 'expired', 'refunded'];

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

  if (provider === 'manual') {
    const existingPending = await paymentModel.findPendingByOrderId(order.id);
    if (existingPending) {
      return {
        payment_code: existingPending.payment_code,
        status: 'success',
        message: 'Thanh toán khi nhận hàng thành công'
      };
    }

    const paymentCode = paymentModel.generatePaymentCode();
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

  const existingPending = await paymentModel.findPendingByOrderId(order.id);
  if (existingPending) {
    return {
      payment_code: existingPending.payment_code,
      status: 'pending',
      redirect_url: `https://sandbox.${provider}.vn/payment?code=${existingPending.payment_code}&amount=${order.final_amount}`
    };
  }

  const paymentCode = paymentModel.generatePaymentCode();
  await paymentModel.create({
    order_id: order.id,
    payment_code: paymentCode,
    provider,
    method,
    amount: order.final_amount,
    status: 'pending'
  });

  return {
    payment_code: paymentCode,
    status: 'pending',
    redirect_url: `https://sandbox.${provider}.vn/payment?code=${paymentCode}&amount=${order.final_amount}`
  };
};

export const handleCallback = async (data, headers = {}) => {
  const secret = headers['x-webhook-secret'];
  const expectedSecret = process.env.PAYMENT_CALLBACK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    const error = new Error('Webhook secret không hợp lệ');
    error.status = 401;
    throw error;
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
      gateway_response ? JSON.stringify(gateway_response) : null, conn
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
