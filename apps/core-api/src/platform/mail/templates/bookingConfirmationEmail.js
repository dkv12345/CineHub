function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function splitSeatRowAndLabel(seatLabel) {
  const clean = String(seatLabel || '').trim();
  const match = clean.match(/^([A-Za-z]+)(.+)$/);
  if (match) {
    return { row: match[1].toUpperCase(), seat: clean.toUpperCase() };
  }
  return { row: clean.slice(0, 1).toUpperCase() || '-', seat: clean || '-' };
}

/**
 * Generate Booking Confirmation Email template with payment summary and CineHub E-Ticket cards.
 *
 * @param {Object} params
 * @param {string} params.bookingCode
 * @param {string} [params.customerName]
 * @param {string} params.movieTitle
 * @param {string} params.cinemaName
 * @param {string} params.auditoriumName
 * @param {string} [params.format]
 * @param {string} params.showtime
 * @param {string[]} params.seats
 * @param {Array<{ name: string, quantity: number, unitPrice: number }>} [params.concessions]
 * @param {number} params.totalAmount
 * @param {string} [params.paymentMethod]
 * @param {string} [params.txnRef]
 * @param {string|null} [params.providerTxnNo]
 * @param {string} [params.paidAt]
 * @param {Array<{ ticketId: string, seatLabel: string, qrCode: string, qrCid?: string }>} [params.tickets]
 * @returns {{ html: string, text: string }}
 */
