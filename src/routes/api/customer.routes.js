import express from 'express';
import * as customerController from '../../controllers/api/customer.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/profile', verifyToken, customerController.getProfile);
router.put('/profile', verifyToken, customerController.updateProfile);
router.get('/', verifyToken, authorizeRoles('admin', 'staff'), customerController.searchCustomers);
router.get('/:id/orders', verifyToken, authorizeRoles('admin', 'staff'), customerController.getCustomerOrders);

export default router;
