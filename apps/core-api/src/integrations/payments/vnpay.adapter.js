import crypto from 'node:crypto';
import querystring from 'qs';
import { BasePaymentProvider } from './provider.interface.js';
import { env } from '../../platform/config/env.js';
import { logger } from '../../platform/observability/logger.js';

export class VNPayPaymentProvider extends BasePaymentProvider {
  constructor() {
    super('VNPAY');
  }

  /**
   * Sort object alphabetically by keys for VNPay signature calculation
   * @private
   */
  _sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
        sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
      }
    }
    return sorted;
  }

  /**
   * Create VNPay payment URL
   */
  async createPaymentUrl({ booking, payment, clientIp }) {
    const tmnCode = env.VNP_TMN_CODE;
    const secretKey = env.VNP_HASH_SECRET;
    const vnpUrl = env.VNP_URL;
    const returnUrl = env.VNP_RETURN_URL;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value || '00';

    const createDate =
      getPart('year') +
      getPart('month') +
      getPart('day') +
      getPart('hour') +
      getPart('minute') +
      getPart('second');

    const numericAmount = Math.round(Number(payment.amount)) * 100;
    const orderId = payment.txnRef;

    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Pay CineHub Booking ${booking.code}`,
      vnp_OrderType: 'billpayment',
      vnp_Amount: numericAmount.toString(),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedParams = this._sortObject(vnp_Params);
    const signData = querystring.stringify(sortedParams, { encode: false });

    const signed = crypto
      .createHmac('sha512', secretKey)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    sortedParams['vnp_SecureHash'] = signed;
    const paymentUrl = `${vnpUrl}?${querystring.stringify(sortedParams, { encode: false })}`;

    return {
      payUrl: paymentUrl,
      qrData: paymentUrl,
      txnRef: orderId,
    };
  }

  /**
   * Verify signature of incoming VNPay IPN or Return URL
   */
  verifyWebhookSignature(payload) {
    if (!payload) return false;

    const vnp_Params = { ...payload };
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this._sortObject(vnp_Params);
    const signData = querystring.stringify(sortedParams, { encode: false });

    const secretKey = env.VNP_HASH_SECRET;
    const signed = crypto
      .createHmac('sha512', secretKey)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return secureHash && secureHash.toLowerCase() === signed.toLowerCase();
  }

  /**
   * Parse VNPay IPN / callback payload
   */
  parseWebhookPayload(payload) {
    const isSuccess =
      payload.vnp_ResponseCode === '00' &&
      (payload.vnp_TransactionStatus === '00' || !payload.vnp_TransactionStatus);
    const amount = payload.vnp_Amount ? Number(payload.vnp_Amount) / 100 : undefined;

    return {
      isSuccess,
      txnRef: payload.vnp_TxnRef,
      providerTxnNo: payload.vnp_TransactionNo ? String(payload.vnp_TransactionNo) : undefined,
      amount,
      bankCode: payload.vnp_BankCode,
      failureCode: payload.vnp_ResponseCode !== '00' ? payload.vnp_ResponseCode : undefined,
      raw: payload,
    };
  }

  /**
   * Query VNPay transaction status
   */
  async queryTransaction({ txnRef }) {
    logger.info({ txnRef }, '[VNPay Adapter] Querying transaction status');
    return {
      isSuccess: false,
      txnRef,
      raw: { message: 'VNPay sandbox query placeholder' },
    };
  }
}

export const vnpayAdapter = new VNPayPaymentProvider();
