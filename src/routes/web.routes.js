import express from 'express';
import * as homeController from '../controllers/view/home.controller.js';
import * as productController from '../controllers/view/product.controller.js';
import * as authController from '../controllers/view/auth.controller.js';

const router = express.Router();

router.get('/', homeController.index);
router.get('/products', productController.index);
router.get('/product/:slug', productController.getDetail);

router.get('/login', authController.loginForm);
router.post('/login', authController.login);
router.get('/register', authController.registerForm);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

export default router;
