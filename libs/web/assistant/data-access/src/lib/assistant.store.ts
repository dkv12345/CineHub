import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { movies as seedMovies, type AIRecommendation } from '@cinehub/web/shared/util';

export interface ChatTurn {
  readonly id: number;
  readonly sender: 'user' | 'bot';
  readonly text: string;
  readonly createdAt: string;
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
      text: 'Xin chào! Mình là CineBot AI (Gemini RAG). Bạn muốn tìm phim hành động, kinh dị hay suất chiếu IMAX tối nay?',
      createdAt: 'Vừa xong',
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
            http.post<{ sessionId?: string; reply?: string }>('/api/v1/chatbot/message', {
              message: text,
              ...(store.sessionId() ? { sessionId: store.sessionId() } : {}),
            }),
          );
          const botTurn: ChatTurn = {
            id: nextMsgId++,
            sender: 'bot',
            text:
              res?.reply ??
              'CineBot gợi ý bạn xem thử Dune: Hành Tinh Cát hoặc Avengers tại phòng chiếu IMAX Laser!',
            createdAt: 'Vừa xong',
          };
          patchState(store, {
            sessionId: res?.sessionId ?? store.sessionId(),
            messages: [...store.messages(), botTurn],
            loading: false,
          });
        } catch {
          const fallbackTurn: ChatTurn = {
            id: nextMsgId++,
            sender: 'bot',
            text: `CineBot: Với câu hỏi "${text}", mình gợi ý các suất chiếu 2D & IMAX khung 19:45 tối nay tại Galaxy Cinema!`,
            createdAt: 'Vừa xong',
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
