import express from 'express';
import * as orderController from '../../controllers/api/order.controller.js';
import { verifyToken, requireAdminOrStaff } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

// GET — /all before /:code (prevent matching bug)
router.get('/', verifyToken, orderController.getOrders);
router.get('/all', verifyToken, requireAdminOrStaff, orderController.getAllOrders);

// POST
router.post('/', verifyToken, validate({
  source: 'body',
  fields: {
    shippingAddressId: { name: 'ID địa chỉ giao hàng', rules: [['positiveInt']] },
    voucherCode: { name: 'Mã giảm giá', rules: [['maxLength', 50]] },
    note: { name: 'Ghi chú', rules: [['maxLength', 500]] }
  }
}), orderController.createOrder);

// GET /:code (after static routes)
router.get('/:code', verifyToken, orderController.getOrderDetail);
router.get('/:code/status-history', verifyToken, orderController.getStatusHistory);
router.get('/:code/payments', verifyToken, orderController.getPaymentHistory);

// Cancel
router.post('/:code/cancel', verifyToken, orderController.cancelOrder);

// PUT (backward compat)
router.put('/:code/status', verifyToken, requireAdminOrStaff, validate({
  source: 'body',
  fields: {
    status: {
      name: 'Trạng thái đơn hàng',
      rules: [['required'], ['oneOf', ['pending_payment', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled', 'refunded', 'payment_failed']]]
    }
  }
}), orderController.updateOrderStatus);
router.put('/:code/tracking', verifyToken, requireAdminOrStaff, orderController.updateTracking);

export default router;
