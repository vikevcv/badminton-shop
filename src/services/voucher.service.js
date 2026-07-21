import * as voucherModel from '../models/voucher.model.js';

export const validateVoucher = async (code, subtotal) => {
  const voucher = await voucherModel.findByCode(code);
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
    const error = new Error(`Đơn hàng tối thiểu ${voucher.min_order_value}đ để áp dụng mã này`);
    error.status = 400;
    throw error;
  }

  let discount = 0;
  if (voucher.discount_type === 'fixed') {
    discount = parseFloat(voucher.discount_value);
  } else {
    discount = Math.round(subtotal * parseFloat(voucher.discount_value) / 100);
  }

  if (voucher.max_discount_amount && discount > parseFloat(voucher.max_discount_amount)) {
    discount = parseFloat(voucher.max_discount_amount);
  }

  return {
    voucher,
    discount: {
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      discount_amount: discount,
      max_discount_amount: voucher.max_discount_amount,
      min_order_value: voucher.min_order_value
    }
  };
};

export const applyVoucher = async (code, subtotal) => {
  const { discount } = await validateVoucher(code, subtotal);
  return discount;
};

export const getVoucherDetail = async (code) => {
  const voucher = await voucherModel.findByCodeAdmin(code);
  if (!voucher) {
    const error = new Error('Không tìm thấy mã giảm giá');
    error.status = 404;
    throw error;
  }
  return voucher;
};

export const createVoucher = async (data) => {
  const existing = await voucherModel.findByCodeAdmin(data.code);
  if (existing) {
    const error = new Error('Mã giảm giá đã tồn tại');
    error.status = 400;
    throw error;
  }
  const id = await voucherModel.create(data);
  return id;
};

export const updateVoucher = async (code, data) => {
  const voucher = await voucherModel.findByCodeAdmin(code);
  if (!voucher) {
    const error = new Error('Không tìm thấy mã giảm giá');
    error.status = 404;
    throw error;
  }
  await voucherModel.update(voucher.id, data);
  return true;
};

export const deleteVoucher = async (code) => {
  const voucher = await voucherModel.findByCodeAdmin(code);
  if (!voucher) {
    const error = new Error('Không tìm thấy mã giảm giá');
    error.status = 404;
    throw error;
  }
  await voucherModel.softDelete(voucher.id);
  return true;
};

export const getAllVouchersAdmin = async () => {
  return await voucherModel.findAllAdmin();
};
