import express from 'express';
import * as dashboardController from '../../controllers/api/dashboard.controller.js';
import { verifyToken, authorizeRoles } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('admin', 'staff'), dashboardController.getDashboard);

export default router;
