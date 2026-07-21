import express from 'express';
import * as paymentController from '../controllers/api/payment.controller.js';

const router = express.Router();

router.post('/:provider', paymentController.handleCallback);

export default router;
