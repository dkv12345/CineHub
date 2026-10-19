# CineBot and movie recommendations

## Chatbot design

The chat flow is deliberately database-first:

1. Normalize Vietnamese text (lowercase, remove combining marks, map `đ` to `d`).
2. Classify the request as showtimes, currently showing, movie details, ticket prices, refund policy, or payment help.
3. Match a movie with `Movie.titleNormalized` and a cinema by normalized `Cinema.name`.
4. Query Prisma for the matching public movie/showtime/cinema/price rows and build a deterministic answer.
5. When `GEMINI_API_KEY` is configured, send the user's question, intent, public result rows, and deterministic answer to Gemini. Gemini may answer general questions; for CineHub-specific facts it must use only the retrieved database context. The returned DB result cards remain authoritative. `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`.

Gemini is an optional presentation layer, not a source of schedule truth. A Gemini failure is logged and the deterministic database answer is used; the API marks the response source and returns a notice. Never include account, booking, payment, or other user data in model context.

Movie discovery and recommendations always query the current, non-deleted MySQL movie catalog. Common descriptions such as “đánh nhau”, “võ thuật”, and “bắn nhau” map to the action genre only when that genre exists in MySQL; descriptive recommendation prompts without a genre match can use semantic ranking. “Now showing” includes movies marked `NOW_SHOWING` or with a future `SCHEDULED`/`OPEN` showtime, so stale movie status does not hide films that have active showings. MongoDB embeddings can rank database rows but cannot introduce movie records; catalog movies without vectors remain eligible and stale vector IDs are ignored. If semantic search is unavailable, recommendations fall back to the database catalog. Movie-list and movie-detail replies are deterministic so Gemini cannot invent movie titles.

When a movie query returns no results, the API includes a visible database diagnostic distinguishing an empty catalog from movies with no eligible status/showtimes. Database query failures return an error code, actionable message, and request ID in chat; use that request ID to find the full error in Core API logs. The response never substitutes mock movie data.

### Conversation memory

`POST /api/chatbot` accepts an optional UUID `sessionId` alongside `message` and returns the server-issued `sessionId`. Send that returned ID on the next turn. Unknown or expired IDs start a new session; a session owned by another user is never read or modified. Chat remains available to guests, while valid bearer access tokens optionally associate the session with their UUID user ID.

MongoDB stores only `sessionId`, `userId`, the last 20 redacted user/bot messages, up to six most recently suggested movie `{ id, title }` references, and timestamps in `ai_chat_sessions`. Email addresses, phone numbers, and common Gemini API key formats are redacted before storage. Three independent indexes enforce session ID uniqueness, user/update ordering, and 30-day TTL expiry. If MongoDB is unavailable, chat continues without memory and returns `sessionId: null`. The web client stores the returned ID in `sessionStorage`; “Cuộc trò chuyện mới” clears it.

Follow-ups such as “phim đầu tiên chiếu lúc mấy giờ?” and “phim thu hai noi ve gi” resolve against the last movie list. A demonstrative like “phim đó” resolves only when one movie is remembered; otherwise CineBot asks which title the user means.

Configure `GEMINI_API_KEY` in the root `.env` file. Keep the key server-side; the Vite client only calls `/api/chatbot`. Set `GEMINI_MODEL` only if you want to override the default.

Current limits: intent/entity matching is deterministic and supports Vietnamese diacritic-insensitive title/cinema matches, today/tomorrow, and numeric dates. Gemini receives the original question to handle natural language and can respond to general questions. Refund and payment answers remain grounded in the deterministic policy text.

### Semantic movie search

For preference-style questions, CineBot can retrieve similar movies from locally stored Gemini embeddings:

1. Run `npm run embed:movies -w @cinehub/core-api` to read movie title, genres, director/actor credits, country, age rating, and synopsis from MySQL; create `RETRIEVAL_DOCUMENT` vectors with `GEMINI_EMBEDDING_MODEL`; and upsert them into MongoDB's `movie_embeddings` collection.
2. The embed script hashes its source text and model/dimension settings, so repeated runs skip unchanged movies. Use `-- --force` after the script command to regenerate all vectors.
3. For semantic prompts such as “phim hợp đi hẹn hò” or “phim giống Inception”, create a `RETRIEVAL_QUERY` vector, compare normalized vectors by dot product, then fetch the matching movie IDs and details from MySQL. A known title in a “giống” query reuses that movie's stored vector.
4. When the user supplies a day or evening, MySQL filters semantic candidates to scheduled/open showtimes in that local Vietnam time window. The response cards and movie titles always come from the current MySQL rows.

Configure `GEMINI_API_KEY`, `MONGODB_URI`, and optionally `GEMINI_EMBEDDING_MODEL` (defaults to `gemini-embedding-001`), `GEMINI_EMBEDDING_DIMS` (defaults to 768), and `MONGODB_DB` (defaults to `cinehub`). CineBot reads only its `movie_embeddings` collection for vector ranking; MongoDB's separate `sample_mflix` sample dataset is not used. MongoDB's `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` initialize the root account only when its data volume is empty; changing these values does not update an existing account. If Mongo reports authentication error code 18, set the URI and Compose credentials to the account already stored in the volume. Do not remove the volume unless its data is disposable. Missing vector data, MongoDB outages, and embedding API errors are logged and fall back to the non-semantic chatbot path; they do not take down chat. Mongo results are cached in memory for ten minutes. Re-run the embed script after movie metadata changes.

## Recommendation design

The first version is a content-based hybrid ranker backed by the existing relational database:

1. The frontend sends only recent movie IDs and favorite movie IDs to `POST /api/recommendations`; it does not send a profile, name, email, or viewing text.
2. The backend loads those movies and their `MovieGenre` associations with Prisma.
3. Favorite genres receive a stronger weight than recent viewing history. Recent items decay with their position in the list.
4. Candidate `NOW_SHOWING` and `COMING_SOON` movies are excluded if already seen, then ranked by genre affinity, available rating signals, and showtime activity.
5. The API returns a small DTO list with reason labels; the Home page renders these cards under “Dành riêng cho bạn”. With no usable history, ranking falls back to public popularity signals.

This is an explainable baseline, not a trained collaborative model. It needs no vector database because catalog size and metadata are small and `MovieGenre` already captures useful preference signals.

### Vector-search evolution

If the catalog or metadata becomes large and nuanced:

- Build a text document from title, synopsis, genres, country, and age rating; generate embeddings offline when movies are created or crawled, with an embedding-model version and refresh timestamp.
- Store vectors with the movie ID and metadata in a vector index. Query with a user-selected seed movie or an explicitly supplied natural-language taste query. Do not embed or transmit personal identifiers.
- Retrieve nearest candidates, then apply relational filters for active showtimes, release status, availability, and age policy. Blend semantic similarity with current content-based affinity and popularity; diversify near-duplicates before returning results.
- Measure offline precision/recall and online clicks/booking conversion before replacing the current ranker. Keep a non-vector fallback for outages and cold start.

The current project database is MySQL, so `pgvector` is not a drop-in extension. A later vector phase must either add and operate a compatible PostgreSQL service (and keep movie metadata synchronized) or choose a vector service compatible with the project’s deployment and privacy needs. Avoid adding vector infrastructure until evaluation shows the SQL baseline is inadequate.

## References

- [Gemini API text generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [pgvector](https://github.com/pgvector/pgvector)
