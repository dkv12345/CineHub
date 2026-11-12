import crypto from 'crypto';
import querystring from 'qs';

export function createVNPayPaymentUrl({ bookingId, amount, ipAddr, orderInfo }) {
  const tmnCode = process.env.VNP_TMN_CODE || 'DEMOV210';
  const secretKey = process.env.VNP_HASH_SECRET || 'RAXEFVWWCAJIJILJXYEUJYLJJLNRLJYL';
  const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:4200/checkout';

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

  const cleanBookingId = String(bookingId || `CH${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, '');
  const orderId = `${cleanBookingId}_${now.getTime()}`;
  const numericAmount = Math.max(10000, Math.round(Number(amount || 100000))) * 100;

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo || `Thanh toan ve xem phim CineHub #${cleanBookingId}`,
    vnp_OrderType: 'billpayment',
    vnp_Amount: numericAmount.toString(),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  sortedParams['vnp_SecureHash'] = signed;
  const paymentUrl = `${vnpUrl}?${querystring.stringify(sortedParams, { encode: false })}`;

  return {
    payUrl: paymentUrl,
    gatewayOrderId: orderId,
    amount: Number(amount),
  };
}

export function verifyVNPaySignature(vnpParams = {}) {
  const secretKey = process.env.VNP_HASH_SECRET || 'RAXEFVWWCAJIJILJXYEUJYLJJLNRLJYL';
  const secureHash = vnpParams.vnp_SecureHash;
  if (!secureHash) return false;

  const copy = { ...vnpParams };
  delete copy.vnp_SecureHash;
  delete copy.vnp_SecureHashType;

  const sortedParams = sortObject(copy);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const signed = crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
  return signed.toLowerCase() === String(secureHash).toLowerCase();
}

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      sorted[k] = encodeURIComponent(String(obj[k])).replace(/%20/g, '+');
    }
  }
  return sorted;
}
