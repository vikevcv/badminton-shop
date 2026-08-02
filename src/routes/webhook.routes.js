import express from 'express';
import * as paymentController from '../controllers/api/payment.controller.js';

const router = express.Router();

router.get('/vnpay', paymentController.handleVnpayIpn);

export default router;
