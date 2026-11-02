import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const sign = (ticketId, qrVersion) =>
  createHmac('sha256', env.QR_HMAC_SECRET)
    .update(`${ticketId}:${qrVersion}`)
    .digest('hex')
    .slice(0, 16);

export const buildQr = (ticketId, qrVersion) => `${ticketId}.${sign(ticketId, qrVersion)}`;

// Trả về ticketId nếu chữ ký đúng, ngược lại null. Sau đó kiểm Ticket.status trong database.
export function verifyQr(code, qrVersion) {
  const [ticketId, sig] = String(code).split('.');
  if (!ticketId || !sig) return null;
  const expected = Buffer.from(sign(ticketId, qrVersion));
  const actual = Buffer.from(sig);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? ticketId : null;
}
