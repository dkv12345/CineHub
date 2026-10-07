import { galaxy } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchSessions(day) {
  const url = new URL('/api/v2/mobile/sessions2', galaxy.baseUrl);
  url.searchParams.set('includeCinema', 'true');
  url.searchParams.set('includeMovie', 'true');
  if (day) url.searchParams.set('cinemaDay', day);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Galaxy sessions2 lỗi ${res.status}`);
  const json = await res.json();
  await sleep(galaxy.delayMs);
  return json.data?.result ?? [];
}
