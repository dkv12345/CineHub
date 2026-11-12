/**
 * @typedef {Object} PaymentCreationResult
 * @property {string} payUrl - Redirect URL to payment gateway
 * @property {string} [qrData] - Raw QR string/payload for generating QR in app
 * @property {string} [qrCodeUrl] - Gateway hosted QR image URL if provided
 * @property {string} txnRef - Unique transaction reference
 * @property {Record<string, any>} [extra]
 *
 * @typedef {Object} WebhookParseResult
 * @property {boolean} isSuccess
 * @property {string} txnRef
 * @property {string} [providerTxnNo]
 * @property {number} [amount]
 * @property {string} [bankCode]
 * @property {string} [failureCode]
 * @property {Record<string, any>} raw
 */

/**
 * Base Payment Provider Interface
 */
export class BasePaymentProvider {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * @param {Object} params
   * @param {import('@prisma/client').Booking} params.booking
   * @param {import('@prisma/client').Payment} params.payment
   * @param {string} [params.clientIp]
   * @returns {Promise<PaymentCreationResult>}
   */
  async createPaymentUrl(_params) {
    throw new Error('createPaymentUrl must be implemented');
  }

  /**
   * @param {Record<string, any>} _payload
   * @returns {boolean}
   */
  verifyWebhookSignature(_payload) {
    throw new Error('verifyWebhookSignature must be implemented');
  }

  /**
   * @param {Record<string, any>} _payload
   * @returns {WebhookParseResult}
   */
  parseWebhookPayload(_payload) {
    throw new Error('parseWebhookPayload must be implemented');
  }

  /**
   * @param {Object} _params
   * @param {string} _params.txnRef
   * @returns {Promise<WebhookParseResult | null>}
   */
  async queryTransaction(_params) {
    throw new Error('queryTransaction must be implemented');
  }
}
