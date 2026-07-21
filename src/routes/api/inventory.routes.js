import express from 'express';
import * as inventoryController from '../../controllers/api/inventory.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('admin', 'staff'), inventoryController.getAllInventory);
router.put('/:variantId', verifyToken, authorizeRoles('admin', 'staff'), inventoryController.adjustStock);
router.get('/transactions', verifyToken, authorizeRoles('admin', 'staff'), inventoryController.getTransactions);

export default router;
