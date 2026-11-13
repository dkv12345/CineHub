import { escapeHtml, renderEmailLayout } from './layout.js';

/**
 * Generates HTML and plaintext content for upcoming movie / early screening notification email.
 *
 * @param {object} params
 * @param {string} params.customerName - Customer display name (e.g., "Ngân").
 * @param {object} params.movie - Movie metadata object.
 * @param {string} params.movie.title
 * @param {string} [params.movie.poster]
 * @param {string} [params.movie.genre]
 * @param {string} [params.movie.duration]
 * @param {string} [params.movie.release]
 * @param {string} [params.movie.director]
 * @param {string} [params.movie.cast]
 * @param {string} [params.movie.age]
 * @param {string} [params.movie.synopsis]
 * @param {string} [params.clientUrl]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function getMovieNotificationEmail({
  customerName = 'Ngân',
  movie,
  clientUrl = 'http://localhost:4200',
}) {
  const safeName = escapeHtml(customerName);
  const safeTitle = escapeHtml(movie?.title || 'Phim sắp chiếu');
  const safeGenre = escapeHtml(movie?.genre || 'Đang cập nhật');
  const safeDuration = escapeHtml(movie?.duration || '1h 45m');
  const safeRelease = escapeHtml(movie?.release || 'Sắp khởi chiếu');
  const safeDirector = escapeHtml(movie?.director || 'Đang cập nhật');
  const safeCast = escapeHtml(movie?.cast || 'Đang cập nhật');
  const safeAge = escapeHtml(movie?.age || 'P');
  const safePoster = escapeHtml(movie?.poster || '');
  const safeSynopsis = escapeHtml(movie?.synopsis || '');
  const bookingUrl = `${escapeHtml(clientUrl)}/movie/${escapeHtml(movie?.id || '')}`;

  const subject = `🎬 [CineHub] ${movie?.title || 'Phim bạn theo dõi'} sắp khởi chiếu & mở bán suất chiếu sớm!`;

  const text = `${customerName} thân mến,\n\nBộ phim "${movie?.title}" mà bạn đã nhấn chuông đăng ký nhận thông báo trên CineHub sắp đến ngày khởi chiếu chính thức (${safeRelease}) và đã mở bán các suất chiếu sớm (Sneak Show)!\n\nThông tin phim:\n- Tên phim: ${movie?.title}\n- Thể loại: ${movie?.genre}\n- Thời lượng: ${movie?.duration}\n- Khởi chiếu: ${movie?.release}\n- Đạo diễn: ${movie?.director}\n\nĐặt vé giữ ghế đẹp ngay tại: ${bookingUrl}\n\nTrân trọng,\nĐội ngũ CineHub`;

  const bodyHtml = `
    <div style="margin-bottom: 18px;">
      <span style="display: inline-block; background-color: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.5); color: #fbbf24; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 5px 12px; border-radius: 999px;">
        🔔 Thông Báo Suất Chiếu Sớm &amp; Lịch Khởi Chiếu
      </span>
    </div>

    <h2 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
      ${safeName} thân mến,
    </h2>

    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.65; color: #cbd5e1;">
      Tin vui dành riêng cho bạn! Bộ phim <strong style="color: #fbbf24;">${safeTitle}</strong> mà bạn đã nhấn chuông theo dõi trên <strong style="color: #ffffff;">CineHub</strong> sắp chính thức ra rạp vào ngày <strong style="color: #ffffff;">${safeRelease}</strong> và hiện đã mở lịch <strong style="color: #f87171;">Suất Chiếu Sớm (Sneak Show)</strong>.
    </p>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-left: 4px solid #e50914; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td width="130" valign="top" style="padding-right: 18px;">
                <img src="${safePoster}" alt="${safeTitle}" width="130" style="display: block; width: 130px; height: 195px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);" />
              </td>
              <td valign="top">
                <div style="margin-bottom: 6px;">
                  <span style="display: inline-block; background-color: #e50914; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">${safeAge}</span>
                  <span style="color: #fbbf24; font-size: 12px; font-weight: 700;">Khởi chiếu: ${safeRelease}</span>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #ffffff;">${safeTitle}</h3>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #fbbf24; font-weight: 600;">${safeGenre} · ${safeDuration}</p>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8;"><strong style="color: #e2e8f0;">Đạo diễn:</strong> ${safeDirector}</p>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #94a3b8;"><strong style="color: #e2e8f0;">Diễn viên:</strong> ${safeCast}</p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #cbd5e1;">${safeSynopsis}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: linear-gradient(90deg, #dc2626, #e50914, #f59e0b); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 6px 20px rgba(229, 9, 20, 0.45);">
        Đặt Vé Suất Chiếu Sớm Ngay
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
      Bạn nhận được thông báo này vì đã nhấn biểu tượng chuông 🔔 theo dõi phim <strong>${safeTitle}</strong> trên CineHub.
    </p>
  `;

  const html = renderEmailLayout({
    title: subject,
    tagline: 'Thông báo lịch chiếu & suất chiếu sớm',
    bodyHtml,
  });

  return { html, text, subject };
}
