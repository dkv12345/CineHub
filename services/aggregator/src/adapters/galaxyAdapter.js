import { createHash } from 'node:crypto';

export function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/tp\.?\s*/i, '')
    .replace(/tinh\s*/i, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanPhone(phone) {
  if (!phone) return null;
  return phone.replace(/\s+/g, '').trim();
}

export const AGE_MAP = {
  0: 'P',
  P: 'P',
  k: 'K',
  K: 'K',
  13: 'T13',
  T13: 'T13',
  16: 'T16',
  T16: 'T16',
  18: 'T18',
  T18: 'T18',
  c: 'C',
  C: 'C',
};

const PROVINCE_KEYWORDS = [
  { match: /hồ chí minh|tp\.hcm|hcm|sài gòn/i, code: 'HCM', norm: 'ho chi minh' },
  { match: /hà nội|hn/i, code: 'HN', norm: 'ha noi' },
  { match: /đà nẵng|danang/i, code: 'DN', norm: 'da nang' },
  { match: /hải phòng/i, code: 'HP', norm: 'hai phong' },
  { match: /bình dương/i, code: 'BD', norm: 'binh duong' },
  { match: /cần thơ/i, code: 'CT', norm: 'can tho' },
  { match: /đồng nai/i, code: 'DNA', norm: 'dong nai' },
  { match: /bà rịa|vũng tàu/i, code: 'VT', norm: 'ba ria - vung tau' },
  { match: /an giang/i, code: 'AG', norm: 'an giang' },
  { match: /khánh h[òo]a|nha trang/i, code: 'KH', norm: 'khanh hoa' },
  { match: /nghệ an|vinh/i, code: 'NA', norm: 'nghe an' },
  { match: /quảng ninh|hạ long/i, code: 'QN', norm: 'quang ninh' },
  { match: /tiền giang|mỹ tho/i, code: 'TG', norm: 'tien giang' },
  { match: /tây ninh/i, code: 'TN', norm: 'tay ninh' },
  { match: /cà mau/i, code: 'CM', norm: 'ca mau' },
  { match: /kiên giang|rạch giá/i, code: 'KG', norm: 'kien giang' },
  { match: /bến tre/i, code: 'BTR', norm: 'ben tre' },
  { match: /gia lai|pleiku/i, code: 'GL', norm: 'gia lai' },
  { match: /đắk lắk|buôn ma thuột/i, code: 'DL', norm: 'dak lak' },
];

export function parseAddress(address) {
  if (!address) return { provinceNormalized: 'ho chi minh', ward: null };

  let provinceNormalized = 'ho chi minh';
  for (const item of PROVINCE_KEYWORDS) {
    if (item.match.test(address)) {
      provinceNormalized = item.norm;
      break;
    }
  }

  // Tách phường nếu có
  const wardMatch = address.match(/(?:Phường|P\.)\s*([^,.-]+)/i);
  const ward = wardMatch ? `Phường ${wardMatch[1].trim()}` : null;

  return { provinceNormalized, ward };
}

export function mapSession(session, { durationMin = 120 } = {}) {
  const version = (session.version || '').toLowerCase();
  const caption = (session.caption || '').toLowerCase();

  let format = 'TWO_D';
  let tier = 'STANDARD';
  let kind = 'REGULAR';

  if (version.includes('imax')) {
    format = 'IMAX';
    tier = 'PREMIUM';
  } else if (version.includes('3d')) {
    format = 'THREE_D';
  }

  if (
    version.includes('laurus') ||
    version.includes('aqualis') ||
    version.includes('lagom') ||
    version.includes('vip')
  ) {
    tier = 'VIP';
  }

  if (version.includes('rebroadcast') || version.includes('encore')) {
    kind = 'ENCORE';
  } else if (version.includes('live')) {
    kind = 'LIVE';
  }

  const captionMode =
    caption.includes('voice') || caption.includes('lồng') ? 'DUBBED' : 'SUBTITLED';

  // Parse start time (Asia/Ho_Chi_Minh is UTC+7)
  const [year, month, day] = session.showDate.split('-').map(Number);
  const [hour, minute] = session.showTime.split(':').map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour - 7, minute);
  const startTime = new Date(utcMillis);

  const durationWithBuffer = (durationMin || 120) + 15; // 15 phút quảng cáo & dọn rạp
  const endTime = new Date(startTime.getTime() + durationWithBuffer * 60 * 1000);

  const cinemaCode = session.cinema?.code || session.cinemaCode;
  const movieExternalId = session.movie?.id || session.movieId;

  const dedupKey = createHash('sha1')
    .update(`GALAXY:${cinemaCode}:${movieExternalId}:${startTime.toISOString()}:${format}`)
    .digest('hex');

  return {
    cinemaCode,
    movieExternalId,
    auditoriumName: session.screenName || 'Screen 1',
    externalId: session.id,
    dedupKey,
    startTime,
    endTime,
    localDate: session.showDate,
    format,
    formatRaw: session.movieFormat || '2D Phụ Đề',
    versionCode: session.version,
    tier,
    kind,
    captionMode,
    audioLanguage: 'vi',
    subtitleLanguage: captionMode === 'SUBTITLED' ? 'vi' : null,
    providerTotalSeats: session.totalSeat || 0,
    providerBookedSeats: session.bookedSeat || 0,
  };
}
