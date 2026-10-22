import { normalizeVietnamese } from '../../lib/text.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const VN_UTC_OFFSET_HOURS = 7;

/** Văn bản không dấu, chữ thường, chỉ còn chữ-số và dấu cách đơn. */
export function plainText(text) {
  return normalizeVietnamese(String(text ?? ''))
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function detectChatIntent(message) {
  const text = normalizeVietnamese(message);
  if (/\b(hoan|huy|doi ve|tra ve)\b/.test(text)) return 'REFUND_POLICY';
  if (/\b(thanh toan|vnpay|zalopay)\b/.test(text)) return 'PAYMENT_HELP';
  if (/\b(gia ve|gia tien|bao nhieu)\b|\bgia\b(?! dinh)/.test(text)) return 'TICKET_PRICES';
  if (
    /\b(noi dung|dien vien|dao dien|chi tiet|thong tin phim|thoi luong|bao lau|do tuoi|phan loai|noi ve gi)\b/.test(
      text,
    )
  ) {
    return 'MOVIE_DETAILS';
  }
  if (
    /\b(goi y|de xuat|nen xem|xem gi|phim hay|phim hot|the loai nao|nhung the loai|cac the loai)\b/.test(
      text,
    )
  ) {
    return 'RECOMMEND';
  }
  if (
    /\b(suat chieu|lich chieu|gio chieu|may gio|luc nao|khi nao|rap nao|chieu toi nay|toi nay|chieu hom nay|hom nay|ngay mai)\b/.test(
      text,
    )
  ) {
    return 'SHOWTIMES';
  }
  if (/\b(phim nao|phim gi|dang chieu)\b/.test(text)) return 'NOW_SHOWING';
  // Chào hỏi chỉ khi không có ý định nào khác ("chào bạn, hôm nay có phim gì" vẫn ra SHOWTIMES)
  if (/^(xin )?(chao|hello|helo|hi|hey|alo|e)\b/.test(plainText(message))) return 'GREETING';
  return 'UNKNOWN';
}

const SEMANTIC_CUES =
  /\b(giong|tuong tu|kieu nhu|hop (di|de|voi|cho)|phu hop (de|voi|cho)|danh cho|theo (tam trang|so thich|khau vi)|nhe nhang|cam dong|hen ho|lang man|gay can|hoi hop|hai huoc|vui nhon|sau lang|thu gian|cho (gia dinh|tre em|cap doi|ban be|ban gai|ban trai))\b/;

export function looksSemantic(message) {
  return SEMANTIC_CUES.test(plainText(message));
}

const GENRE_ALIASES = [
  [/\b(danh nhau|dam nhau|danh dam|ban nhau|vo thuat|bat lon)\b/, 'hanh-dong'],
  [/\b(rung ron|so hai|phim ma)\b/, 'kinh-di'],
  [/\b(hai huoc|cuoi te)\b/, 'hai'],
  [/\b(tinh yeu|ngon tinh|hen ho)\b/, 'lang-man'],
];

const FILLER_WORDS = new Set(
  (
    'goi y de xuat nen xem phim cho toi minh ban em anh chi mot vai nhung cac the loai nao gi ' +
    'hay hot di thich muon can tim giup voi hom nay mai buoi sang trua chieu dem ngay co la va ' +
    'nhe nha a oi cua o tai rap duoc khong ko nhi moi dang sap gan day'
  ).split(' '),
);

export function hasDescriptiveContent(message) {
  return plainText(message)
    .split(' ')
    .some((word) => word && !FILLER_WORDS.has(word));
}

export function findNamedEntity(text, entities, getName) {
  const normalizedText = normalizeVietnamese(text);
  return (
    [...entities]
      .sort(
        (a, b) => normalizeVietnamese(getName(b)).length - normalizeVietnamese(getName(a)).length,
      )
      .find((entity) => {
        const name = normalizeVietnamese(getName(entity));
        return name.length > 2 && normalizedText.includes(name);
      }) ?? null
  );
}

export function resolveMovieReference(message, lastMovies) {
  if (!Array.isArray(lastMovies) || lastMovies.length === 0) return null;
  const plain = plainText(message);
  const padded = ` ${plain} `;

  const explicitlyNamed = lastMovies.some((movie) => {
    const title = plainText(movie?.title);
    return title.length > 1 && padded.includes(` ${title} `);
  });
  if (explicitlyNamed) return null;

  const ordinals = [
    [/\b(dau tien|thu nhat|thu 1|so 1|phim 1)\b/, 0],
    [/\b(thu hai|thu 2|so 2|phim 2)\b/, 1],
    [/\b(thu ba|thu 3|so 3|phim 3)\b/, 2],
    [/\b(thu tu|thu 4|so 4|phim 4)\b/, 3],
    [/\b(thu nam|thu 5|so 5|phim 5)\b/, 4],
    [/\b(thu sau|thu 6|so 6|phim 6)\b/, 5],
  ];
  const ordinal = ordinals.find(([pattern]) => pattern.test(plain));
  if (ordinal) return lastMovies[ordinal[1]] ?? null;

  if (/\b(cuoi cung|phim cuoi)\b/.test(plain)) return lastMovies.at(-1) ?? null;

  if (/\b(phim (do|nay|kia)|phim vua roi|phim ban nay)\b/.test(plain)) {
    return lastMovies.length === 1 ? lastMovies[0] : { ambiguous: true };
  }
  return null;
}

/** Tìm thể loại được nhắc tới (khớp nguyên từ, ưu tiên cụm dài nhất). */
export function findGenre(text, genres) {
  const plain = plainText(text);
  const padded = ` ${plain} `;
  let best = null;
  let bestLength = 0;
  for (const genre of genres) {
    for (const phrase of new Set([plainText(genre.name), plainText(genre.slug)])) {
      if (phrase.length > bestLength && padded.includes(` ${phrase} `)) {
        best = genre;
        bestLength = phrase.length;
      }
    }
  }
  if (best) return best;

  for (const [pattern, slug] of GENRE_ALIASES) {
    if (pattern.test(plain)) {
      const genre = genres.find((item) => item.slug === slug);
      if (genre) return genre;
    }
  }
  return null;
}

/** Ngày hiện tại theo giờ Việt Nam, biểu diễn bằng 00:00 UTC của ngày đó. */
export function vnToday(now = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseLocalDate(text, now = new Date()) {
  const normalized = normalizeVietnamese(text);
  const today = vnToday(now);

  if (/\b(ngay mai|mai)\b/.test(normalized)) {
    today.setUTCDate(today.getUTCDate() + 1);
    return today;
  }
  if (/\b(hom nay|toi nay|chieu nay|sang nay)\b/.test(normalized)) return today;

  const dateMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (!dateMatch) return null;
  const [, day, month, year] = dateMatch;
  const parsed = new Date(
    Date.UTC(Number(year || today.getUTCFullYear()), Number(month) - 1, Number(day)),
  );
  if (
    parsed.getUTCDate() !== Number(day) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    (year && parsed.getUTCFullYear() !== Number(year))
  ) {
    return null;
  }
  return parsed;
}

const EVENING_ACCENTED = /(^|[\s,.;!?])tối($|[\s,.;!?])/u;
const EVENING_PLAIN = /\b(buoi toi|toi nay|toi mai|chieu toi|dem nay)\b/;

/**
 * Nhận biết "buổi tối". Không dùng "toi" đứng một mình sau khi bỏ dấu,
 * vì "tôi" (đại từ) và "tối" (buổi) đều thành "toi".
 */
export function isEvening(message) {
  const original = String(message ?? '')
    .normalize('NFC')
    .toLowerCase();
  if (EVENING_ACCENTED.test(original) && !/tối (đa|ưu|thiểu)/u.test(original)) return true;
  return EVENING_PLAIN.test(plainText(message));
}

/**
 * Khoảng thời gian tìm suất chiếu.
 * - Có ngày hoặc "buổi tối": trong ngày đó (tối = 17:00 đến hết ngày, giờ VN).
 * - Không có cả hai: 48 giờ tới.
 */
export function buildTimeWindow({ date, evening, now = new Date() }) {
  if (!date && !evening) {
    return { from: now, until: new Date(now.getTime() + 2 * DAY_MS) };
  }
  const day = date ?? vnToday(now);
  const at = (hour) => new Date(day.getTime() + (hour - VN_UTC_OFFSET_HOURS) * HOUR_MS);
  const from = new Date(Math.max(at(evening ? 17 : 0).getTime(), now.getTime()));
  return { from, until: at(24) };
}

/** Nhãn thời gian dùng trong câu trả lời: "tối nay", "tối mai", "ngày mai", "sắp tới"... */
export function describePeriod({ date, evening, now = new Date() }) {
  if (!date && !evening) return 'sắp tới';
  const diffDays = date ? Math.round((date.getTime() - vnToday(now).getTime()) / DAY_MS) : 0;
  if (evening && diffDays === 0) return 'tối nay';
  if (evening && diffDays === 1) return 'tối mai';
  let day = 'hôm nay';
  if (diffDays === 1) day = 'ngày mai';
  else if (diffDays !== 0) {
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    day = `ngày ${dd}/${mm}`;
  }
  return evening ? `${day} buổi tối` : day;
}
