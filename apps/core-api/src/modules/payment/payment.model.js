import { prisma } from '@cinehub/db';

/**
 * Payment persistence is managed in MySQL via Prisma (`prisma.payment` and `prisma.paymentWebhookEvent`).
 * Exported for backward compatibility.
 */
export const Payment = prisma.payment;
export default Payment;
