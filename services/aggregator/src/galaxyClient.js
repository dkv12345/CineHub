import { galaxy } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CLIENT_ID = '3da4eba4-94dd-4e74-bc25-38e89a01fe07';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let cookieCache = '';

async function ensureCookie() {
  if (cookieCache) return cookieCache;
  try {
    const handshake = await fetch('https://www.galaxycine.vn/api/v2/mobile/cinemas', {
      headers: {
        clientid: CLIENT_ID,
        platform: 'website',
        'User-Agent': USER_AGENT,
      },
      redirect: 'manual',
    });
    const setCookie = handshake.headers.get('set-cookie');
    if (setCookie) {
      cookieCache = setCookie.split(';')[0];
    }
  } catch (e) {
    console.warn('[WARN] Handshake cookie retrieval failed:', e.message);
  }
  return cookieCache;
}

export async function fetchSessions(day) {
  const cookie = await ensureCookie();
  const url = new URL('/api/v2/mobile/sessions2', galaxy.baseUrl);
  url.searchParams.set('includeCinema', 'true');
  url.searchParams.set('includeMovie', 'true');
  if (day) url.searchParams.set('cinemaDay', day);

  const headers = {
    Accept: 'application/json',
    clientid: CLIENT_ID,
    platform: 'website',
    'User-Agent': USER_AGENT,
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Galaxy sessions2 lỗi ${res.status}`);
  const json = await res.json();
  await sleep(galaxy.delayMs);
  return json.data?.result ?? [];
}
