/**
 * Generate Booking Confirmation Email template.
 *
 * @param {Object} params
 * @param {string} params.bookingCode
 * @param {string} params.movieTitle
 * @param {string} params.cinemaName
 * @param {string} params.auditoriumName
 * @param {string} params.showtime
 * @param {string[]} params.seats
 * @param {number} params.totalAmount
 * @param {Array<{ ticketId: string, seatLabel: string, qrCode: string }>} params.tickets
 * @returns {{ html: string, text: string }}
 */
export function getBookingConfirmationEmail({
  bookingCode,
  movieTitle,
  cinemaName,
  auditoriumName,
  showtime,
  seats,
  totalAmount,
  tickets = [],
}) {
  const formattedAmount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(totalAmount);

  const seatListStr = seats.join(', ');

  const ticketsHtml = tickets
    .map(
      (t) => `
    <div style="margin-top: 12px; padding: 12px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; color: #f8fafc;">
      <p style="margin: 0; font-size: 14px; font-weight: bold; color: #fbbf24;">Ghế: ${t.seatLabel}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Mã QR soát vé: <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #38bdf8;">${t.qrCode}</code></p>
    </div>
  `,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Xác nhận đặt vé CineHub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: 900;">CINEHUB</h1>
      <p style="margin: 6px 0 0 0; color: #1e293b; font-size: 14px; font-weight: bold;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 16px;">Xin chào quý khách,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
        Cảm ơn bạn đã lựa chọn CineHub. Đơn hàng <strong>#${bookingCode}</strong> của bạn đã được thanh toán thành công.
      </p>

      <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
        <h3 style="margin: 0 0 12px 0; color: #fbbf24; font-size: 18px;">${movieTitle}</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #e2e8f0;">📍 Rạp: <strong>${cinemaName}</strong> (${auditoriumName})</p>
        <p style="margin: 4px 0; font-size: 14px; color: #e2e8f0;">⏰ Suất chiếu: <strong>${showtime}</strong></p>
        <p style="margin: 4px 0; font-size: 14px; color: #e2e8f0;">🎟️ Danh sách ghế: <strong>${seatListStr}</strong></p>
        <p style="margin: 4px 0; font-size: 14px; color: #e2e8f0;">💵 Tổng thanh toán: <strong style="color: #34d399;">${formattedAmount}</strong></p>
      </div>

      <h4 style="margin: 20px 0 8px 0; color: #e2e8f0; font-size: 15px;">Vé điện tử & Mã QR Check-in:</h4>
      ${ticketsHtml}

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        Vui lòng xuất trình mã QR tại quầy soát vé hoặc cổng vào phòng chiếu để vào rạp.
      </p>
    </div>
    <div style="background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155;">
      CineHub Platform · Hỗ trợ khách hàng: support@cinehub.vn
    </div>
  </div>
</body>
</html>
`;

  const text = `
XÁC NHẬN ĐẶT VÉ CINEHUB
Mã đơn: #${bookingCode}
Phim: ${movieTitle}
Rạp: ${cinemaName} (${auditoriumName})
Suất chiếu: ${showtime}
Ghế: ${seatListStr}
Tổng tiền: ${formattedAmount}

Vui lòng kiểm tra mã QR vé trên ứng dụng CineHub khi đến rạp.
`;

  return { html, text };
}
