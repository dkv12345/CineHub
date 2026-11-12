import { Router } from 'express';
import { optionalAuth } from '../../platform/http/optionalAuth.js';
import {
  momoIPNController,
  paymentMomoController,
  vietqrController,
  paymentZaloPayController,
  paymentVNPayController,
  verifyPaymentReturnController,
} from './payment.controller.js';

export const paymentRouter = Router();

paymentRouter.post('/momo/create', optionalAuth, paymentMomoController);
paymentRouter.post('/momo/:MAGD', optionalAuth, paymentMomoController);
paymentRouter.post('/momo-ipn', momoIPNController);
paymentRouter.post('/zalopay/create', optionalAuth, paymentZaloPayController);
paymentRouter.post('/vietqr/:MAGD', optionalAuth, vietqrController);
paymentRouter.post('/vnpay/create', optionalAuth, paymentVNPayController);
paymentRouter.post('/verify-return', optionalAuth, verifyPaymentReturnController);
paymentRouter.post('/confirm', optionalAuth, verifyPaymentReturnController);
