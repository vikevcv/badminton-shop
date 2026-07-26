import express from 'express';
import * as inventoryController from '../../controllers/api/inventory.controller.js';
import { verifyToken, requireAdminOrStaff } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, requireAdminOrStaff, inventoryController.getAllInventory);
router.put('/:variantId', verifyToken, requireAdminOrStaff, inventoryController.adjustStock);
router.get('/transactions', verifyToken, requireAdminOrStaff, inventoryController.getTransactions);

export default router;
