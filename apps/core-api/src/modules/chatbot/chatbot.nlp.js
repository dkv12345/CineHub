import { normalizeVietnamese } from '../../platform/utils/text.js';

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

export const INTENT_CATEGORIES = {
  SEARCH_MOVIES: 'Search Movies',
  ASK_SHOWTIMES: 'Ask Showtimes',
  CINEMA_INFO: 'Cinema Info',
  CHIT_CHAT: 'Chit-chat',
};

export function getIntentCategory(intent) {
  switch (intent) {
    case 'RECOMMEND':
    case 'SEMANTIC':
    case 'NOW_SHOWING':
      return INTENT_CATEGORIES.SEARCH_MOVIES;
    case 'SHOWTIMES':
      return INTENT_CATEGORIES.ASK_SHOWTIMES;
    case 'CINEMA_INFO':
    case 'MOVIE_DETAILS':
    case 'TICKET_PRICES':
    case 'REFUND_POLICY':
    case 'PAYMENT_HELP':
      return INTENT_CATEGORIES.CINEMA_INFO;
    case 'GREETING':
    case 'CHIT_CHAT':
      return INTENT_CATEGORIES.CHIT_CHAT;
    default:
      return INTENT_CATEGORIES.SEARCH_MOVIES;
  }
}

export function detectChatIntent(message) {
  const text = normalizeVietnamese(message);
  const plain = plainText(message);
  if (/\b(doi phim|chon phim khac|xem phim khac|tim phim khac|phim khac)\b/.test(plain)) {
    return 'RESET_CONTEXT';
  }
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
    /\b(suat chieu|suat nao|co suat|lich chieu|gio chieu|may gio|luc nao|khi nao|rap nao|chieu toi nay|chieu hom nay)\b/.test(
      text,
    )
  ) {
    return 'SHOWTIMES';
  }
  if (
    /\b(dia chi rap|rap o dau|cum rap|cac rap|danh sach rap|thong tin rap|chi nhanh rap|rap galaxy|rap cinehub)\b/.test(
      plain,
    )
  ) {
    return 'CINEMA_INFO';
  }
  if (
    /\b(goi y|de xuat|nen xem|xem gi|chon gi|chon phim|nen chon|di xem gi|phim hay|phim hot|the loai nao|nhung the loai|cac the loai|phim tre em|phim cho be|phim thieu nhi|phim hoat hinh|phim gia dinh|phim chieu rap)\b/.test(
      text,
    )
  ) {
    return 'RECOMMEND';
  }
  if (/\b(phim nao|phim gi|dang chieu)\b/.test(text)) return 'NOW_SHOWING';
  if (/\b(cam on|thanks|thank you|tuyet voi|rat tot|tam biet|bye|ban la ai)\b/.test(plain)) {
    return 'CHIT_CHAT';
  }
  if (
    /^(hom nay|toi nay|ngay mai|toi mai|sang mai|cuoi tuan|o galaxy|tai galaxy|rap galaxy)$/.test(
      plain,
    )
  ) {
    return 'CONTEXTUAL_FOLLOW_UP';
  }
  // Chào hỏi chỉ khi không có ý định nào khác ("chào bạn, hôm nay có phim gì" vẫn ra SHOWTIMES)
  if (/^(xin )?(chao|hello|helo|hi|hey|alo)\b/.test(plain)) return 'GREETING';
  return 'UNKNOWN';
}

/**
 * Tìm phim trong danh mục hoặc phiên hội thoại khớp với cụm từ người dùng nhập
 * (hỗ trợ nhập nguyên tên phim, bỏ chữ "phim", "xem phim" và không dấu).
 */
export function resolveMovieTitle(text, catalogMovies = [], sessionMovies = []) {
  if (!text || typeof text !== 'string') return null;
  const clean = plainText(text)
    .replace(/^(phim|ve phim|ve|xem phim|xem|ve xem)\s+/, '')
    .trim();
  if (clean.length < 2) return null;

  // 1. Ưu tiên các phim vừa được nhắc tới trong session
  for (const ref of sessionMovies) {
    if (!ref?.title) continue;
    const refTitle = plainText(ref.title);
    if (refTitle === clean || refTitle.includes(clean) || clean.includes(refTitle)) {
      const fullMovie = catalogMovies.find((m) => m.id === ref.id || m.title === ref.title);
      if (fullMovie) return fullMovie;
      return { id: ref.id, title: ref.title, titleNormalized: refTitle };
    }
  }

  // 2. Khớp tuyệt đối theo titleNormalized trong danh mục phim
  const exact = catalogMovies.find((m) => {
    const norm = plainText(m.titleNormalized || m.title);
    return norm === clean;
  });
  if (exact) return exact;

  // 3. Khớp tương đối (cụm từ nằm trong tiêu đề hoặc ngược lại)
  const partial = catalogMovies
    .filter((m) => {
      const norm = plainText(m.titleNormalized || m.title);
      return norm.includes(clean) || (clean.length >= 4 && clean.includes(norm));
    })
    .sort((a, b) => {
      const aLen = (a.titleNormalized || a.title).length;
      const bLen = (b.titleNormalized || b.title).length;
      return Math.abs(aLen - clean.length) - Math.abs(bLen - clean.length);
    });

  return partial[0] ?? null;
}

