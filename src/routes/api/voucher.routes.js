import express from 'express';
import * as voucherController from '../../controllers/api/voucher.controller.js';
import { verifyToken, requireAdmin, optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', optionalAuth, voucherController.getAllVouchers);

router.post('/validate', verifyToken, validate({
  source: 'body',
  fields: {
    code: { name: 'Mã giảm giá', rules: [['required']] },
    subtotal: { name: 'Tổng tiền hàng', rules: [['required']] }
  }
}), voucherController.validateVoucher);

router.get('/:code', verifyToken, requireAdmin, voucherController.getVoucherDetail);
router.post('/', verifyToken, requireAdmin, validate({
  source: 'body',
  fields: {
    code: { name: 'Mã giảm giá', rules: [['required'], ['maxLength', 50]] },
    discount_type: { name: 'Loại giảm giá', rules: [['required'], ['oneOf', ['fixed', 'percent']]] },
    discount_value: { name: 'Giá trị giảm', rules: [['required'], ['nonNegativeInt']] },
    min_order_value: { name: 'Đơn hàng tối thiểu', rules: [['nonNegativeInt']] },
    max_discount_amount: { name: 'Giá trị giảm tối đa', rules: [['nonNegativeInt']] },
    usage_limit: { name: 'Số lượt dùng', rules: [['positiveInt']] },
    start_date: { name: 'Ngày bắt đầu', rules: [['date']] },
    end_date: { name: 'Ngày kết thúc', rules: [['date']] },
    status: { name: 'Trạng thái', rules: [['oneOf', ['active', 'inactive']]] }
  }
}), voucherController.createVoucher);
router.put('/:code', verifyToken, requireAdmin, validate({
  source: 'body',
  fields: {
    code: { name: 'Mã giảm giá', rules: [['required'],['maxLength', 50]] },
    discount_type: { name: 'Loại giảm giá', rules: [['oneOf', ['fixed', 'percent']]] },
    discount_value: { name: 'Giá trị giảm', rules: [['nonNegativeInt']] },
    min_order_value: { name: 'Đơn hàng tối thiểu', rules: [['nonNegativeInt']] },
    max_discount_amount: { name: 'Giá trị giảm tối đa', rules: [['nonNegativeInt']] },
    usage_limit: { name: 'Số lượt dùng', rules: [['positiveInt']] },
    start_date: { name: 'Ngày bắt đầu', rules: [['date']] },
    end_date: { name: 'Ngày kết thúc', rules: [['date']] },
    status: { name: 'Trạng thái', rules: [['oneOf', ['active', 'inactive']]] }
  }
}), voucherController.updateVoucher);
router.delete('/:code', verifyToken, requireAdmin, voucherController.deleteVoucher);

export default router;
