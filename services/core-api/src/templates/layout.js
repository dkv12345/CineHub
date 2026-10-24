/**
 * Shared helpers for transactional email templates.
 */

/**
 * Escapes user-controlled text before it is interpolated into HTML emails.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Wraps body markup in the branded CineHub email shell (header + footer).
 *
 * @param {object} params
 * @param {string} params.title - Document <title>.
 * @param {string} params.tagline - Small uppercase line under the logo.
 * @param {string} params.bodyHtml - Trusted HTML for the card body.
 * @returns {string}
 */
export function renderEmailLayout({ title, tagline, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 32px; text-align: center; border-bottom: 2px solid #e50914;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">
                CINE<span style="color: #e50914;">HUB</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px;">${escapeHtml(tagline)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              ${bodyHtml}
            </td>
          </tr>
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
}