const SEMANTIC_CUES =
  /\b(giong|tuong tu|kieu nhu|hop (di|de|voi|cho)|phu hop (de|voi|cho)|danh cho|theo (tam trang|so thich|khau vi)|nhe nhang|cam dong|hen ho|lang man|gay can|hoi hop|hai huoc|vui nhon|sau lang|thu gian|nguoi yeu|vo chong|ban gai|ban trai|crush|bo me|cha me|ban be|di cung|mot minh|cho (gia dinh|tre em|cap doi|ban be|ban gai|ban trai))\b/;

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

// Cụm cho biết người dùng muốn xem lịch của mọi phim, không giới hạn theo phim vừa gợi ý
const SCOPE_RESET = /\b(tat ca (cac )?phim|moi phim|phim khac|phim bat ky|bat ky phim)\b/;

/**
 * Phạm vi phim cho câu hỏi lịch chiếu không nêu tên phim: các phim đã gợi ý ở lượt trước.
 * Trả về null khi không giới hạn (đã nêu tên phim, muốn xem tất cả, hoặc chưa có gợi ý nào).
 */
export function resolveShowtimeScope({ message, hasNamedMovie, lastMovies }) {
  if (hasNamedMovie) return null;
  if (!Array.isArray(lastMovies) || lastMovies.length === 0) return null;
  if (SCOPE_RESET.test(plainText(message))) return null;
  return { movies: lastMovies.slice(0, 6) };
}
/** Câu có nhắc tới phim/rạp: nếu không khớp ý định nào thì vẫn tìm theo nghĩa thay vì bỏ cuộc. */
export function mentionsMovies(message) {
  return /\b(phim|di rap|xem rap|rap chieu)\b/.test(plainText(message));
}

// Từ đệm bỏ đi trước khi tạo vector, để vector tập trung vào ý chính của câu hỏi
const QUERY_NOISE = new Set(
  (
    'toi minh ban em anh chi thi la gi nao the sao nen chon xem phim voi di cho can muon thich ' +
    'duoc khong ko nhi nha oi a hay mot cac nhung vai'
  ).split(' '),
);

/** Văn bản dùng để tạo vector cho câu hỏi. "phim giống X" giữ nguyên để còn nhận ra tên phim. */
export function semanticQueryText(message) {
  const original = String(message ?? '');
  if (/\b(giong|tuong tu|kieu nhu|nhu)\b/.test(plainText(original))) return original;
  const kept = original.split(/\s+/).filter((word) => {
    const plain = plainText(word);
    return plain && !QUERY_NOISE.has(plain);
  });
  return kept.length > 0 ? `Phim phù hợp: ${kept.join(' ')}` : original;
}

// Hoàn cảnh -> tên thể loại (không dấu) nên được ưu tiên
const MOOD_GENRES = [
  [
    /\b(nguoi yeu|hen ho|ban gai|ban trai|crush|cap doi|vo chong|lang man)\b/,
    ['lang man', 'tinh cam'],
  ],
  [/\b(gia dinh|bo me|cha me|tre em|con cai)\b/, ['gia dinh', 'hoat hinh']],
  [/\b(vui|vui ve|hai huoc|thu gian)\b/, ['hai']],
  [/\b(gay can|hoi hop|ly ki|trinh tham|giat gan|ma)\b/, ['giat gan', 'ly ki', 'kinh di']],
];

/** Tập tên thể loại (không dấu) hợp với hoàn cảnh trong câu hỏi; rỗng nếu không nhận ra. */
export function moodGenres(message) {
  const plain = plainText(message);
  const names = new Set();
  for (const [pattern, genreNames] of MOOD_GENRES) {
    if (pattern.test(plain)) for (const name of genreNames) names.add(name);
  }
  return names;
}

