import crypto from 'node:crypto';
import https from 'node:https';
import { BasePaymentProvider } from './provider.interface.js';
import { env } from '../../platform/config/env.js';
import { logger } from '../../platform/observability/logger.js';

export class ZaloPayPaymentProvider extends BasePaymentProvider {
  constructor() {
    super('ZALOPAY');
  }

  /**
   * Create ZaloPay payment URL
   */
  async createPaymentUrl({ booking, payment }) {
    const appId = String(env.ZALOPAY_APP_ID);
    const key1 = env.ZALOPAY_KEY1;
    const redirectUrl = env.ZALOPAY_REDIRECT_URL;

    const numericAmount = Math.round(Number(payment.amount));
    const appTransId = payment.txnRef;
    const appTime = Date.now();
    const appUser = 'CineHubCustomer';
    const embedData = JSON.stringify({ redirecturl: redirectUrl });
    const items = JSON.stringify([]);
    const description = `Thanh toan don dat ve #${booking.code}`;

    // MAC formula: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const rawData = `${appId}|${appTransId}|${appUser}|${numericAmount}|${appTime}|${embedData}|${items}`;
    const mac = crypto.createHmac('sha256', key1).update(rawData).digest('hex');

    const params = new URLSearchParams();
    params.append('app_id', appId);
    params.append('app_user', appUser);
    params.append('app_time', appTime.toString());
    params.append('amount', numericAmount.toString());
    params.append('app_trans_id', appTransId);
    params.append('embed_data', embedData);
    params.append('item', items);
    params.append('description', description);
    params.append('mac', mac);
    params.append('bank_code', '');

    const postData = params.toString();

    logger.info({ txnRef: appTransId }, '[ZaloPay Adapter] Calling ZaloPay create order');

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'sb-openapi.zalopay.vn',
        port: 443,
        path: '/v2/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
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
            reject(new Error(`Failed to parse ZaloPay response: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('ZaloPay request timed out (15s)'));
      });

      req.on('error', (e) => reject(new Error(`ZaloPay connection error: ${e.message}`)));
      req.write(postData);
      req.end();
    });

    if (response.return_code !== 1 || !response.order_url) {
      logger.error({ response, txnRef: appTransId }, '[ZaloPay Adapter] Order creation failed');
      throw new Error(
        response.return_message || response.sub_return_message || 'ZaloPay payment failed',
      );
    }

    return {
      payUrl: response.order_url,
      qrData: response.order_url,
      txnRef: appTransId,
      raw: response,
    };
  }

  /**
   * Verify ZaloPay callback signature using KEY2
   */
  verifyWebhookSignature(payload) {
    if (!payload || !payload.data || !payload.mac) return false;

    const key2 = env.ZALOPAY_KEY2;
    const computedMac = crypto.createHmac('sha256', key2).update(payload.data).digest('hex');

    return computedMac.toLowerCase() === payload.mac.toLowerCase();
  }

  /**
   * Parse ZaloPay callback payload
   */
  parseWebhookPayload(payload) {
    let data = {};
    try {
      data = JSON.parse(payload.data);
    } catch {
      // ignore
    }

    return {
      isSuccess: true,
      txnRef: data.app_trans_id,
      providerTxnNo: data.zp_trans_id ? String(data.zp_trans_id) : undefined,
      amount: data.amount ? Number(data.amount) : undefined,
      raw: payload,
    };
  }

  /**
   * Query ZaloPay transaction
   */
  async queryTransaction({ txnRef }) {
    logger.info({ txnRef }, '[ZaloPay Adapter] Querying transaction');
    return {
      isSuccess: false,
      txnRef,
      raw: { message: 'ZaloPay sandbox query placeholder' },
    };
  }
}

export const zalopayAdapter = new ZaloPayPaymentProvider();
