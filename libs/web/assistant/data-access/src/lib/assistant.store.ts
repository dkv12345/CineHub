import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { movies as seedMovies, type AIRecommendation } from '@cinehub/web/shared/util';

export interface MovieShowtimeItem {
  readonly id: string;
  readonly time: string;
  readonly date: string;
  readonly format?: string;
  readonly cinemaName?: string;
}

export interface ChatMovieCard {
  readonly id: string;
  readonly title: string;
  readonly synopsis?: string | null;
  readonly durationMin?: number | string | null;
  readonly ageRating?: string | null;
  readonly posterUrl?: string | null;
  readonly genres?: readonly string[];
  readonly rating?: number;
  readonly nextShowtimes?: readonly MovieShowtimeItem[];
}

export interface ChatShowtimeItem {
  readonly id: string;
  readonly time: string;
  readonly date: string;
  readonly format?: string;
  readonly movie?: { readonly id: string; readonly title: string };
  readonly cinema?: { readonly id: string; readonly name: string };
}

export interface ChatTurn {
  readonly id: number;
  readonly sender: 'user' | 'bot';
  readonly text: string;
  readonly createdAt: string;
  readonly movies?: readonly ChatMovieCard[];
  readonly showtimes?: readonly ChatShowtimeItem[];
  readonly quickReplies?: readonly string[];
  readonly intent?: string;
  readonly category?: string;
}

export interface AssistantState {
  readonly isOpen: boolean;
  readonly sessionId: string | null;
  readonly messages: readonly ChatTurn[];
  readonly recommendations: readonly AIRecommendation[];
  readonly loading: boolean;
}

const initialState: AssistantState = {
  isOpen: false,
  sessionId: null,
  messages: [
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Mình là CineBot - AI Concierge của CineHub. Bạn muốn tìm phim theo gu, tra cứu suất chiếu rạp hay đặt vé hôm nay?',
      createdAt: 'Vừa xong',
      movies: seedMovies.slice(0, 2).map((m) => ({
        id: String(m.id),
        title: m.title,
        synopsis: m.synopsis,
        durationMin: parseInt(m.duration, 10) || 120,
        ageRating: m.age,
        posterUrl: m.poster,
        genres: [m.genre],
        rating: m.rating,
        nextShowtimes: [
          {
            id: '1',
            time: '19:30',
            date: 'Hôm nay',
            format: '2D Phụ đề',
            cinemaName: 'Galaxy Nguyễn Du',
          },
          {
            id: '2',
            time: '21:45',
            date: 'Hôm nay',
            format: 'IMAX Laser',
            cinemaName: 'Galaxy Nguyễn Du',
          },
        ],
      })),
    },
  ],
  recommendations: seedMovies.slice(0, 4).map((m) => ({
    movieId: String(m.id),
    title: m.title,
    rating: m.rating,
    matchReason: ['Hợp gu điện ảnh của bạn', 'Đánh giá cao tại Galaxy Cinema'],
    posterUrl: m.poster,
  })),
  loading: false,
};

export const AssistantStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const http = inject(HttpClient);
    let nextMsgId = 2;

    return {
      toggleWidget(): void {
        patchState(store, { isOpen: !store.isOpen() });
      },

      async sendMessage(rawText: string): Promise<void> {
        const text = rawText.trim();
        if (!text) return;

        const userTurn: ChatTurn = {
          id: nextMsgId++,
          sender: 'user',
          text,
          createdAt: 'Vừa xong',
        };
        patchState(store, {
          messages: [...store.messages(), userTurn],
          loading: true,
        });

        try {
          const res = await firstValueFrom(
            http.post<{
              sessionId?: string;
              reply?: string;
              intent?: string;
              category?: string;
              movies?: ChatMovieCard[];
              showtimes?: ChatShowtimeItem[];
              quickReplies?: string[];
            }>('/api/v1/chatbot/message', {
              message: text,
              ...(store.sessionId() ? { sessionId: store.sessionId() } : {}),
            }),
          );
          const botTurn: ChatTurn = {
            id: nextMsgId++,
            sender: 'bot',
            text:
              res?.reply ?? 'CineBot đã nhận câu hỏi của bạn và tìm kiếm từ hệ thống rạp CineHub.',
            createdAt: 'Vừa xong',
            movies: res?.movies ?? [],
            showtimes: res?.showtimes ?? [],
            quickReplies: res?.quickReplies ?? [],
            intent: res?.intent,
            category: res?.category,
          };
          patchState(store, {
            sessionId: res?.sessionId ?? store.sessionId(),
            messages: [...store.messages(), botTurn],
            loading: false,
          });
        } catch {
          const fallbackMovies: ChatMovieCard[] = seedMovies.slice(0, 2).map((m) => ({
            id: String(m.id),
            title: m.title,
            synopsis: m.synopsis,
            durationMin: parseInt(m.duration, 10) || 120,
            ageRating: m.age,
            posterUrl: m.poster,
            genres: [m.genre],
            rating: m.rating,
            nextShowtimes: [
              {
                id: '1',
                time: '19:30',
                date: 'Hôm nay',
                format: '2D Phụ đề',
                cinemaName: 'Galaxy Nguyễn Du',
              },
              {
                id: '2',
                time: '21:15',
                date: 'Hôm nay',
                format: 'IMAX Laser',
                cinemaName: 'Galaxy Nguyễn Du',
              },
            ],
          }));

          const fallbackTurn: ChatTurn = {
            id: nextMsgId++,
            sender: 'bot',
            text: `CineBot: Với câu hỏi "${text}", mình gợi ý các phim và suất chiếu nổi bật hôm nay. Bạn có thể bấm chọn suất chiếu hoặc đặt vé ngay bên dưới:`,
            createdAt: 'Vừa xong',
            movies: fallbackMovies,
            intent: 'RECOMMEND',
            category: 'Search Movies',
          };
          patchState(store, {
            messages: [...store.messages(), fallbackTurn],
            loading: false,
          });
        }
      },

      async loadRecommendations(
        recentMovieIds: string[] = [],
        favoriteMovieIds: string[] = [],
      ): Promise<void> {
        try {
          const res = await firstValueFrom(
            http.post<{ data?: AIRecommendation[] }>('/api/v1/recommendations', {
              recentMovieIds,
              favoriteMovieIds,
            }),
          );
          if (Array.isArray(res?.data) && res.data.length > 0) {
            patchState(store, { recommendations: res.data });
          }
        } catch {
          // Keep default recommendations
        }
      },
    };
  }),
);
