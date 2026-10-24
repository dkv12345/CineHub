import { escapeHtml, renderEmailLayout } from './layout.js';

/**
 * Generates HTML and plaintext content for the email-verification OTP email.
 *
 * @param {object} params
 * @param {string} params.fullName - Recipient display name.
 * @param {string} params.otp - 6-digit one-time code.
 * @param {number} params.expiresInMinutes - OTP lifetime shown to the user.
 * @returns {{ html: string, text: string }}
 */
export function getVerifyEmail({ fullName, otp, expiresInMinutes }) {
  const text = `Xin chào ${fullName},\n\nCảm ơn bạn đã đăng ký tài khoản CineHub.\nMã xác thực email của bạn là: ${otp}\nMã có hiệu lực trong ${expiresInMinutes} phút. Tuyệt đối không chia sẻ mã này với bất kỳ ai.\n\nNếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.\n\nTrân trọng,\nĐội ngũ CineHub`;

  const bodyHtml = `
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                Xác thực địa chỉ email
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Xin chào <strong style="color: #ffffff;">${escapeHtml(fullName)}</strong>, cảm ơn bạn đã đăng ký CineHub. Nhập mã bên dưới để hoàn tất việc kích hoạt tài khoản.
              </p>
              <div style="background-color: #1a2234; border: 1px solid #2d3748; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Mã xác thực của bạn</p>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #e50914;">
                  ${escapeHtml(otp)}
                </div>
              </div>
              <div style="background-color: #171e2e; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                  Mã có hiệu lực trong <strong>${expiresInMinutes} phút</strong>. CineHub sẽ không bao giờ yêu cầu bạn cung cấp mã này qua điện thoại hay tin nhắn.
                </p>
              </div>
              <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email.
              </p>`;

  return {
    html: renderEmailLayout({
      title: 'Xác thực email CineHub',
      tagline: 'Kích hoạt tài khoản',
      bodyHtml,
    }),
    text,
  };
}
