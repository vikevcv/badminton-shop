import crypto from 'crypto';
import pool from '../config/database.js';
import * as orderModel from '../models/order.model.js';
import * as cartModel from '../models/cart.model.js';
import * as voucherModel from '../models/voucher.model.js';
import * as inventoryModel from '../models/inventory.model.js';
import * as customerProfileModel from '../models/customer-profile.model.js';
import { formatVND } from '../helpers/currency.helper.js';

export const VALID_TRANSITIONS = {
  'pending_payment': ['confirmed', 'cancelled', 'payment_failed'],
  'confirmed': ['preparing', 'cancelled'],
  'preparing': ['shipping'],
  'shipping': ['completed'],
  'completed': [],
  'cancelled': [],
  'refunded': [],
  'payment_failed': ['cancelled', 'pending_payment']
};

export const STATUS_LABELS = {
  pending_payment: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  payment_failed: 'Thanh toán thất bại'
};

export const generateOrderCode = () => {
  return 'ORD' + Date.now() + crypto.randomBytes(3).toString('hex').toUpperCase();
};

export const createOrder = async (userId, data) => {
  const { shipping_fee = 0, voucher_code, note, items: selectedItems } = data;

  const cart = await cartModel.findOrCreateCart(userId);
  const cartItems = await cartModel.getCartItems(cart.id);

  if (!cartItems.length) {
    const error = new Error('Giỏ hàng trống');
    error.status = 400;
    throw error;
  }

  let itemsToOrder = cartItems;
  if (selectedItems && selectedItems.length > 0) {
    itemsToOrder = cartItems.filter(item =>
      selectedItems.includes(item.variant_id)
    );
    if (!itemsToOrder.length) {
      const error = new Error('Không có sản phẩm nào được chọn để thanh toán');
      error.status = 400;
      throw error;
    }
  }

  for (const item of itemsToOrder) {
    if (item.variant_status !== 'active') {
      const error = new Error(`Sản phẩm "${item.product_name}" đã ngừng kinh doanh`);
      error.status = 400;
      throw error;
    }
  }

  const subtotal = itemsToOrder.reduce((sum, item) =>
    sum + item.quantity * parseFloat(item.price), 0
  );

  let discountAmount = 0;
  let voucherId = null;

  if (voucher_code) {
    const voucher = await voucherModel.findByCode(voucher_code);
    if (!voucher) {
      const error = new Error('Mã giảm giá không hợp lệ');
      error.status = 400;
      throw error;
    }

    const now = new Date();
    if (voucher.start_date && new Date(voucher.start_date) > now) {
      const error = new Error('Mã giảm giá chưa đến hạn sử dụng');
      error.status = 400;
      throw error;
    }
    if (voucher.end_date && new Date(voucher.end_date) < now) {
      const error = new Error('Mã giảm giá đã hết hạn');
      error.status = 400;
      throw error;
    }
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      const error = new Error('Mã giảm giá đã hết lượt sử dụng');
      error.status = 400;
      throw error;
    }
    if (subtotal < parseFloat(voucher.min_order_value)) {
      const error = new Error(`Đơn hàng tối thiểu ${formatVND(voucher.min_order_value)} để áp dụng mã này`);
      error.status = 400;
      throw error;
    }

    if (voucher.discount_type === 'fixed') {
      discountAmount = parseFloat(voucher.discount_value);
    } else {
      discountAmount = Math.round(subtotal * parseFloat(voucher.discount_value) / 100);
    }

    if (voucher.max_discount_amount && discountAmount > parseFloat(voucher.max_discount_amount)) {
      discountAmount = parseFloat(voucher.max_discount_amount);
    }

    voucherId = voucher.id;
  }

  const finalAmount = subtotal - discountAmount + shipping_fee;

  const orderCode = generateOrderCode();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const orderId = await orderModel.createOrder({
      user_id: userId,
      voucher_id: voucherId,
      order_code: orderCode,
      subtotal,
      discount_amount: discountAmount,
      shipping_fee,
      final_amount: Math.max(finalAmount, 0),
      receiver_name: data.receiver_name,
      receiver_phone: data.receiver_phone,
      receiver_address: data.receiver_address,
      note: note || null
    }, conn);

    for (const item of itemsToOrder) {
      const lockedInventory = await inventoryModel.findByVariantIdForUpdate(item.variant_id, conn);
      if (!lockedInventory || lockedInventory.quantity < item.quantity) {
        throw new Error(`Sản phẩm "${item.product_name}" không đủ hàng`);
      }

      const totalPrice = item.quantity * parseFloat(item.price);
      await orderModel.createOrderItem(
        orderId, item.variant_id, item.quantity,
        parseFloat(item.price), totalPrice,
        item.metadata, conn
      );

      const decremented = await inventoryModel.decrementStock(item.variant_id, item.quantity, conn);
      if (!decremented) {
        throw new Error(`Sản phẩm "${item.product_name}" không đủ hàng`);
      }

      await inventoryModel.logTransaction({
        variant_id: item.variant_id,
        transaction_type: 'sale',
        quantity: -item.quantity,
        reference_type: 'order',
        reference_id: orderId,
        note: `Đơn hàng ${orderCode}`,
        created_by: userId
      }, conn);

      await cartModel.removeItem(item.id, cart.id, conn);
    }

    if (voucherId) {
      await voucherModel.lockById(voucherId, conn);
      await voucherModel.incrementUsedCount(voucherId, conn);
    }

    await customerProfileModel.updateTotalSpent(userId, Math.max(finalAmount, 0), conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return orderCode;
};

