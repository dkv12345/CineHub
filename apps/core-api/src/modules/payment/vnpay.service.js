import crypto from 'crypto';
import querystring from 'qs';

export function createVNPayPaymentUrl({ bookingId, amount, ipAddr, orderInfo }) {
  const tmnCode = process.env.VNP_TMN_CODE || 'DEMOV210';
  const secretKey = process.env.VNP_HASH_SECRET || 'RAXEFVWWCAJIJILJXYEUJYLJJLNRLJYL';
  const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:4200/checkout';

  // Lấy chính xác thời gian theo múi giờ Việt Nam (GMT+7) chuẩn YYYYMMDDHHmmss
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

  const orderId = `${bookingId}_${now.getTime()}`;
  const numericAmount = Math.round(Number(amount || 100000)) * 100; // VNPay yêu cầu nhân 100

  // 1. Khởi tạo danh sách tham số thô (Raw values)
  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo || `Thanh toan ve xem phim CineHub #${bookingId}`,
    vnp_OrderType: 'billpayment',
    vnp_Amount: numericAmount.toString(),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate,
  };

  // 2. Sắp xếp các key theo bảng chữ cái A-Z nhưng GIỮ NGUYÊN GIÁ TRỊ THÔ (không encode)
  const sortedParams = sortObjectRaw(vnp_Params);

  // 3. Tạo chuỗi signData chính xác tuyệt đối theo chuẩn VNPay
  const signData = querystring.stringify(sortedParams, { encode: false });

  // 4. Tạo SecureHash HMAC-SHA512
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // 5. Build URL thanh toán cuối cùng (có encode giá trị khi đưa lên query string)
  sortedParams['vnp_SecureHash'] = signed;
  const paymentUrl = `${vnpUrl}?${querystring.stringify(sortedParams, { encode: true, indices: false, arrayFormat: 'brackets' })}`;

  return {
    payUrl: paymentUrl,
    gatewayOrderId: orderId,
    amount: Number(amount),
  };
}

// Hàm sắp xếp object theo key A-Z giữ nguyên giá trị thô để băm chữ ký
function sortObject(obj) {
  const sorted = {};
  const str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(key);
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}
