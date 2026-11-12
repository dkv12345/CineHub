import { prisma } from '@cinehub/db';
import { env } from '../../platform/config/env.js';
import { AppError } from '../../platform/utils/errors.js';
import { settlePayment } from './settle-payment.js';
import { logger } from '../../platform/observability/logger.js';

/**
 * Manually simulate payment success in sandbox development.
 * Strictly forbidden and returns 404 in production or when simulation is disabled.
 *
 * @param {string} paymentId
 * @returns {Promise<any>}
 */
export async function simulatePaymentSuccess(paymentId) {
  if (env.PAYMENT_ENV !== 'sandbox' || !env.PAYMENT_SIMULATION) {
    throw new AppError(404, 'NOT_FOUND', 'Simulation is disabled');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found');
  }

  logger.info({ paymentId, txnRef: payment.txnRef }, '[Simulation] Simulating payment success');

  const result = await settlePayment({
    txnRef: payment.txnRef,
    provider: payment.provider,
    isSuccess: true,
    providerTxnNo: `SIM_${Date.now()}`,
    bankCode: 'SIM_BANK',
    rawResponse: {
      simulated: true,
      timestamp: new Date().toISOString(),
    },
  });

  return result;
}