export function getBookingConfirmationEmail({
  bookingCode,
  customerName = '',
  movieTitle,
  cinemaName,
  auditoriumName,
  format = '2D Phụ Đề',
  showtime,
  seats = [],
  concessions = [],
  totalAmount,
  paymentMethod = 'ONLINE',
  txnRef = '',
  providerTxnNo = null,
  paidAt = '',
  tickets = [],
}) {
  const formatVnd = (amount) => `${new Intl.NumberFormat('vi-VN').format(Number(amount || 0))} đ`;

  const formattedAmount = formatVnd(totalAmount);
  const seatListStr = seats.join(', ');
  const safeBookingCode = escapeHtml(bookingCode);
  const safeCustomerName = escapeHtml(customerName || 'quý khách');
  const safeMovieTitle = escapeHtml(movieTitle);
  const safeCinemaName = escapeHtml(cinemaName);
  const safeAuditoriumName = escapeHtml(auditoriumName);
  const safeFormat = escapeHtml(format);
  const safeShowtime = escapeHtml(showtime);
  const safePaymentMethod = escapeHtml(String(paymentMethod || 'ONLINE').toUpperCase());
  const safeTxnRef = escapeHtml(txnRef);
  const safeProviderTxnNo = escapeHtml(providerTxnNo || '');
  const safePaidAt = escapeHtml(paidAt);

  const concessionsHtml =
    concessions.length > 0
      ? `
      <tr>
        <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; vertical-align: top;">Bắp &amp; Nước</td>
        <td style="padding: 6px 0; color: #f8fafc; font-size: 13px; text-align: right; font-weight: 600;">
          ${concessions
            .map(
              (c) =>
                `${escapeHtml(c.name)} x${Number(c.quantity)} (${formatVnd(c.unitPrice * c.quantity)})`,
            )
            .join('<br>')}
        </td>
      </tr>`
      : '';

  const ticketCardsHtml = tickets
    .map((t) => {
      const { row, seat } = splitSeatRowAndLabel(t.seatLabel);
      const safeSeat = escapeHtml(seat);
      const safeRow = escapeHtml(row);
      const safeQrCode = escapeHtml(t.qrCode);
      const qrImgHtml = t.qrCid
        ? `<img src="cid:${escapeHtml(t.qrCid)}" alt="Mã QR vé ${safeSeat}" width="132" height="132" style="display: block; width: 132px; height: 132px; border-radius: 8px; background: #ffffff; padding: 6px;" />`
        : `<div style="padding: 10px; background: #ffffff; color: #0f172a; border-radius: 6px; font-family: monospace; font-size: 11px; word-break: break-all;">${safeQrCode}</div>`;

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-collapse: separate; border-spacing: 0; border-radius: 14px; overflow: hidden; border: 1px solid #334155; background: #0f172a;">
        <tr>
          <!-- Cuống vé bên trái (nền trắng như giao diện Vé điện tử) -->
          <td width="34%" valign="top" style="background: #ffffff; color: #0f172a; padding: 16px 14px; border-right: 2px dashed #cbd5e1;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Rạp chiếu</td>
                <td align="right" style="font-size: 10px; font-weight: 800; color: #e11d48; text-transform: uppercase;">${safeFormat}</td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
              <tr>
                <td width="45%">
                  <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Hàng</div>
                  <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${safeRow}</div>
                </td>
                <td width="55%">
                  <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Ghế</div>
                  <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${safeSeat}</div>
                </td>
              </tr>
            </table>
            <div style="margin-top: 12px;">
              <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Ngày &amp; Giờ</div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${safeShowtime}</div>
            </div>
            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-family: monospace; font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 1px;">${safeBookingCode}</div>
              <div style="font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 4px;">${safeCinemaName}</div>
            </div>
          </td>

          <!-- Thân vé bên phải (nền tối + Mã QR vào rạp) -->
          <td width="66%" valign="top" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; padding: 16px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display: inline-block; background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(52, 211, 153, 0.45); color: #34d399; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px;">
                    Đã thanh toán
                  </span>
                </td>
                <td align="right" style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${safePaymentMethod}
                </td>
              </tr>
            </table>

            <h3 style="margin: 12px 0 4px 0; font-size: 19px; font-weight: 800; color: #ffffff; line-height: 1.3;">${safeMovieTitle}</h3>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1;">${safeCinemaName} · ${safeAuditoriumName}</p>
            <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 700; color: #fbbf24;">
              Suất chiếu: ${safeShowtime} (${safeFormat}) · Ghế: ${safeSeat}
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #334155;">
              <tr>
                <td valign="bottom">
                  <div style="font-size: 11px; color: #94a3b8;">Tổng thanh toán:</div>
                  <div style="font-size: 18px; font-weight: 900; color: #fbbf24; margin-top: 2px;">${formattedAmount}</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 6px; font-family: monospace; word-break: break-all;">
                    QR: ${safeQrCode}
                  </div>
                </td>
                <td align="right" valign="middle" style="padding-left: 12px;">
                  ${qrImgHtml}
                  <div style="font-size: 10px; color: #cbd5e1; text-align: center; margin-top: 4px; font-weight: 600;">Mã QR vào rạp</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Xác nhận đặt vé CineHub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px 12px;">
  <div style="max-width: 660px; margin: 0 auto; background: #0b1220; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
    <div style="background: linear-gradient(135deg, #e50914, #b91c1c); padding: 22px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">CINEHUB</h1>
      <p style="margin: 6px 0 0 0; color: #fef2f2; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">XÁC NHẬN THANH TOÁN &amp; VÉ ĐIỆN TỬ</p>
    </div>

    <div style="padding: 24px;">
      <p style="margin: 0; font-size: 15px; color: #f8fafc;">Xin chào <strong>${safeCustomerName}</strong>,</p>
      <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px; line-height: 1.55;">
        Thanh toán của bạn đã được xác nhận thành công. Dưới đây là chi tiết giao dịch và vé điện tử kèm mã QR để quét khi vào rạp.
      </p>

      <!-- Thông tin thanh toán -->
      <div style="background: #111827; border-radius: 12px; padding: 16px 18px; margin-top: 18px; border: 1px solid #334155;">
        <div style="font-size: 12px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">
          Thông tin thanh toán
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 5px 0; color: #94a3b8; font-size: 13px;">Mã đơn đặt vé</td>
            <td style="padding: 5px 0; color: #f8fafc; font-size: 13px; text-align: right; font-weight: 700;">#${safeBookingCode}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #94a3b8; font-size: 13px;">Phương thức thanh toán</td>
            <td style="padding: 5px 0; color: #f8fafc; font-size: 13px; text-align: right; font-weight: 700;">${safePaymentMethod}</td>
          </tr>
          ${
            safeTxnRef
              ? `<tr>
            <td style="padding: 5px 0; color: #94a3b8; font-size: 13px;">Mã tham chiếu giao dịch</td>
            <td style="padding: 5px 0; color: #cbd5e1; font-size: 12px; text-align: right; font-family: monospace;">${safeTxnRef}</td>
          </tr>`
              : ''
          }
          ${
            safeProviderTxnNo
              ? `<tr>
            <td style="padding: 5px 0; color: #94a3b8; font-size: 13px;">Mã giao dịch cổng TT</td>
            <td style="padding: 5px 0; color: #cbd5e1; font-size: 12px; text-align: right; font-family: monospace;">${safeProviderTxnNo}</td>
          </tr>`
              : ''
          }
          ${
            safePaidAt
              ? `<tr>
            <td style="padding: 5px 0; color: #94a3b8; font-size: 13px;">Thời gian thanh toán</td>
            <td style="padding: 5px 0; color: #f8fafc; font-size: 13px; text-align: right;">${safePaidAt}</td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding: 5px 0; color: #94a3b8; font-size: 13px;">Ghế đã đặt</td>
            <td style="padding: 5px 0; color: #fbbf24; font-size: 13px; text-align: right; font-weight: 700;">${escapeHtml(seatListStr)}</td>
          </tr>
          ${concessionsHtml}
          <tr>
            <td style="padding: 10px 0 2px 0; border-top: 1px solid #334155; color: #f8fafc; font-size: 14px; font-weight: 700;">Tổng thanh toán</td>
            <td style="padding: 10px 0 2px 0; border-top: 1px solid #334155; color: #34d399; font-size: 16px; text-align: right; font-weight: 900;">${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <!-- Vé điện tử & Mã QR -->
      <div style="margin-top: 22px;">
        <div style="font-size: 12px; font-weight: 800; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.8px;">
          Vé điện tử của bạn (${tickets.length} vé)
        </div>
        ${ticketCardsHtml}
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 20px; line-height: 1.5;">
        Vui lòng xuất trình mã QR trên vé điện tử này tại quầy soát vé hoặc cổng vào phòng chiếu trước giờ chiếu 15 phút.
      </p>
    </div>

    <div style="background: #090d16; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b;">
      CineHub Platform · Vé điện tử &amp; Hỗ trợ khách hàng: support@cinehub.vn
    </div>
  </div>
</body>
</html>
`;

  const text = `
XÁC NHẬN THANH TOÁN & VÉ ĐIỆN TỬ CINEHUB
Mã đơn: #${bookingCode}
Phương thức: ${String(paymentMethod || 'ONLINE').toUpperCase()}
${txnRef ? `Mã giao dịch: ${txnRef}\n` : ''}${paidAt ? `Thời gian thanh toán: ${paidAt}\n` : ''}Phim: ${movieTitle}
Rạp: ${cinemaName} (${auditoriumName})
Suất chiếu: ${showtime} (${format})
Ghế: ${seatListStr}
Tổng thanh toán: ${formattedAmount}

Vé & Mã QR Check-in:
${tickets.map((t) => `- Ghế ${t.seatLabel}: ${t.qrCode}`).join('\n')}
`;

  return { html, text };
}
