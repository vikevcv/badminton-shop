import express from 'express';
import * as voucherController from '../../controllers/api/voucher.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', voucherController.getAllVouchers);

router.post('/apply', verifyToken, validate({
  source: 'body',
  fields: {
    code: [['required', 'Mã giảm giá']],
    subtotal: [['required', 'Tổng tiền hàng']]
  }
}), voucherController.applyVoucher);

router.post('/cancel', verifyToken, voucherController.cancelVoucher);

router.get('/admin', verifyToken, authorizeRoles('admin'), voucherController.getAllVouchersAdmin);
router.get('/admin/:code', verifyToken, authorizeRoles('admin'), voucherController.getVoucherDetail);
router.post('/admin', verifyToken, authorizeRoles('admin'), validate({
  source: 'body',
  fields: {
    code: [['required', 'Mã giảm giá']],
    discount_type: [['required', 'Loại giảm giá']],
    discount_value: [['required', 'Giá trị giảm']]
  }
}), voucherController.createVoucher);
router.put('/admin/:code', verifyToken, authorizeRoles('admin'), voucherController.updateVoucher);
router.delete('/admin/:code', verifyToken, authorizeRoles('admin'), voucherController.deleteVoucher);

export default router;
