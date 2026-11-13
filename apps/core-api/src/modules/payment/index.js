import { Router } from 'express';
import {
  momoIPNController,
  paymentMomoController,
  vietqrController,
  paymentZaloPayController,
  paymentVNPayController,
  simulatePaymentController,
  vnpayIPNController,
  zalopayCallbackController,
} from './payment.controller.js';

export const paymentRouter = Router();

// MoMo
paymentRouter.post('/momo/create', paymentMomoController);
paymentRouter.post('/momo/:MAGD', paymentMomoController);
paymentRouter.post('/momo-ipn', momoIPNController);

// ZaloPay
paymentRouter.post('/zalopay/create', paymentZaloPayController);
paymentRouter.post('/zalopay-callback', zalopayCallbackController);

// VNPay
paymentRouter.post('/vnpay/create', paymentVNPayController);
paymentRouter.get('/vnpay-ipn', vnpayIPNController);
paymentRouter.post('/vnpay-ipn', vnpayIPNController);
paymentRouter.get('/vnpay-return', vnpayIPNController);

// VietQR
paymentRouter.post('/vietqr/:MAGD', vietqrController);

// Dev simulation route
paymentRouter.post('/dev/:paymentId/simulate', simulatePaymentController);
