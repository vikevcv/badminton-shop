import express from 'express';
import * as cartController from '../../controllers/api/cart.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, cartController.getCart);

router.post('/items', verifyToken, validate({
  source: 'body',
  fields: {
    variant_id: { name: 'ID biến thể', rules: [['required'], ['positiveInt']] },
    quantity: { name: 'Số lượng', rules: [['required'], ['positiveInt']] }
  }
}), cartController.addItem);

router.put('/items/:id', verifyToken, validate({
  source: 'body',
  fields: { quantity: { name: 'Số lượng', rules: [['required'], ['positiveInt']] } }
}), cartController.updateItemQuantity);

router.delete('/items/:id', verifyToken, cartController.removeItem);

router.delete('/', verifyToken, cartController.clearCart);

export default router;
