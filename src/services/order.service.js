import crypto from 'crypto';
import pool from '../config/database.js';
import * as orderModel from '../models/order.model.js';
import * as cartModel from '../models/cart.model.js';
import * as voucherModel from '../models/voucher.model.js';
import * as inventoryModel from '../models/inventory.model.js';
import * as paymentModel from '../models/payment.model.js';
import * as customerProfileModel from '../models/customer-profile.model.js';
import * as addressService from './address.service.js';
import { formatVND } from '../helpers/currency.helper.js';

const SHIPPING_FEE = 30000;

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
  const { shippingAddressId, voucherCode, note } = data;

  const cart = await cartModel.findByUserId(userId);
  const cartId = cart ? cart.id : await cartModel.create(userId);
  const cartItems = await cartModel.getCartItems(cartId);

  if (!cartItems.length) {
    const error = new Error('Giỏ hàng trống');
    error.status = 400;
    throw error;
  }

  const address = await addressService.getShippingAddress(userId, shippingAddressId);

  for (const item of cartItems) {
    if (item.variant_status !== 'active') {
      const error = new Error(`Sản phẩm "${item.product_name}" đã ngừng kinh doanh`);
      error.status = 400;
      throw error;
    }
  }

  const subtotal = cartItems.reduce((sum, item) =>
    sum + item.quantity * parseFloat(item.price), 0
  );

  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const orderCode = generateOrderCode();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let lockedVoucher = null;

      if (voucherCode) {
        lockedVoucher = await voucherModel.lockByCode(voucherCode, conn);
        if (!lockedVoucher) {
          const error = new Error('Mã giảm giá không hợp lệ');
          error.status = 400;
          throw error;
        }

        const now = new Date();
        if (lockedVoucher.start_date && new Date(lockedVoucher.start_date) > now) {
          const error = new Error('Mã giảm giá chưa đến hạn sử dụng');
          error.status = 400;
          throw error;
        }
        if (lockedVoucher.end_date && new Date(lockedVoucher.end_date) < now) {
          const error = new Error('Mã giảm giá đã hết hạn');
          error.status = 400;
          throw error;
        }
        if (lockedVoucher.usage_limit && lockedVoucher.used_count >= lockedVoucher.usage_limit) {
          const error = new Error('Mã giảm giá đã hết lượt sử dụng');
          error.status = 400;
          throw error;
        }
        if (subtotal < parseFloat(lockedVoucher.min_order_value)) {
          const error = new Error(`Đơn hàng tối thiểu ${formatVND(lockedVoucher.min_order_value)} để áp dụng mã này`);
          error.status = 400;
          throw error;
        }
      }

      for (const item of cartItems) {
        const lockedInventory = await inventoryModel.findByVariantIdForUpdate(item.variant_id, conn);
        if (!lockedInventory || lockedInventory.quantity < item.quantity) {
          const error = new Error(`Sản phẩm "${item.product_name}" không đủ hàng`);
          error.status = 400;
          throw error;
        }
      }

      let discountAmount = 0;
      let voucherId = null;

      if (lockedVoucher) {
        voucherId = lockedVoucher.id;

        if (lockedVoucher.discount_type === 'fixed') {
          discountAmount = parseFloat(lockedVoucher.discount_value);
        } else {
          discountAmount = Math.round(subtotal * parseFloat(lockedVoucher.discount_value) / 100);
        }

        if (lockedVoucher.max_discount_amount && discountAmount > parseFloat(lockedVoucher.max_discount_amount)) {
          discountAmount = parseFloat(lockedVoucher.max_discount_amount);
        }
      }

      const finalAmount = subtotal - discountAmount + SHIPPING_FEE;

      const orderId = await orderModel.createOrder({
        user_id: userId,
        voucher_id: voucherId,
        order_code: orderCode,
        subtotal,
        discount_amount: discountAmount,
        shipping_fee: SHIPPING_FEE,
        final_amount: Math.max(finalAmount, 0),
        receiver_name: address.receiver_name,
        receiver_phone: address.receiver_phone,
        receiver_address: address.address,
        note: note || null
      }, conn);

      for (const item of cartItems) {
        const totalPrice = item.quantity * parseFloat(item.price);
        await orderModel.createOrderItem(
          orderId, item.variant_id, item.quantity,
          parseFloat(item.price), totalPrice, conn
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

        await cartModel.removeItem(item.id, cartId, conn);
      }

      if (voucherId) {
        await voucherModel.incrementUsedCount(voucherId, conn);
      }

      await customerProfileModel.updateTotalSpent(userId, Math.max(finalAmount, 0), conn);

      await conn.commit();
      return orderCode;
    } catch (error) {
      await conn.rollback();
      if (error.errno === 1062 && attempt < MAX_RETRIES) {
        continue;
      }
      throw error;
    } finally {
      conn.release();
    }
  }
};

