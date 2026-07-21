import * as orderService from '../../services/order.service.js';
import * as paymentService from '../../services/payment.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const createOrder = async (req, res, next) => {
  try {
    const orderCode = await orderService.createOrder(req.user.userId, req.body);
    sendSuccess(res, { orderCode }, 'Tạo đơn hàng thành công', {}, 201);
  } catch (error) { next(error); }
};

export const getOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const result = await orderService.getOrders(req.user.userId, page, limit);
    sendSuccess(res, result.orders, null, { pagination: result.pagination });
  } catch (error) { next(error); }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const filters = {
      status: req.query.status || null,
      keyword: req.query.keyword || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null
    };
    const result = await orderService.getAllOrders(page, limit, filters);
    sendSuccess(res, result.orders, null, {
      pagination: { page, limit, totalItems: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  } catch (error) { next(error); }
};

export const getOrderDetail = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'staff'].includes(req.user.role);
    const order = await orderService.getOrderDetail(req.params.code, isAdmin ? null : req.user.userId);
    sendSuccess(res, order);
  } catch (error) { next(error); }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'staff'].includes(req.user.role);
    await orderService.cancelOrder(req.params.code, isAdmin ? null : req.user.userId, req.body?.cancel_reason);
    sendSuccess(res, null, 'Hủy đơn hàng thành công');
  } catch (error) { next(error); }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    await orderService.updateOrderStatus(req.params.code, status, req.user.userId);
    sendSuccess(res, null, 'Cập nhật trạng thái đơn hàng thành công');
  } catch (error) { next(error); }
};

export const updateTracking = async (req, res, next) => {
  try {
    const { shipping_provider, tracking_code } = req.body;
    await orderService.updateTracking(req.params.code, shipping_provider, tracking_code);
    sendSuccess(res, null, 'Cập nhật thông tin vận chuyển thành công');
  } catch (error) { next(error); }
};

export const getStatusHistory = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'staff'].includes(req.user.role);
    const history = await orderService.getOrderStatusHistory(req.params.code, isAdmin ? null : req.user.userId);
    sendSuccess(res, history);
  } catch (error) { next(error); }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'staff'].includes(req.user.role);
    const payments = await paymentService.getPaymentsByOrderCode(req.params.code, isAdmin ? null : req.user.userId);
    sendSuccess(res, payments);
  } catch (error) { next(error); }
};
