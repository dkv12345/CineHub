import { Router } from 'express';
import {
  momoIPNController,
  paymentMomoController,
  vietqrController,
  paymentZaloPayController,
  paymentVNPayController,
  simulatePaymentController,
} from './payment.controller.js';

export const paymentRouter = Router();

paymentRouter.post('/momo/create', paymentMomoController);
paymentRouter.post('/momo/:MAGD', paymentMomoController);
paymentRouter.post('/momo-ipn', momoIPNController);
paymentRouter.post('/zalopay/create', paymentZaloPayController);
paymentRouter.post('/vietqr/:MAGD', vietqrController);
paymentRouter.post('/vnpay/create', paymentVNPayController);

// Dev simulation route (returns 404 if simulation disabled or production)
paymentRouter.post('/dev/:paymentId/simulate', simulatePaymentController);