export const getOrders = async (userId, page, limit) => {
    const offset = (page - 1) * limit;

    const total = await orderModel.countByUserId(
        userId
    );

    const orders = await orderModel.findByUserId(
        userId,
        limit,
        offset
    );

    return {
        orders,
        pagination: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const getAllOrders = async ( page, limit, filters = {} ) => {
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (filters.status) {
    where.push('o.status = ?');
    params.push(filters.status);
  }

  if (filters.keyword) {
    where.push(
      '(o.order_code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)'
    );

    const kw = `%${filters.keyword}%`;

    params.push(kw, kw, kw);
  }

  if (filters.fromDate) {
    where.push('o.created_at >= ?');
    params.push(filters.fromDate);
  }

  if (filters.toDate) {
    where.push('o.created_at <= ?');
    params.push(filters.toDate);
  }

  const whereClause =
    where.length > 0
      ? `WHERE ${where.join(' AND ')}`
      : '';

  const total = await orderModel.countAll(
    whereClause,
    params
  );

  const orders = await orderModel.findAll(
    whereClause,
    params,
    limit,
    offset
  );

  return {
    orders,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    }
  };
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
    await rollbackOrderResources(order, items, conn, userId, 'cancel_order', `Hủy đơn hàng ${orderCode}`);

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
      const error = new Error('Không tìm thấy đơn hàng');
      error.status = 404;
      throw error;
    }

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      const error = new Error(
        `Không thể chuyển trạng thái từ "${STATUS_LABELS[order.status]}" sang "${STATUS_LABELS[newStatus]}"`
      );
      error.status = 400;
      throw error;
    }

    if (newStatus === 'confirmed' && order.status === 'pending_payment') {
      const paid = await paymentModel.findSuccessByOrderId(order.id);
      if (!paid) {
        const error = new Error('Đơn hàng chưa được thanh toán, không thể xác nhận');
        error.status = 400;
        throw error;
      }
    }

    await orderModel.updateStatusWithHistory(order.id, order.status, newStatus, changedBy, note, conn);

    if (newStatus === 'cancelled') {
      const items = await orderModel.findItemsByOrderId(order.id);
      await rollbackOrderResources(order, items, conn, changedBy, 'cancel_order', note || `Hủy đơn hàng ${orderCode}`);
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

export const rollbackOrderResources = async (order, items, conn, userId, transactionType, note) => {
  for (const item of items) {
    const lockedInventory = await inventoryModel.findByVariantIdForUpdate(item.variant_id, conn);
    if (!lockedInventory) {
      const error = new Error(`Không tìm thấy kho hàng cho biến thể ${item.variant_id}`);
      error.status = 400;
      throw error;
    }
    const added = await inventoryModel.addStock(item.variant_id, item.quantity, conn);
    if (!added) {
      const error = new Error(`Không thể hoàn kho cho biến thể ${item.variant_id}`);
      error.status = 400;
      throw error;
    }
    await inventoryModel.logTransaction({
      variant_id: item.variant_id,
      transaction_type: transactionType,
      quantity: item.quantity,
      reference_type: 'order',
      reference_id: order.id,
      note,
      created_by: userId
    }, conn);
  }

  if (order.voucher_id) {
    const lockedVoucher = await voucherModel.lockById(order.voucher_id, conn);
    if (!lockedVoucher) {
      const error = new Error('Không tìm thấy voucher');
      error.status = 400;
      throw error;
    }
    await voucherModel.decrementUsedCount(order.voucher_id, conn);
  }

  await customerProfileModel.updateTotalSpent(order.user_id, -parseFloat(order.final_amount), conn);
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
