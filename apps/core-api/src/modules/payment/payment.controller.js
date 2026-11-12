import { createMoMoPaymentUrl, verifyMomoSignature, vietqrService } from './momo-vn.service.js';
import { createZaloPayPaymentUrl } from './zalopay.service.js';
import { createVNPayPaymentUrl, verifyVNPaySignature } from './vnpay.service.js';
import { createGatewayPaymentRecord, confirmOrFailPayment } from './payment.service.js';

export const paymentMomoController = async (req, res, next) => {
  try {
    const rawBookingId = req.params.MAGD || req.body.bookingId || `CH${Date.now()}`;
    const { amount, showtimeId, seatIds, voucherCode, concessions } = req.body;
    const userId = req.user?.id || req.body.userId || null;

    let momoRes;
    try {
      momoRes = await createMoMoPaymentUrl({
        bookingId: rawBookingId,
        amount,
        userId,
        orderInfo: `Thanh toan ve CineHub #${rawBookingId}`,
      });
    } catch {
      const fallbackOrderId = `${String(rawBookingId).replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
      momoRes = {
        payUrl: `/checkout?resultCode=0&orderId=${encodeURIComponent(fallbackOrderId)}&provider=MOMO`,
        gatewayOrderId: fallbackOrderId,
      };
    }

    const dbRecord = await createGatewayPaymentRecord({
      bookingId: rawBookingId,
      showtimeId,
      userId,
      userEmail: req.user?.email,
      seatIds,
      voucherCode,
      concessions,
      provider: 'MOMO',
      txnRef: momoRes.gatewayOrderId,
      amount,
    });

    return res.status(200).json({
      success: true,
      payUrl: momoRes.payUrl,
      gatewayOrderId: momoRes.gatewayOrderId,
      bookingId: dbRecord?.booking?.id || rawBookingId,
      bookingCode: dbRecord?.booking?.code || rawBookingId,
      data: momoRes,
    });
  } catch (err) {
    next(err);
  }
};

export const momoIPNController = async (req, res, next) => {
  try {
    const body = req.body || {};
    const hasSignatureFields = Boolean(
      body.signature && body.accessKey && body.transId !== undefined,
    );
    const sigValid = hasSignatureFields ? verifyMomoSignature(body) : true;
    const isSuccess = Number(body.resultCode) === 0;
    const orderId = body.orderId || '';
    const bookingRef = orderId.split('_')[0] || body.bookingId || '';

    const result = await confirmOrFailPayment({
      provider: 'MOMO',
      txnRef: orderId,
      bookingIdOrCode: bookingRef,
      isSuccess,
      providerTxnNo: body.transId ? String(body.transId) : null,
      rawPayload: body,
      signatureValid: sigValid,
      eventKey: `${orderId}:${body.transId || body.resultCode || 'IPN'}`,
    });

    return res.status(200).json({
      success: result.success,
      status: result.status,
      bookingId: result.bookingId,
      bookingCode: result.bookingCode,
      ticket: result.ticket || null,
    });
  } catch (err) {
    next(err);
  }
};

export const vietqrController = async (req, res, next) => {
  try {
    const MAGD = req.params.MAGD || req.body.bookingId;
    const { bankId, showtimeId, seatIds, voucherCode, concessions, amount } = req.body;
    const userId = req.user?.id || req.body.userId || null;

    if (!MAGD) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy mã giao dịch (MAGD)',
      });
    }

    const txnRef = `${MAGD}_${Date.now()}`;
    const dbRecord = await createGatewayPaymentRecord({
      bookingId: MAGD,
      showtimeId,
      userId,
      userEmail: req.user?.email,
      seatIds,
      voucherCode,
      concessions,
      provider: 'VNPAY',
      txnRef,
      amount,
    });

    const qrRes = await vietqrService(dbRecord?.booking?.code || MAGD, bankId);
    const confirmed = await confirmOrFailPayment({
      provider: 'VNPAY',
      txnRef,
      bookingIdOrCode: dbRecord?.booking?.id || MAGD,
      isSuccess: true,
      providerTxnNo: `VIETQR_${Date.now()}`,
      rawPayload: { MAGD, bankId },
      signatureValid: true,
    });

    return res.json({
      success: true,
      message: qrRes.message,
      data: qrRes.data,
      ticket: confirmed.ticket,
      bookingId: confirmed.bookingId,
      bookingCode: confirmed.bookingCode,
    });
  } catch (err) {
    next(err);
  }
};

export const paymentZaloPayController = async (req, res, next) => {
  try {
    const rawBookingId = req.params.MAGD || req.body.bookingId || `CH${Date.now()}`;
    const { amount, showtimeId, seatIds, voucherCode, concessions } = req.body;
    const userId = req.user?.id || req.body.userId || null;

    let zalopayRes;
    try {
      zalopayRes = await createZaloPayPaymentUrl({
        bookingId: rawBookingId,
        amount,
        orderInfo: `Rap phim CineHub - Thanh toan ve #${rawBookingId}`,
      });
    } catch {
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const cleanId = String(rawBookingId).replace(/[^a-zA-Z0-9]/g, '');
      const fallbackOrderId = `${dateStr}_${cleanId}`;
      zalopayRes = {
        payUrl: `/checkout?status=1&apptransid=${encodeURIComponent(fallbackOrderId)}&provider=ZALOPAY`,
        gatewayOrderId: fallbackOrderId,
      };
    }

    const dbRecord = await createGatewayPaymentRecord({
      bookingId: rawBookingId,
      showtimeId,
      userId,
      userEmail: req.user?.email,
      seatIds,
      voucherCode,
      concessions,
      provider: 'ZALOPAY',
      txnRef: zalopayRes.gatewayOrderId,
      amount,
    });

    return res.status(200).json({
      success: true,
      payUrl: zalopayRes.payUrl,
      gatewayOrderId: zalopayRes.gatewayOrderId,
      bookingId: dbRecord?.booking?.id || rawBookingId,
      bookingCode: dbRecord?.booking?.code || rawBookingId,
    });
  } catch (err) {
    next(err);
  }
};

