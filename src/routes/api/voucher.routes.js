import express from 'express';
import * as voucherController from '../../controllers/api/voucher.controller.js';
import { verifyToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', voucherController.getAllVouchers);

router.post('/apply', verifyToken, validate({
  source: 'body',
  fields: {
    code: { name: 'Mã giảm giá', rules: [['required']] },
    subtotal: { name: 'Tổng tiền hàng', rules: [['required']] }
  }
}), voucherController.applyVoucher);

router.post('/cancel', verifyToken, voucherController.cancelVoucher);

router.get('/admin', verifyToken, requireAdmin, voucherController.getAllVouchersAdmin);
router.get('/admin/:code', verifyToken, requireAdmin, voucherController.getVoucherDetail);
router.post('/admin', verifyToken, requireAdmin, validate({
  source: 'body',
  fields: {
    code: { name: 'Mã giảm giá', rules: [['required']] },
    discount_type: { name: 'Loại giảm giá', rules: [['required']] },
    discount_value: { name: 'Giá trị giảm', rules: [['required']] }
  }
}), voucherController.createVoucher);
router.put('/admin/:code', verifyToken, requireAdmin, voucherController.updateVoucher);
router.delete('/admin/:code', verifyToken, requireAdmin, voucherController.deleteVoucher);

export default router;
