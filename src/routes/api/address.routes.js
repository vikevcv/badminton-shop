import express from 'express';
import * as addressController from '../../controllers/api/address.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, addressController.getAddresses);

router.get('/:id', verifyToken, addressController.getAddressById);

router.post('/', verifyToken, validate({
  source: 'body',
  fields: {
    receiver_name: [['required', 'Tên người nhận']],
    receiver_phone: [['required', 'Số điện thoại'], ['phone']],
    address: [['required', 'Địa chỉ']]
  }
}), addressController.createAddress);

router.put('/:id', verifyToken, validate({
  source: 'body',
  fields: {
    receiver_name: [['required', 'Tên người nhận']],
    receiver_phone: [['required', 'Số điện thoại'], ['phone']],
    address: [['required', 'Địa chỉ']]
  }
}), addressController.updateAddress);

router.delete('/:id', verifyToken, addressController.deleteAddress);

router.put('/:id/restore', verifyToken, authorizeRoles('admin'), addressController.restoreAddress);

export default router;
