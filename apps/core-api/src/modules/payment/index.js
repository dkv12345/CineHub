import { Router } from 'express';
import {
  momoIPNController,
  paymentMomoController,
  vietqrController,
  paymentZaloPayController,
  paymentVNPayController,
} from './payment.controller.js';

export const paymentRouter = Router();

paymentRouter.post('/momo/create', paymentMomoController);
paymentRouter.post('/momo/:MAGD', paymentMomoController);
paymentRouter.post('/momo-ipn', momoIPNController);
paymentRouter.post('/zalopay/create', paymentZaloPayController);
paymentRouter.post('/vietqr/:MAGD', vietqrController);
paymentRouter.post('/vnpay/create', paymentVNPayController);
