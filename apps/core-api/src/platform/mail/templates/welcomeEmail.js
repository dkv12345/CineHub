import { escapeHtml } from './layout.js';

/**
 * Generates HTML and plaintext content for welcome registration email.
 *
 * @param {object} params
 * @param {string} params.fullName - Recipient display name.
 * @param {string} [params.clientUrl] - Base URL of the web client used for the call-to-action link.
 * @returns {{ html: string, text: string }}
 */
export function getWelcomeEmail({ fullName, clientUrl = 'http://localhost:5173' }) {
  const safeName = escapeHtml(fullName);
  const text = `Xin chào ${fullName},\n\nChào mừng bạn gia nhập nền tảng đặt vé xem phim CineHub!\nTài khoản của bạn đã được khởi tạo thành công. Hãy khám phá các suất chiếu mới nhất ngay hôm nay.\n\nTrân trọng,\nĐội ngũ CineHub`;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chào mừng bạn đến với CineHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 32px; text-align: center; border-bottom: 2px solid #e50914;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">
                CINE<span style="color: #e50914;">HUB</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px;">Nền tảng đặt vé điện ảnh thế hệ mới</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                Xin chào ${safeName},
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Chào mừng bạn gia nhập cộng đồng điện ảnh <strong style="color: #ffffff;">CineHub</strong>. Tài khoản của bạn đã được đăng ký thành công và sẵn sàng để trải nghiệm!
              </p>
              <div style="background-color: #1a2234; border-left: 4px solid #e50914; padding: 16px 20px; border-radius: 4px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #d1d5db;">
                  Trải nghiệm góc nhìn chọn ghế <strong>3D Point-of-View</strong> chân thực, cập nhật suất chiếu trực tiếp toàn quốc và tận hưởng trợ lý ảo AI thông minh.
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${escapeHtml(clientUrl)}" style="display: inline-block; background-color: #e50914; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(229, 9, 20, 0.4);">
                  Khám Phá Phim Đang Chiếu
                </a>
              </div>
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0d131f; padding: 20px 32px; text-align: center; border-top: 1px solid #1f2937;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">
                &copy; 2026 CineHub Enterprise. Mọi quyền được bảo lưu.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { html, text };
}
