import { escapeHtml, renderEmailLayout } from './layout.js';

/**
 * Generates HTML and plaintext content for the "password changed" confirmation email.
 *
 * @param {object} params
 * @param {string} params.fullName - Recipient display name.
 * @param {string} params.loginUrl - Link to the login page on the client.
 * @returns {{ html: string, text: string }}
 */
export function getResetSuccessEmail({ fullName, loginUrl }) {
  const text = `Xin chào ${fullName},\n\nMật khẩu tài khoản CineHub của bạn vừa được đặt lại thành công. Tất cả phiên đăng nhập cũ đã bị thu hồi.\nĐăng nhập lại tại: ${loginUrl}\n\nNếu bạn không thực hiện thay đổi này, hãy khôi phục mật khẩu ngay lập tức để bảo vệ tài khoản.\n\nTrân trọng,\nĐội ngũ CineHub`;

  const bodyHtml = `
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                Mật khẩu đã được đặt lại
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Xin chào <strong style="color: #ffffff;">${escapeHtml(fullName)}</strong>, mật khẩu tài khoản CineHub của bạn vừa được thay đổi thành công. Mọi phiên đăng nhập trước đó đã bị thu hồi.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${escapeHtml(loginUrl)}" style="display: inline-block; background-color: #e50914; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(229, 9, 20, 0.4);">
                  Đăng Nhập Ngay
                </a>
              </div>
              <div style="background-color: #171e2e; padding: 14px 18px; border-radius: 6px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                  Không phải bạn? Hãy dùng chức năng <strong>Quên mật khẩu</strong> để khôi phục tài khoản ngay lập tức.
                </p>
              </div>`;

  return {
    html: renderEmailLayout({
      title: 'Đặt lại mật khẩu thành công',
      tagline: 'Bảo mật tài khoản',
      bodyHtml,
    }),
    text,
  };
}
