import express from 'express';
import * as dashboardController from '../../controllers/api/dashboard.controller.js';
import { verifyToken, requireAdminOrStaff } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, requireAdminOrStaff, dashboardController.getDashboard);

export default router;
