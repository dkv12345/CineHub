import crypto from 'node:crypto';
import https from 'node:https';
import { BasePaymentProvider } from './provider.interface.js';
import { env } from '../../platform/config/env.js';
import { logger } from '../../platform/observability/logger.js';

export class MoMoPaymentProvider extends BasePaymentProvider {
  constructor() {
    super('MOMO');
  }

  /**
   * Send HTTPS POST request using native Node.js
   * @private
   */
  async _postJson(hostname, path, payload) {
    const postData = JSON.stringify(payload);
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 15000,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse MoMo response: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('MoMo gateway request timed out (15s)'));
      });

      req.on('error', (e) => reject(new Error(`MoMo connection error: ${e.message}`)));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Create payment URL and QR data via MoMo Gateway V2
   */
  async createPaymentUrl({ booking, payment }) {
    const partnerCode = env.MOMO_PARTNER_CODE;
    const accessKey = env.MOMO_ACCESS_KEY;
    const secretKey = env.MOMO_SECRET_KEY;
    const redirectUrl = env.MOMO_REDIRECT_URL;
    const ipnUrl = env.MOMO_IPN_URL;

    const amountStr = Math.round(payment.amount).toString();
    const orderId = payment.txnRef;
    const requestId = payment.txnRef;
    const orderInfo = `Pay CineHub Booking ${booking.code}`;
    const requestType = 'captureWallet';
    const extraData = '';

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amountStr}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const payload = {
      partnerCode,
      partnerName: 'CineHub Cinema',
      storeId: 'CineHubStore',
      requestId,
      amount: Number(amountStr),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    logger.info({ txnRef: orderId }, '[MoMo Adapter] Calling MoMo create payment API');

    const response = await this._postJson(
      'test-payment.momo.vn',
      '/v2/gateway/api/create',
      payload,
    );

    if (response.resultCode !== 0) {
      logger.error({ response, txnRef: orderId }, '[MoMo Adapter] MoMo create error');
      throw new Error(response.message || 'MoMo payment creation failed');
    }

    // QR Data fallback: qrCodeUrl or payUrl or deeplink
    const qrData = response.qrCodeUrl || response.payUrl || response.deeplink;

    return {
      payUrl: response.payUrl,
      qrData,
      qrCodeUrl: response.qrCodeUrl || null,
      deeplink: response.deeplink || null,
      txnRef: orderId,
      raw: response,
    };
  }

  /**
   * Verify signature of incoming MoMo IPN
   */
  verifyWebhookSignature(payload) {
    if (!payload || !payload.signature) return false;

    const accessKey = payload.accessKey || env.MOMO_ACCESS_KEY;
    const secretKey = env.MOMO_SECRET_KEY;
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${payload.amount}` +
      `&extraData=${payload.extraData || ''}` +
      `&message=${payload.message}` +
      `&orderId=${payload.orderId}` +
      `&orderInfo=${payload.orderInfo}` +
      `&orderType=${payload.orderType}` +
      `&partnerCode=${payload.partnerCode}` +
      `&payType=${payload.payType}` +
      `&requestId=${payload.requestId}` +
      `&responseTime=${payload.responseTime}` +
      `&resultCode=${payload.resultCode}` +
      `&transId=${payload.transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(payload.signature);

    return (
      expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)
    );
  }

  /**
   * Parse IPN payload into standardized result
   */
  parseWebhookPayload(payload) {
    return {
      isSuccess: Number(payload.resultCode) === 0,
      txnRef: payload.orderId,
      providerTxnNo: payload.transId ? String(payload.transId) : undefined,
      amount: payload.amount ? Number(payload.amount) : undefined,
      bankCode: payload.payType,
      failureCode: payload.resultCode !== 0 ? String(payload.resultCode) : undefined,
      raw: payload,
    };
  }

  /**
   * Actively query transaction status from MoMo Query API
   */
  async queryTransaction({ txnRef }) {
    const partnerCode = env.MOMO_PARTNER_CODE;
    const accessKey = env.MOMO_ACCESS_KEY;
    const secretKey = env.MOMO_SECRET_KEY;
    const requestId = `${txnRef}_query_${Date.now()}`;

    const rawSignature =
      `accessKey=${accessKey}` +
      `&orderId=${txnRef}` +
      `&partnerCode=${partnerCode}` +
      `&requestId=${requestId}`;

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const payload = {
      partnerCode,
      requestId,
      orderId: txnRef,
      signature,
      lang: 'vi',
    };

    logger.info({ txnRef }, '[MoMo Adapter] Querying MoMo transaction status');

    const response = await this._postJson('test-payment.momo.vn', '/v2/gateway/api/query', payload);

    return this.parseWebhookPayload(response);
  }
}

export const momoAdapter = new MoMoPaymentProvider();
