import crypto from 'crypto';
import https from 'https';

export async function createMoMoPaymentUrl({ bookingId, amount }) {
  // 1. Chìa khóa Sandbox chuẩn MoMo V2
  const partnerCode = 'MOMO';
  const accessKey = 'F8BBA842ECF85';
  const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

  // Chuẩn hóa redirectUrl không chứa trailing slash dư thừa
  const redirectUrl = 'http://localhost:4200/checkout';
  const ipnUrl = 'http://localhost:4000/api/v1/payments/momo-ipn';

  // 2. Định dạng dữ liệu
  const cleanBookingId = String(bookingId || `CH${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '');
  const numericAmount = Math.round(Number(amount || 100000));
  const amountStr = numericAmount.toString();

  const timestamp = Date.now();
  const requestId = `${partnerCode}${timestamp}`;
  const orderId = `${cleanBookingId}_${timestamp}`;
  const cleanOrderInfo = `PayCineHub${cleanBookingId}`;
  const requestType = 'captureWallet';
  const extraData = '';

  // 3. Chuỗi Raw Signature ghép đúng thứ tự A-Z của MoMo V2
  const rawSignature =
    'accessKey=' +
    accessKey +
    '&amount=' +
    amountStr +
    '&extraData=' +
    extraData +
    '&ipnUrl=' +
    ipnUrl +
    '&orderId=' +
    orderId +
    '&orderInfo=' +
    cleanOrderInfo +
    '&partnerCode=' +
    partnerCode +
    '&redirectUrl=' +
    redirectUrl +
    '&requestId=' +
    requestId +
    '&requestType=' +
    requestType;

  // 4. Ký HMAC-SHA256 với secretKey
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  // 5. Tạo JSON Request Payload
  const requestBody = JSON.stringify({
    partnerCode,
    accessKey,
    requestId,
    amount: amountStr,
    orderId,
    orderInfo: cleanOrderInfo,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  });

  // 6. Gửi request trực tiếp qua https.request
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody, 'utf8'),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data.payUrl) {
            resolve({
              payUrl: data.payUrl,
              gatewayOrderId: orderId,
              requestId,
            });
          } else {
            console.error('[MoMo Response Error Detail]:', data);
            reject(new Error(data.message || 'Khởi tạo MoMo thất bại'));
          }
        } catch (err) {
          reject(new Error('Lỗi parse JSON MoMo: ' + err.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Lỗi kết nối MoMo: ' + e.message)));
    req.write(requestBody);
    req.end();
  });
}

export const momoIPNService = async (data) => {
  const { orderId, resultCode, message, orderInfo } = data;
  const MAGD = orderId ? orderId.split('_')[0] : '';

  if (resultCode === 0) {
    console.log(`[MoMo IPN] Giao dịch ${MAGD} thanh toán thành công!`);
  }

  return {
    success: resultCode === 0,
    message: `${orderInfo || ''} ${message || ''}`.trim(),
  };
};

export const vietqrService = async (MAGD, bankId) => {
  return {
    success: true,
    message: 'Tạo mã QR ngân hàng thành công',
    data: { MAGD, bankId },
  };
};

export function verifyMomoSignature(data) {
  const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

  const rawSignature =
    `accessKey=${data.accessKey}` +
    `&amount=${data.amount}` +
    `&extraData=${data.extraData}` +
    `&message=${data.message}` +
    `&orderId=${data.orderId}` +
    `&orderInfo=${data.orderInfo}` +
    `&orderType=${data.orderType}` +
    `&partnerCode=${data.partnerCode}` +
    `&payType=${data.payType}` +
    `&requestId=${data.requestId}` +
    `&responseTime=${data.responseTime}` +
    `&resultCode=${data.resultCode}` +
    `&transId=${data.transId}`;

  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  return signature === data.signature;
}
