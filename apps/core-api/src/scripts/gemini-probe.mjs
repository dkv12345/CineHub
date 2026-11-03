// Đo độ trễ Gemini theo model và cấu hình "suy nghĩ" để chọn cấu hình nhanh nhất.
// Chạy từ thư mục gốc: node --env-file=.env services/core-api/scripts/gemini-probe.mjs
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error('Thiếu GEMINI_API_KEY trong .env');
  process.exit(1);
}

const PROMPT =
  'Người dùng hỏi: "tôi xem phim với người yêu thì xem gì". Phim có sẵn: Quyết Cua Anh Này (Lãng mạn, Hài); ' +
  'Chị Chị Em Em 3 (Tâm lý, Tình cảm); Lên Hương (Tâm lý, Gia đình). ' +
  'Hãy mở đầu bằng một câu thân thiện và chọn tối đa 2 phim phù hợp nhất, nêu lý do ngắn.';
const TIMEOUT_MS = 25000;

const models = [
  ...new Set(
    [
      process.env.GEMINI_MODEL?.trim(),
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ].filter(Boolean),
  ),
];
const variants = [
  { label: 'mac dinh', thinking: null },
  { label: 'thinkingBudget=0', thinking: { thinkingBudget: 0 } },
  { label: 'thinkingLevel=low', thinking: { thinkingLevel: 'low' } },
  { label: 'thinkingLevel=minimal', thinking: { thinkingLevel: 'minimal' } },
];

const results = [];
for (const model of models) {
  for (const variant of variants) {
    const startedAt = Date.now();
    const row = { model, variant, http: '-', ms: 0, chars: 0, thoughts: '-', note: '' };
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.2,
              ...(variant.thinking ? { thinkingConfig: variant.thinking } : {}),
            },
          }),
        },
      );
      row.http = response.status;
      const body = await response.json().catch(() => null);
      row.ms = Date.now() - startedAt;
      if (response.ok) {
        const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
        row.chars = text.trim().length;
        row.thoughts = body?.usageMetadata?.thoughtsTokenCount ?? 0;
        row.note = body?.candidates?.[0]?.finishReason ?? '';
      } else {
        row.note = String(body?.error?.message ?? '').replaceAll(apiKey, '[redacted]').slice(0, 70);
      }
    } catch (error) {
      row.ms = Date.now() - startedAt;
      row.note =
        error?.name === 'TimeoutError'
          ? `qua ${TIMEOUT_MS / 1000}s`
          : String(error?.message ?? error).slice(0, 70);
    }
    results.push(row);
    console.log(
      `${model} | ${variant.label} | http=${row.http} | ${row.ms}ms | ${row.chars} ky tu | thoughts=${row.thoughts} | ${row.note}`,
    );
  }
}

const best = results
  .filter((r) => r.http === 200 && r.chars > 0)
  .sort((a, b) => a.ms - b.ms)[0];
console.log('\n=== KET LUAN ===');
if (!best) {
  console.log('Khong cau hinh nao tra loi duoc. Gui nguyen output nay cho minh.');
} else {
  console.log(`Nhanh nhat: ${best.model} voi "${best.variant.label}" (${best.ms}ms). Them vao .env:`);
  console.log(`GEMINI_MODEL=${best.model}`);
  if (best.variant.thinking) {
    console.log(`GEMINI_THINKING_JSON=${JSON.stringify(best.variant.thinking)}`);
  }
}