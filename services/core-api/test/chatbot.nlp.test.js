import { describe, expect, it } from 'vitest';
import {
  detectChatIntent,
  findNamedEntity,
  findGenre,
  hasDescriptiveContent,
  isEvening,
  looksSemantic,
  parseLocalDate,
  resolveMovieReference,
} from '../src/modules/chatbot/chatbot.nlp.js';
import { normalizeVietnamese } from '../src/lib/text.js';

describe('CineBot Vietnamese NLP helpers', () => {
  it('normalizes Vietnamese diacritics and punctuation', () => {
    expect(normalizeVietnamese('Phim nào chiếu tối nay?')).toBe('phim nao chieu toi nay');
  });

  it('detects showtime and currently showing questions without diacritics', () => {
    expect(detectChatIntent('phim nao chieu toi nay')).toBe('SHOWTIMES');
    expect(detectChatIntent('phim nao dang chieu')).toBe('NOW_SHOWING');
  });

  it('detects continuation questions for showtimes and movie details', () => {
    expect(detectChatIntent('phim đó chiếu mấy giờ?')).toBe('SHOWTIMES');
    expect(detectChatIntent('phim này chiếu lúc nào?')).toBe('SHOWTIMES');
    expect(detectChatIntent('rạp nào chiếu phim kia?')).toBe('SHOWTIMES');
    expect(detectChatIntent('phim thứ hai nói về gì?')).toBe('MOVIE_DETAILS');
    expect(detectChatIntent('phim đầu tiên bao lâu?')).toBe('MOVIE_DETAILS');
    expect(detectChatIntent('phim số 3 phân loại độ tuổi nào?')).toBe('MOVIE_DETAILS');
  });

  it('resolves ordinal movie references from the last recommendation in Vietnamese or plain text', () => {
    const lastMovies = [
      { id: 'a', title: 'Phim A' },
      { id: 'b', title: 'Phim B' },
      { id: 'c', title: 'Phim C' },
      { id: 'd', title: 'Phim D' },
      { id: 'e', title: 'Phim E' },
      { id: 'f', title: 'Phim F' },
    ];
    expect(resolveMovieReference('phim đầu tiên', lastMovies)).toEqual(lastMovies[0]);
    expect(resolveMovieReference('phim thứ nhất', lastMovies)).toEqual(lastMovies[0]);
    expect(resolveMovieReference('phim thứ hai', lastMovies)).toEqual(lastMovies[1]);
    expect(resolveMovieReference('phim thu hai noi ve gi', lastMovies)).toEqual(lastMovies[1]);
    expect(resolveMovieReference('phim số 3', lastMovies)).toEqual(lastMovies[2]);
    expect(resolveMovieReference('phim thứ 4', lastMovies)).toEqual(lastMovies[3]);
    expect(resolveMovieReference('phim số 5', lastMovies)).toEqual(lastMovies[4]);
    expect(resolveMovieReference('phim 6', lastMovies)).toEqual(lastMovies[5]);
    expect(resolveMovieReference('phim cuối cùng', lastMovies)).toEqual(lastMovies[5]);
  });

  it('resolves demonstratives and asks for clarification when several movies are possible', () => {
    const lastMovies = [
      { id: 'a', title: 'Phim A' },
      { id: 'b', title: 'Phim B' },
    ];
    expect(resolveMovieReference('phim đó', [lastMovies[0]])).toEqual(lastMovies[0]);
    expect(resolveMovieReference('phim vua roi', [lastMovies[0]])).toEqual(lastMovies[0]);
    expect(resolveMovieReference('phim ban nay', [lastMovies[0]])).toEqual(lastMovies[0]);
    expect(resolveMovieReference('phim đó', lastMovies)).toEqual({ ambiguous: true });
    expect(resolveMovieReference('phim kia', lastMovies)).toEqual({ ambiguous: true });
    expect(resolveMovieReference('phim thứ ba', lastMovies)).toBeNull();
  });

  it('lets an explicit movie title take precedence over a positional reference', () => {
    const lastMovies = [
      { id: 'a', title: 'Phim A' },
      { id: 'b', title: 'Dune: Part Two' },
    ];
    expect(resolveMovieReference('Dune Part Two nói về gì thay vì phim thứ nhất', lastMovies)).toBe(
      null,
    );
  });

  it('recognizes semantic movie preferences and similarity queries', () => {
    expect(looksSemantic('phim nào hợp đi hẹn hò')).toBe(true);
    expect(looksSemantic('phim giống Inception')).toBe(true);
    expect(looksSemantic('phim nhẹ nhàng cho gia đình')).toBe(true);
    expect(looksSemantic('gợi ý phim theo tâm trạng của tôi')).toBe(true);
    expect(detectChatIntent('phim nhẹ nhàng cho gia đình')).not.toBe('TICKET_PRICES');
    expect(detectChatIntent('giá phim gia đình')).toBe('TICKET_PRICES');
  });

  it('matches genre phrases as complete normalized words', () => {
    const genres = [
      { id: 'action', name: 'Hành động', slug: 'hanh-dong' },
      { id: 'family', name: 'Gia đình', slug: 'gia-dinh' },
    ];
    expect(findGenre('phim hành động', genres)?.id).toBe('action');
    expect(findGenre('phim cho gia đình', genres)?.id).toBe('family');
    expect(findGenre('phim tình cảm', genres)).toBeNull();
  });

  it('matches conversational genre aliases only when the corresponding DB genre exists', () => {
    const genres = [
      { id: 'action', name: 'Hành động', slug: 'hanh-dong' },
      { id: 'horror', name: 'Kinh dị', slug: 'kinh-di' },
      { id: 'comedy', name: 'Hài', slug: 'hai' },
      { id: 'romance', name: 'Lãng mạn', slug: 'lang-man' },
    ];
    expect(findGenre('phim đánh nhau', genres)?.id).toBe('action');
    expect(findGenre('phim võ thuật', genres)?.id).toBe('action');
    expect(findGenre('phim bắn nhau', genres)?.id).toBe('action');
    expect(findGenre('phim ma', genres)?.id).toBe('horror');
    expect(findGenre('phim cười tẹ', genres)?.id).toBe('comedy');
    expect(findGenre('phim ngôn tình', genres)?.id).toBe('romance');
    expect(
      findGenre(
        'phim đánh nhau',
        genres.filter(({ id }) => id !== 'action'),
      ),
    ).toBeNull();
  });

  it('distinguishes generic recommendation wording from descriptive preferences', () => {
    expect(hasDescriptiveContent('gợi ý phim cho buổi tối')).toBe(false);
    expect(hasDescriptiveContent('tôi thích xem phim đánh nhau, gợi ý cho tôi')).toBe(true);
    expect(hasDescriptiveContent('gợi ý phim có plot twist')).toBe(true);
  });

  it('understands accented and unaccented evening requests without confusing “tôi”', () => {
    expect(isEvening('phim hay tối nay')).toBe(true);
    expect(isEvening('phim hay buoi toi')).toBe(true);
    expect(isEvening('tôi thích phim tình cảm')).toBe(false);
  });

  it('matches the longest normalized cinema or movie name in the query', () => {
    const movies = [
      { title: 'Doraemon', titleNormalized: 'doraemon' },
      { title: 'Doraemon: Nobita', titleNormalized: 'doraemon nobita' },
    ];
    expect(
      findNamedEntity(
        'lich chieu doraemon nobita toi nay',
        movies,
        (movie) => movie.titleNormalized,
      )?.title,
    ).toBe('Doraemon: Nobita');
  });

  it('parses today and tomorrow in the Ho Chi Minh timezone', () => {
    const now = new Date('2026-10-18T02:00:00.000Z');
    expect(parseLocalDate('toi nay', now)?.toISOString()).toBe('2026-10-18T00:00:00.000Z');
    expect(parseLocalDate('ngay mai', now)?.toISOString()).toBe('2026-10-19T00:00:00.000Z');
  });
});
