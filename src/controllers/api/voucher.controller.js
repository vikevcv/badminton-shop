import * as voucherService from '../../services/voucher.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllVouchers = async (req, res, next) => {
  try {
    const canViewHidden = ['admin', 'staff'].includes(req.user?.role);
    const filter = {
      displayDeleted: canViewHidden && req.query.display_deleted === 'true',
      displayInactive: canViewHidden && req.query.display_inactive === 'true'
    };
    const vouchers = await voucherService.getAllVouchers(filter);
    sendSuccess(res, vouchers);
  } catch (error) {
    next(error);
  }
};

export const validateVoucher = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    const result = await voucherService.validateVoucher(code, subtotal);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getVoucherDetail = async (req, res, next) => {
  try {
    const voucher = await voucherService.getVoucherDetail(req.params.code);
    sendSuccess(res, voucher);
  } catch (error) { next(error); }
};

export const createVoucher = async (req, res, next) => {
  try {
    const id = await voucherService.createVoucher(req.body);
    sendSuccess(res, { id }, 'Tạo mã giảm giá thành công', {}, 201);
  } catch (error) { next(error); }
};

export const updateVoucher = async (req, res, next) => {
  try {
    await voucherService.updateVoucher(req.params.code, req.body);
    sendSuccess(res, null, 'Cập nhật mã giảm giá thành công');
  } catch (error) { next(error); }
};

export const deleteVoucher = async (req, res, next) => {
  try {
    await voucherService.deleteVoucher(req.params.code);
    sendSuccess(res, null, 'Xóa mã giảm giá thành công');
  } catch (error) { next(error); }
};
