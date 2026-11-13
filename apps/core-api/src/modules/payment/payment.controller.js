import { prisma } from '@cinehub/db';
import { vnpayAdapter } from '../../integrations/payments/vnpay.adapter.js';
import { zalopayAdapter } from '../../integrations/payments/zalopay.adapter.js';
import { momoAdapter } from '../../integrations/payments/momo.adapter.js';
import { settlePayment } from '../../integrations/payments/settle-payment.js';
import { simulatePaymentSuccess } from '../../integrations/payments/simulate.js';
import { createMoMoPaymentUrl } from './momo-vn.service.js';
import { createZaloPayPaymentUrl } from './zalopay.service.js';
import { createVNPayPaymentUrl } from './vnpay.service.js';
import { logger } from '../../platform/observability/logger.js';

export const paymentMomoController = async (req, res) => {
  try {
    const bookingId = req.params.MAGD || req.body.bookingId || `CH${Date.now()}`;
    const { amount, userId } = req.body;

    const momoRes = await createMoMoPaymentUrl({
      bookingId,
      amount,
      userId,
      orderInfo: `Thanh toan ve CineHub #${bookingId}`,
    });

    return res.status(200).json({
      success: true,
      payUrl: momoRes.payUrl,
      gatewayOrderId: momoRes.gatewayOrderId,
      data: momoRes,
    });
  } catch (err) {
    logger.error({ err: err.message }, '[MoMo Controller Catch]');
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khởi tạo thanh toán MoMo',
    });
  }
};

/**
 * Đường 1: Xử lý MoMo IPN thật sự
 */
export const momoIPNController = async (req, res) => {
  try {
    const payload = req.body;
    logger.info(
      { orderId: payload.orderId, resultCode: payload.resultCode },
      '[MoMo IPN Received]',
    );

    // 1. Kiểm tra tính toàn vẹn chữ ký HMAC
    const isSignatureValid = momoAdapter.verifyWebhookSignature(payload);
    const eventKey = `${payload.orderId}_${payload.transId || Date.now()}`;

    // 2. Ghi nhận sự kiện webhook vào database
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: 'MOMO',
          eventKey,
          txnRef: payload.orderId,
          payload: JSON.parse(JSON.stringify(payload)),
          signatureValid: isSignatureValid,
          processedAt: new Date(),
        },
      });
    } catch (dbErr) {
      // Bỏ qua lỗi duplicate nếu gateway gửi lại
      logger.warn({ dbErr: dbErr.message }, '[MoMo IPN] Webhook event duplicate or logging error');
    }

    if (!isSignatureValid) {
      logger.error({ payload }, '[MoMo IPN] Invalid HMAC signature');
      return res.status(400).json({ resultCode: 99, message: 'Invalid signature' });
    }

    // 3. Chuẩn hóa payload và thực hiện quyết toán Idempotent
    const parsed = momoAdapter.parseWebhookPayload(payload);

    await settlePayment({
      txnRef: parsed.txnRef,
      provider: 'MOMO',
      isSuccess: parsed.isSuccess,
      providerTxnNo: parsed.providerTxnNo,
      bankCode: parsed.bankCode,
      failureCode: parsed.failureCode,
      rawResponse: parsed.raw,
    });

    // 4. Trả về đúng format phản hồi cho MoMo
    return res.status(200).json({
      resultCode: 0,
      message: 'Acknowledge MoMo IPN success',
    });
  } catch (err) {
    logger.error({ err }, '[MoMo IPN Fatal Error]');
    return res.status(500).json({
      resultCode: 99,
      message: err.message || 'Server processing error',
    });
  }
};

/**
 * Đường 3: Giả lập thủ công tại môi trường dev/sandbox
 */
export const simulatePaymentController = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const result = await simulatePaymentSuccess(paymentId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Xử lý VNPAY IPN / Return
 */
export const vnpayIPNController = async (req, res) => {
  try {
    const payload = Object.keys(req.body || {}).length > 0 ? req.body : req.query;
    logger.info(
      { txnRef: payload.vnp_TxnRef, responseCode: payload.vnp_ResponseCode },
      '[VNPay IPN Received]',
    );

    const isSignatureValid = vnpayAdapter.verifyWebhookSignature(payload);
    const eventKey = `${payload.vnp_TxnRef}_${payload.vnp_TransactionNo || Date.now()}`;

    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: 'VNPAY',
          eventKey,
          txnRef: payload.vnp_TxnRef,
          payload: JSON.parse(JSON.stringify(payload)),
          signatureValid: isSignatureValid,
          processedAt: new Date(),
        },
      });
    } catch (e) {
      logger.warn({ err: e.message }, '[VNPay IPN] Event logging duplicate');
    }

    if (!isSignatureValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const parsed = vnpayAdapter.parseWebhookPayload(payload);
    await settlePayment({
      txnRef: parsed.txnRef,
      provider: 'VNPAY',
      isSuccess: parsed.isSuccess,
      providerTxnNo: parsed.providerTxnNo,
      bankCode: parsed.bankCode,
      failureCode: parsed.failureCode,
      rawResponse: parsed.raw,
    });

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    logger.error({ err: err.message }, '[VNPay IPN Fatal]');
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * Xử lý ZaloPay Callback
 */
export const zalopayCallbackController = async (req, res) => {
  try {
    const payload = req.body;
    logger.info('[ZaloPay Callback Received]');

    const isSignatureValid = zalopayAdapter.verifyWebhookSignature(payload);
    const parsed = zalopayAdapter.parseWebhookPayload(payload);
    const eventKey = `${parsed.txnRef}_${parsed.providerTxnNo || Date.now()}`;

    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: 'ZALOPAY',
          eventKey,
          txnRef: parsed.txnRef,
          payload: JSON.parse(JSON.stringify(payload)),
          signatureValid: isSignatureValid,
          processedAt: new Date(),
        },
      });
    } catch (e) {
      logger.warn({ err: e.message }, '[ZaloPay Callback] Event duplicate');
    }

    if (!isSignatureValid) {
      return res.status(200).json({ return_code: -1, return_message: 'mac not equal' });
    }

    await settlePayment({
      txnRef: parsed.txnRef,
      provider: 'ZALOPAY',
      isSuccess: parsed.isSuccess,
      providerTxnNo: parsed.providerTxnNo,
      rawResponse: parsed.raw,
    });

    return res.status(200).json({ return_code: 1, return_message: 'success' });
  } catch (err) {
    logger.error({ err: err.message }, '[ZaloPay Callback Error]');
    return res.status(200).json({ return_code: 0, return_message: err.message });
  }
};

export const paymentZaloPayController = async (req, res) => {
  try {
    const bookingId = req.body.bookingId || `CH${Date.now()}`;
    const { amount } = req.body;
    const result = await createZaloPayPaymentUrl({ bookingId, amount });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error({ err: err.message }, '[ZaloPay Controller Error]');
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const paymentVNPayController = async (req, res) => {
  try {
    const bookingId = req.body.bookingId || `CH${Date.now()}`;
    const { amount } = req.body;
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = createVNPayPaymentUrl({ bookingId, amount, ipAddr });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error({ err: err.message }, '[VNPay Controller Error]');
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const vietqrController = async (_req, res) => {
  return res.json({ success: true, message: 'VietQR placeholder' });
};