export function parseAudience(message) {
  const plain = plainText(message);
  if (/\b(tre em|cho be|em be|thieu nhi|con nit|hoat hinh cho be|tre nho)\b/.test(plain)) {
    return {
      target: 'CHILDREN',
      allowedAgeRatings: ['P', 'K'],
      excludedAgeRatings: ['T16', 'T18'],
      preferredGenres: ['Hoạt hình', 'Gia đình', 'Phiêu lưu'],
      excludedGenres: ['Kinh dị', 'Giật gân'],
    };
  }
  if (/\b(gia dinh|bo me|cha me|ca nha|gia dinh co tre)\b/.test(plain)) {
    return {
      target: 'FAMILY',
      allowedAgeRatings: ['P', 'K', 'T13'],
      excludedAgeRatings: ['T16', 'T18'],
      preferredGenres: ['Gia đình', 'Hoạt hình', 'Hài'],
      excludedGenres: ['Kinh dị', 'Giật gân'],
    };
  }
  if (/\b(18\+|nguoi lon|t18)\b/.test(plain)) {
    return {
      target: 'ADULT',
      allowedAgeRatings: ['T18'],
      excludedAgeRatings: [],
      preferredGenres: [],
      excludedGenres: [],
    };
  }
  if (/\b(t16)\b/.test(plain)) {
    return {
      target: 'T16',
      allowedAgeRatings: ['P', 'K', 'T13', 'T16'],
      excludedAgeRatings: ['T18'],
      preferredGenres: [],
      excludedGenres: [],
    };
  }
  if (/\b(t13)\b/.test(plain)) {
    return {
      target: 'T13',
      allowedAgeRatings: ['P', 'K', 'T13'],
      excludedAgeRatings: ['T16', 'T18'],
      preferredGenres: [],
      excludedGenres: [],
    };
  }
  return {
    target: null,
    allowedAgeRatings: null,
    excludedAgeRatings: null,
    preferredGenres: [],
    excludedGenres: [],
  };
}

export function parseTimeWindow(message, now = new Date()) {
  const text = normalizeVietnamese(message);
  const plain = plainText(message);
  const today = vnToday(now);

  let targetDate = parseLocalDate(text, now);

  if (!targetDate && /\b(cuoi tuan|thu 7|thu bay|chu nhat)\b/.test(plain)) {
    const dayOfWeek = today.getUTCDay();
    const daysUntilWeekend = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 0 : 6 - dayOfWeek;
    targetDate = new Date(today.getTime() + daysUntilWeekend * DAY_MS);
  }

  const evening = isEvening(message);
  let partOfDay = null;
  let startHour = null;
  let endHour = null;

  if (/\b(sang nay|buoi sang|sang mai)\b/.test(plain)) {
    partOfDay = 'morning';
    startHour = 8;
    endHour = 12;
  } else if (/\b(buoi trua|trua nay|trua mai)\b/.test(plain)) {
    partOfDay = 'midday';
    startHour = 12;
    endHour = 14;
  } else if (/\b(buoi chieu|chieu nay|chieu mai)\b/.test(plain)) {
    partOfDay = 'afternoon';
    startHour = 14;
    endHour = 18;
  } else if (evening || /\b(buoi toi|toi nay|toi mai)\b/.test(plain)) {
    partOfDay = 'evening';
    startHour = 17;
    endHour = 24;
  } else if (/\b(dem nay|khuya nay|muon|suat muon)\b/.test(plain)) {
    partOfDay = 'night';
    startHour = 21;
    endHour = 24;
  }

  const hourMatch = plain.match(/\b(?:sau|truoc|tam|luc|khoang)?\s*(\d{1,2})(?:h|:)(\d{2})?\b/);
  if (hourMatch) {
    const h = Number(hourMatch[1]);
    if (h >= 0 && h <= 23) {
      if (plain.includes(`sau ${h}`) || plain.includes(`sau ${hourMatch[0]}`)) {
        startHour = h;
        endHour = 24;
      } else if (plain.includes(`truoc ${h}`) || plain.includes(`truoc ${hourMatch[0]}`)) {
        startHour = startHour ?? 8;
        endHour = h;
      } else {
        startHour = Math.max(0, h - 1);
        endHour = Math.min(24, h + 2);
      }
    }
  }

  const hasPeriod = Boolean(targetDate) || Boolean(partOfDay) || startHour !== null;
  const day = targetDate ?? vnToday(now);
  const at = (hour) => new Date(day.getTime() + (hour - VN_UTC_OFFSET_HOURS) * HOUR_MS);
  const from = new Date(Math.max(at(startHour ?? (evening ? 17 : 0)).getTime(), now.getTime()));
  const until = at(endHour ?? 24);

  return {
    targetDate,
    hasPeriod,
    evening,
    partOfDay,
    startHour,
    endHour,
    from,
    until,
    periodLabel: hasPeriod ? describePeriod({ date: targetDate, evening, now }) : 'sắp tới',
  };
}

export function extractEntities(message, { movies = [], cinemas = [], genres = [] } = {}) {
  const normalized = normalizeVietnamese(message);
  const matchedMovie = findNamedEntity(normalized, movies, (m) => m.titleNormalized || m.title);
  const matchedCinema = findNamedEntity(normalized, cinemas, (c) => c.name);
  const matchedGenre = findGenre(message, genres);
  const timeWindow = parseTimeWindow(message);
  const audience = parseAudience(message);

  const locationMatch = normalized.match(
    /\b(quan [0-9]+|quan [a-z]+|tan binh|phu nhuan|binh thanh|go vap|thu duc|ha noi|ho chi minh|tp\.?hcm|da nang|can tho)\b/i,
  );

  return {
    movie: matchedMovie,
    cinema: matchedCinema,
    cinemaLocation: locationMatch ? locationMatch[0] : null,
    genre: matchedGenre,
    timeWindow,
    audience,
  };
}
