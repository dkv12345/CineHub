import { escapeHtml } from './layout.js';

/**
 * Generates HTML and plaintext content for password reset email.
 *
 * @param {object} params
 * @param {string} params.fullName - Recipient display name.
 * @param {string} params.resetToken - Raw verification token string.
 * @param {string} params.resetUrl - Full link to password reset page on client.
 * @returns {{ html: string, text: string }}
 */
export function getResetPasswordEmail({ fullName, resetToken, resetUrl }) {
  const safeName = escapeHtml(fullName);
  const text = `Xin chào ${fullName},\n\nChúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản CineHub của bạn.\nMã xác nhận khôi phục của bạn là: ${resetToken}\nHoặc truy cập liên kết sau (hạn sử dụng 15 phút):\n${resetUrl}\n\nNếu bạn không yêu cầu hành động này, vui lòng bỏ qua email và mật khẩu của bạn sẽ không bị thay đổi.\n\nTrân trọng,\nĐội ngũ CineHub`;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu tài khoản CineHub</title>
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
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px;">Bảo mật tài khoản</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                Yêu cầu đặt lại mật khẩu
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Xin chào <strong style="color: #ffffff;">${safeName}</strong>, chúng tôi nhận được yêu cầu khôi phục mật khẩu đăng nhập cho tài khoản của bạn tại CineHub.
              </p>
              
              <div style="background-color: #1a2234; border: 1px solid #2d3748; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Mã xác thực của bạn (hết hạn sau 15 phút):</p>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 700; letter-spacing: 3px; color: #e50914; word-break: break-all;">
                  ${resetToken}
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background-color: #e50914; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(229, 9, 20, 0.4);">
                  Đặt Lại Mật Khẩu Ngay
                </a>
              </div>

              <div style="background-color: #171e2e; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                  Lưu ý: Vì lý do an toàn, liên kết và mã này chỉ có hiệu lực trong vòng <strong>15 phút</strong>. Sau khi đặt lại mật khẩu, tất cả các phiên đăng nhập khác của bạn sẽ tự động bị thu hồi.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Mật khẩu của bạn vẫn an toàn tuyệt đối.
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
