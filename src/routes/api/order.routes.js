import express from 'express';
import * as orderController from '../../controllers/api/order.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

// GET — /all before /:code (prevent matching bug)
router.get('/', verifyToken, orderController.getOrders);
router.get('/all', verifyToken, authorizeRoles('admin', 'staff'), orderController.getAllOrders);

// POST
router.post('/', verifyToken, validate({
  source: 'body',
  fields: {
    receiver_name: [['required', 'Tên người nhận']],
    receiver_phone: [['required', 'Số điện thoại']],
    receiver_address: [['required', 'Địa chỉ nhận hàng']]
  }
}), orderController.createOrder);

// GET /:code (after static routes)
router.get('/:code', verifyToken, orderController.getOrderDetail);
router.get('/:code/status-history', verifyToken, orderController.getStatusHistory);
router.get('/:code/payments', verifyToken, orderController.getPaymentHistory);

// Cancel
router.post('/:code/cancel', verifyToken, orderController.cancelOrder);

// PUT (backward compat)
router.put('/:code/status', verifyToken, authorizeRoles('admin', 'staff'), orderController.updateOrderStatus);
router.put('/:code/tracking', verifyToken, authorizeRoles('admin', 'staff'), orderController.updateTracking);

export default router;
