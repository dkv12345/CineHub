export type ChatMovie = {
  id: string;
  title: string;
  synopsis: string | null;
  durationMin: number | null;
  ageRating: string | null;
  posterUrl: string | null;
  status: string;
  genres: string[];
  rating: number;
};

export type ChatShowtime = {
  id: string;
  startTime: string;
  time: string;
  date: string;
  format: string;
  movie: { id: string; title: string };
  cinema: { id: string; name: string };
};

export type ChatReply = {
  intent: string;
  reply: string;
  sessionId: string | null;
  responseSource: 'database' | 'gemini';
  aiNotice: string | null;
  diagnostic: string | null;
  movies: ChatMovie[];
  movie: ChatMovie | null;
  cinemas: { id: string; name: string }[];
  showtimes: ChatShowtime[];
  prices: { seatType: string; min: number; max: number }[];
};

const SESSION_STORAGE_KEY = 'cinehub:chat-session-id';

function readSessionId() {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function resetCineBotSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    return;
  }
}

export async function askCineBot(message: string, signal?: AbortSignal) {
  const sessionId = readSessionId();
  const response = await fetch('/api/chatbot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...(sessionId ? { sessionId } : {}) }),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const apiError = payload?.error;
    const detail =
      typeof apiError?.message === 'string'
        ? apiError.message
        : `CineBot chưa thể trả lời (HTTP ${response.status}).`;
    const requestId =
      typeof apiError?.requestId === 'string' ? ` (request ID: ${apiError.requestId})` : '';
    throw new Error(`${detail}${requestId}`);
  }
  const result: ChatReply = await response.json();
  if (typeof result.reply !== 'string' || !Array.isArray(result.showtimes)) {
    throw new Error('Dữ liệu trả lời từ CineBot không hợp lệ.');
  }
  try {
    if (result.sessionId) sessionStorage.setItem(SESSION_STORAGE_KEY, result.sessionId);
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Chat still works when browser storage is unavailable.
  }
  return result;
}