export const getOrders = async (userId, page, limit) => {
  const result = await orderModel.findByUserId(userId, page, limit);
  return {
    orders: result.orders,
    pagination: {
      page, limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  };
};

export const getAllOrders = async (page, limit, filters) => {
  return await orderModel.findAll(page, limit, filters);
};

export const getOrderDetail = async (orderCode, userId) => {
  const order = await orderModel.findByOrderCode(orderCode, userId);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  const items = await orderModel.findItemsByOrderId(order.id);

  return {
    ...order,
    formattedSubtotal: formatVND(order.subtotal),
    formattedDiscount: formatVND(order.discount_amount),
    formattedShipping: formatVND(order.shipping_fee),
    formattedFinal: formatVND(order.final_amount),
    items: items.map(item => ({
      ...item,
      formattedPrice: formatVND(item.unit_price),
      formattedTotal: formatVND(item.total_price)
    }))
  };
};

export const cancelOrder = async (orderCode, userId, cancelReason = null) => {
  const order = await orderModel.findByOrderCode(orderCode, userId);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  const cancellableStatuses = ['pending_payment', 'confirmed', 'payment_failed'];
  if (!cancellableStatuses.includes(order.status)) {
    const error = new Error('Đơn hàng không thể hủy ở trạng thái hiện tại');
    error.status = 400;
    throw error;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const locked = await orderModel.lockById(order.id, conn);

    if (!cancellableStatuses.includes(locked.status)) {
      throw new Error('Đơn hàng không thể hủy ở trạng thái hiện tại');
    }

    const oldStatus = order.status;
    await orderModel.updateStatusAndCancelReason(order.id, 'cancelled', cancelReason, conn);
    await orderModel.addStatusHistory(order.id, oldStatus, 'cancelled', userId, null, conn);

    const items = await orderModel.findItemsByOrderId(order.id);
    for (const item of items) {
      const added = await inventoryModel.addStock(item.variant_id, item.quantity, conn);
      if (!added) {
        throw new Error(`Không tìm thấy kho hàng cho biến thể ${item.variant_id}`);
      }
      await inventoryModel.logTransaction({
        variant_id: item.variant_id,
        transaction_type: 'cancel_order',
        quantity: item.quantity,
        reference_type: 'order',
        reference_id: order.id,
        note: `Hủy đơn hàng ${orderCode}`,
        created_by: userId
      }, conn);
    }

    if (order.voucher_id) {
      await voucherModel.decrementUsedCount(order.voucher_id, conn);
    }

    await customerProfileModel.updateTotalSpent(order.user_id, -parseFloat(order.final_amount), conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return true;
};

export const updateOrderStatus = async (orderCode, newStatus, changedBy = null, note = null) => {
  if (!STATUS_LABELS[newStatus]) {
    const error = new Error(`Trạng thái "${newStatus}" không hợp lệ`);
    error.status = 400;
    throw error;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const order = await orderModel.lockByOrderCode(orderCode, conn);
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      const error = new Error(
        `Không thể chuyển trạng thái từ "${STATUS_LABELS[order.status]}" sang "${STATUS_LABELS[newStatus]}"`
      );
      error.status = 400;
      throw error;
    }

    await orderModel.updateStatusWithHistory(order.id, order.status, newStatus, changedBy, note, conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return true;
};

export const getOrderStatusHistory = async (orderCode, userId = null) => {
  const order = await orderModel.findByOrderCode(orderCode, userId);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  return await orderModel.getStatusHistory(order.id);
};

export const retryPayment = async (orderCode, userId) => {
  const order = await orderModel.findByOrderCode(orderCode, userId);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  if (!['pending_payment', 'payment_failed'].includes(order.status)) {
    const error = new Error('Đơn hàng không thể thanh toán lại ở trạng thái hiện tại');
    error.status = 400;
    throw error;
  }

  return order;
};

export const updateTracking = async (orderCode, shippingProvider, trackingCode) => {
  const order = await orderModel.findByOrderCode(orderCode);
  if (!order) {
    const error = new Error('Không tìm thấy đơn hàng');
    error.status = 404;
    throw error;
  }

  if (order.status !== 'preparing' && order.status !== 'shipping') {
    const error = new Error('Chỉ có thể nhập mã vận đơn khi đơn hàng đang chuẩn bị hoặc đang giao');
    error.status = 400;
    throw error;
  }

  await orderModel.updateShipping(order.id, shippingProvider, trackingCode);
  return true;
};
