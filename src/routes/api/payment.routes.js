import express from 'express';
import * as paymentController from '../../controllers/api/payment.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', verifyToken, paymentController.createPayment);

router.post('/callback', paymentController.handleCallback);

export default router;
