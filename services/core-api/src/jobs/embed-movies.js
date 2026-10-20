import { createHash } from 'node:crypto';
import { prisma } from '@cinehub/db';
import {
  closeMongo,
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
  embedText,
  getCollection,
} from '../modules/chatbot/chatbot.vector.js';

const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildText(movie) {
  const names = (role) =>
    movie.credits.filter((credit) => credit.role === role).map((credit) => credit.person.fullName);
  const genres = movie.genres.map(({ genre }) => genre.name);
  const directors = names('DIRECTOR');
  const actors = names('ACTOR');
  return [
    `Phim: ${movie.title}${movie.originalTitle ? ` (${movie.originalTitle})` : ''}.`,
    genres.length ? `Thể loại: ${genres.join(', ')}.` : '',
    movie.country ? `Quốc gia: ${movie.country}.` : '',
    movie.ageRating ? `Độ tuổi: ${movie.ageRating}.` : '',
    directors.length ? `Đạo diễn: ${directors.join(', ')}.` : '',
    actors.length ? `Diễn viên: ${actors.join(', ')}.` : '',
    movie.synopsis ? `Nội dung: ${movie.synopsis.slice(0, 1500)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

async function embedWithRetry(text) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await embedText(text, 'RETRIEVAL_DOCUMENT');
    } catch (error) {
      const retryable =
        error.status === 429 || error.status >= 500 || error.name === 'TimeoutError';
      if (!retryable || attempt >= 4) throw error;
      console.warn(`   [WARN] Gemini embedding lỗi HTTP ${error.status}; thử lại lần ${attempt}.`);
      await sleep(attempt * 5000);
    }
  }
}

async function main() {
  const collection = await getCollection({ required: true });
  if (!collection) {
    throw new Error('MongoDB connection did not provide an embeddings collection.');
  }
  await collection.createIndex({ movieId: 1 }, { unique: true });

  const movies = await prisma.movie.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      titleNormalized: true,
      originalTitle: true,
      synopsis: true,
      country: true,
      ageRating: true,
      genres: { include: { genre: { select: { name: true } } } },
      credits: {
        orderBy: { billingOrder: 'asc' },
        take: 8,
        include: { person: { select: { fullName: true } } },
      },
    },
  });

  console.log(`[INFO] ${movies.length} phim, model=${EMBEDDING_MODEL}, dims=${EMBEDDING_DIMS}`);
  const stats = { embedded: 0, skipped: 0, failed: 0 };

  for (const movie of movies) {
    const text = buildText(movie);
    const textHash = createHash('sha256')
      .update(`${EMBEDDING_MODEL}|${EMBEDDING_DIMS}|${text}`)
      .digest('hex');
    const existing = await collection.findOne({ _id: movie.id }, { projection: { textHash: 1 } });
    if (!force && existing?.textHash === textHash) {
      stats.skipped++;
      continue;
    }

    try {
      const embedding = await embedWithRetry(text);
      await collection.replaceOne(
        { _id: movie.id },
        {
          _id: movie.id,
          movieId: movie.id,
          title: movie.title,
          titleNormalized: movie.titleNormalized,
          text,
          textHash,
          model: EMBEDDING_MODEL,
          dims: EMBEDDING_DIMS,
          embedding,
          updatedAt: new Date(),
        },
        { upsert: true },
      );
      stats.embedded++;
      console.log(`   + ${movie.title}`);
      await sleep(300);
    } catch (error) {
      stats.failed++;
      console.error(`   [ERROR] ${movie.title}: ${error.message}`);
    }
  }

  console.log(
    `[DONE] mới/cập nhật ${stats.embedded}, giữ nguyên ${stats.skipped}, lỗi ${stats.failed}`,
  );
  if (stats.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('[ERROR]', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongo();
  });
