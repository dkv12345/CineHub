import { createMoMoPaymentUrl, momoIPNService, vietqrService } from './momo-vn.service.js';
import { createZaloPayPaymentUrl } from './zalopay.service.js';
import { createVNPayPaymentUrl } from './vnpay.service.js';

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
    console.error('[MoMo Controller Catch]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khởi tạo thanh toán MoMo',
    });
  }
};

export const momoIPNController = async (req, res) => {
  console.log('Dữ liệu IPN MoMo gửi đến:', req.body);

  const result = await momoIPNService(req.body);
  const { orderId } = req.body;

  if (global._io && orderId) {
    global._io.to(orderId).emit('payment_momo_result', {
      success: result.success,
      message: result.message,
      data: req.body,
    });
  }

  return res.json({
    success: result.success,
    message: result.message,
  });
};

export const vietqrController = async (req, res) => {
  const { MAGD } = req.params;
  const { bankId } = req.body;

  if (!MAGD) {
    return res.json({
      success: false,
      message: 'Không tìm thấy giao dịch mà bạn gửi',
    });
  }

  const result = await vietqrService(MAGD, bankId);

  return res.json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
};

export const paymentZaloPayController = async (req, res) => {
  try {
    const bookingId = req.params.MAGD || req.body.bookingId || `CH${Date.now()}`;
    const { amount } = req.body;

    const zalopayRes = await createZaloPayPaymentUrl({
      bookingId,
      amount,
      orderInfo: `Rap phim CineHub - Thanh toan ve #${bookingId}`,
    });

    return res.status(200).json({
      success: true,
      payUrl: zalopayRes.payUrl,
      gatewayOrderId: zalopayRes.gatewayOrderId,
    });
  } catch (err) {
    console.error('[ZaloPay Controller Catch]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khởi tạo thanh toán ZaloPay',
    });
  }
};

export const paymentVNPayController = async (req, res) => {
  try {
    const bookingId = req.body.bookingId || `CH${Date.now()}`;
    const { amount } = req.body;
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const vnpayRes = createVNPayPaymentUrl({
      bookingId,
      amount,
      ipAddr,
      orderInfo: `Thanh toan ve CineHub #${bookingId}`,
    });

    return res.status(200).json({
      success: true,
      payUrl: vnpayRes.payUrl,
      gatewayOrderId: vnpayRes.gatewayOrderId,
    });
  } catch (err) {
    console.error('[VNPay Controller Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khởi tạo thanh toán VNPay',
    });
  }
};
