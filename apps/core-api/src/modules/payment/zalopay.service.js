import crypto from 'crypto';
import https from 'https';

export async function createZaloPayPaymentUrl({ bookingId, amount }) {
  // 1. Credentials Sandbox chuẩn ZaloPay V2
  const appId = process.env.ZALOPAY_APP_ID || '2554';
  const key1 = process.env.ZALOPAY_KEY1 || 'sdngD8w4FiMuCoyF';
  const redirectUrl = process.env.ZALOPAY_REDIRECT_URL || 'http://localhost:4200/checkout';

  const numericAmount = Math.round(Number(amount || 100000));

  // 2. Định dạng app_trans_id: YYMMDD_xxxxxx
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const cleanBookingId = String(bookingId || Date.now()).replace(/[^a-zA-Z0-9]/g, '');
  const appTransId = `${dateStr}_${cleanBookingId}`;

  const appTime = Date.now();
  const appUser = 'CineHubUser';
  const embedData = JSON.stringify({ redirecturl: redirectUrl });
  const items = JSON.stringify([]);
  const description = `Rap phim CineHub - Thanh toan ve #${cleanBookingId}`;

  // 3. Chuỗi băm MAC ZaloPay V2: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
  const rawData = `${appId}|${appTransId}|${appUser}|${numericAmount}|${appTime}|${embedData}|${items}`;
  const mac = crypto.createHmac('sha256', key1).update(rawData).digest('hex');

  // 4. Tạo URLSearchParams đúng chuẩn application/x-www-form-urlencoded
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

  // 5. Gửi request trực tiếp qua https.request native của Node.js (tránh nghẽn Axios)
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sb-openapi.zalopay.vn',
      port: 443,
      path: '/v2/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 20000, // Timeout 10s
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.return_code === 1 && data.order_url) {
            resolve({
              payUrl: data.order_url,
              gatewayOrderId: appTransId,
              amount: numericAmount,
            });
          } else {
            console.error('[ZaloPay Gateway Error]:', data);
            reject(
              new Error(
                data.return_message || data.sub_return_message || 'Khởi tạo ZaloPay thất bại',
              ),
            );
          }
        } catch (err) {
          reject(new Error('Lỗi parse JSON ZaloPay: ' + err.message));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(
        new Error('Kết nối ZaloPay bị Timeout (10s). Vui lòng thử lại hoặc đổi DNS sang 8.8.8.8'),
      );
    });

    req.on('error', (e) => reject(new Error('Lỗi kết nối ZaloPay: ' + e.message)));
    req.write(postData);
    req.end();
  });
}