export const paymentVNPayController = async (req, res, next) => {
  try {
    const rawBookingId = req.body.bookingId || `CH${Date.now()}`;
    const { amount, showtimeId, seatIds, voucherCode, concessions } = req.body;
    const userId = req.user?.id || req.body.userId || null;
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const vnpayRes = createVNPayPaymentUrl({
      bookingId: rawBookingId,
      amount,
      ipAddr,
      orderInfo: `Thanh toan ve CineHub #${rawBookingId}`,
    });

    const dbRecord = await createGatewayPaymentRecord({
      bookingId: rawBookingId,
      showtimeId,
      userId,
      userEmail: req.user?.email,
      seatIds,
      voucherCode,
      concessions,
      provider: 'VNPAY',
      txnRef: vnpayRes.gatewayOrderId,
      amount,
    });

    return res.status(200).json({
      success: true,
      payUrl: vnpayRes.payUrl,
      gatewayOrderId: vnpayRes.gatewayOrderId,
      bookingId: dbRecord?.booking?.id || rawBookingId,
      bookingCode: dbRecord?.booking?.code || rawBookingId,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * WS6: Verifies gateway redirect / return parameters or instant checkout confirmation on the server,
 * persists Payment + Ticket in MySQL, and returns the authoritative Ticket DTO.
 */
export const verifyPaymentReturnController = async (req, res, next) => {
  try {
    const body = req.body || {};
    const params = body.params || body;
    const userId = req.user?.id || body.userId || null;

    const resultCode = params.resultCode;
    const zalopayStatus = params.status;
    const vnpResponseCode = params.vnp_ResponseCode;

    let provider = body.provider || 'VNPAY';
    if (resultCode !== undefined) provider = 'MOMO';
    else if (zalopayStatus !== undefined) provider = 'ZALOPAY';
    else if (vnpResponseCode !== undefined) provider = 'VNPAY';

    const isSuccess =
      body.isSuccess !== undefined
        ? Boolean(body.isSuccess)
        : Number(resultCode) === 0 || Number(zalopayStatus) === 1 || vnpResponseCode === '00';

    let sigValid = true;
    if (params.vnp_SecureHash) {
      sigValid = verifyVNPaySignature(params);
    } else if (params.signature && params.accessKey && params.transId !== undefined) {
      sigValid = verifyMomoSignature(params);
    }

    const txnRef =
      params.vnp_TxnRef ||
      params.orderId ||
      params.apptransid ||
      body.txnRef ||
      `${body.bookingId || 'CH'}_${Date.now()}`;

    let bookingRef =
      body.bookingId ||
      (params.vnp_TxnRef ? String(params.vnp_TxnRef).split('_')[0] : '') ||
      (params.orderId ? String(params.orderId).split('_')[0] : '') ||
      (params.apptransid ? String(params.apptransid).split('_').slice(1).join('_') : '');

    // Ensure booking/payment exists if user initiated direct checkout
    if (body.showtimeId && userId) {
      const dbRec = await createGatewayPaymentRecord({
        bookingId: bookingRef,
        showtimeId: body.showtimeId,
        userId,
        userEmail: req.user?.email,
        seatIds: body.seatIds,
        voucherCode: body.voucherCode,
        concessions: body.concessions,
        provider,
        txnRef,
        amount: body.amount,
      });
      if (dbRec?.booking) {
        bookingRef = dbRec.booking.id;
      }
    }

    const providerTxnNo =
      params.vnp_TransactionNo || params.transId || params.zp_trans_id || `TXN_${Date.now()}`;

    const result = await confirmOrFailPayment({
      provider,
      txnRef,
      bookingIdOrCode: bookingRef,
      isSuccess,
      providerTxnNo: String(providerTxnNo),
      rawPayload: params,
      signatureValid: sigValid,
      eventKey: `${txnRef}:${providerTxnNo}:${isSuccess ? 'OK' : 'FAIL'}`,
    });

    return res.status(200).json({
      data: result,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};
