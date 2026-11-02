// Chạy một hội thoại nhiều lượt trong CÙNG một phiên và in kết quả gọn.
// Dùng: node services/core-api/scripts/chat-scenario.mjs "câu 1" "câu 2" ...
const API = process.env.CHATBOT_URL || 'http://localhost:4000/api/chatbot';
const turns = process.argv.slice(2);

if (turns.length === 0) {
  console.error('Dùng: node chat-scenario.mjs "câu 1" "câu 2" ...');
  process.exit(1);
}

let sessionId = null;
let previousTitles = [];

for (const message of turns) {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...(sessionId ? { sessionId } : {}) }),
  });
  const body = await response.json().catch(() => null);

  console.log(`\n> ${message}`);
  if (!response.ok) {
    console.log(`  HTTP ${response.status}: ${JSON.stringify(body?.error ?? body)}`);
    break;
  }

  sessionId = body.sessionId ?? sessionId;
  const notice = body.aiNotice ? ` luuy=${body.aiNotice}` : '';
  console.log(
    `  intent=${body.intent} nguon=${body.responseSource} session=${body.sessionId ? body.sessionId.slice(0, 8) : 'null'}${notice}`,
  );
  console.log(`  reply: ${body.reply}`);

  for (const movie of body.movies ?? []) {
    console.log(`  phim: ${movie.score ?? '-'}  ${movie.title}  [${(movie.genres ?? []).join(', ')}]`);
  }

  const showtimeTitles = [...new Set((body.showtimes ?? []).map((s) => s.movie.title))];
  if ((body.showtimes ?? []).length > 0) {
    console.log(`  suat chieu: ${body.showtimes.length} suat, phim: ${showtimeTitles.join(' | ')}`);
  }

  if (body.scope) {
    const scopeTitles = body.scope.movies.map((m) => m.title);
    console.log(`  scope: ${scopeTitles.join(' | ')}${body.scope.period ? ` (${body.scope.period})` : ''}`);
    if (scopeTitles.some((t) => !previousTitles.includes(t))) {
      console.log('  [LOI] scope co phim khong nam trong danh sach da goi y o luot truoc');
    }
    if (showtimeTitles.some((t) => !scopeTitles.includes(t))) {
      console.log('  [LOI] suat chieu co phim nam ngoai scope');
    }
  }

  if ((body.movies ?? []).length > 0) previousTitles = body.movies.map((m) => m.title);
}