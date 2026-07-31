import express from 'express';
import * as inventoryController from '../../controllers/api/inventory.controller.js';
import { verifyToken, requireAdminOrStaff } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.get('/', verifyToken, requireAdminOrStaff, validate({
  source: 'query',
  fields: {
    page: { name: 'Trang', rules: [['positiveInt']] },
    limit: { name: 'Số lượng mỗi trang', rules: [['positiveInt'], ['maxValue', 100]] },
    keyword: { name: 'Từ khóa', rules: [['maxLength', 100]] },
    lowStock: { name: 'Ngưỡng tồn kho', rules: [['nonNegativeInt']] }
  }
}), inventoryController.getAllInventory);
router.put('/:variantId', verifyToken, requireAdminOrStaff,
  validate({
    source: 'params',
    fields: {
      variantId: { name: 'ID biến thể', rules: [['required'], ['positiveInt']] }
    }
  }),
  validate({
    source: 'body',
    fields: {
      quantity: { name: 'Số lượng', rules: [['required'], ['nonNegativeInt']] },
      note: { name: 'Ghi chú', rules: [['maxLength', 255]] }
    }
  }),
  inventoryController.adjustStock
);
router.get('/transactions', verifyToken, requireAdminOrStaff, validate({
  source: 'query',
  fields: {
    page: { name: 'Trang', rules: [['positiveInt']] },
    limit: { name: 'Số lượng mỗi trang', rules: [['positiveInt'], ['maxValue', 100]] },
    variant_id: { name: 'ID biến thể', rules: [['positiveInt']] },
    type: { name: 'Loại giao dịch', rules: [['maxLength', 50]] },
    fromDate: { name: 'Ngày bắt đầu', rules: [['date']] },
    toDate: { name: 'Ngày kết thúc', rules: [['date']] }
  }
}), inventoryController.getTransactions);

export default router;
