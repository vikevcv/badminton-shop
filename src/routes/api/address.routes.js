import express from 'express';
import * as addressController from '../../controllers/api/address.controller.js';
import { verifyToken, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, addressController.getAddresses);

router.get('/:id', verifyToken, addressController.getAddressById);

router.post('/', verifyToken, validate({
  source: 'body',
  fields: {
    receiver_name: { name: 'Tên người nhận', rules: [['required']] },
    receiver_phone: { name: 'Số điện thoại', rules: [['required'], ['phone']] },
    address: { name: 'Địa chỉ', rules: [['required']] }
  }
}), addressController.createAddress);

router.put('/:id', verifyToken, validate({
  source: 'body',
  fields: {
    receiver_name: { name: 'Tên người nhận', rules: [['required']] },
    receiver_phone: { name: 'Số điện thoại', rules: [['required'], ['phone']] },
    address: { name: 'Địa chỉ', rules: [['required']] }
  }
}), addressController.updateAddress);

router.delete('/:id', verifyToken, addressController.deleteAddress);

router.put('/:id/restore', verifyToken, requireAdmin, addressController.restoreAddress);

export default router;
