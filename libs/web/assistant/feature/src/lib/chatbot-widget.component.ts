import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssistantStore, type ChatMovieCard } from '@cinehub/web/assistant/data-access';

@Component({
  selector: 'ch-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed right-3 bottom-3 sm:right-6 sm:bottom-6 z-50">
      @if (store.isOpen()) {
        <section
          cdkTrapFocus
          role="dialog"
          aria-label="Trợ lý đặt vé CineBot"
          class="flex h-[600px] max-h-[88vh] w-[calc(100vw-24px)] sm:w-[420px] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(229,9,20,0.25)] ring-1 ring-white/10 backdrop-blur-2xl transition-all duration-300"
        >
          <!-- Header -->
          <header
            class="flex items-center justify-between border-b border-slate-800/90 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 px-4 py-3.5 shadow-xs"
          >
            <div class="flex items-center gap-3">
              <div
                class="relative flex h-10 w-10 items-center justify-center rounded-full bg-white p-0.5 ring-1 ring-white/15 shadow-md"
              >
                <img
                  src="/images/cinebot-avatar.png"
                  alt="CineBot"
                  class="h-full w-full rounded-full object-cover"
                />
                <span class="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                  ></span>
                  <span
                    class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-slate-900"
                  ></span>
                </span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-extrabold tracking-wide text-white"
                    >CineBot Concierge</span
                  >
                  <span
                    class="rounded bg-gradient-to-r from-red-600 to-amber-500 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-white shadow-xs"
                  >
                    AI
                  </span>
                </div>
                <div class="text-[11px] font-medium text-slate-400">
                  Tra lịch chiếu & Đặt vé thông minh
                </div>
              </div>
            </div>
            <button
              type="button"
              (click)="store.toggleWidget()"
              aria-label="Đóng khung chat"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-700/80 hover:text-white"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- Messages Body -->
          <div
            #scrollContainer
            class="flex-1 space-y-4 overflow-y-auto bg-slate-950/90 p-4 text-xs scroll-smooth"
            aria-live="polite"
          >
            @for (msg of store.messages(); track msg.id) {
              <div
                class="flex flex-col gap-1.5"
                [class]="msg.sender === 'user' ? 'items-end' : 'items-start'"
              >
                <!-- Bubble -->
                <div
                  class="max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed shadow-md"
                  [class]="
                    msg.sender === 'user'
                      ? 'rounded-tr-sm bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium border border-red-500/30 shadow-red-950/40'
                      : 'rounded-tl-sm border border-slate-800 bg-slate-900/95 text-slate-100 shadow-slate-950/50 ring-1 ring-white/5'
                  "
                >
                  <p class="whitespace-pre-line leading-relaxed text-white">{{ msg.text }}</p>
                </div>

                <!-- Interactive Movie Cards -->
                @if (msg.movies && msg.movies.length > 0) {
                  <div class="w-full space-y-2.5 pt-1">
                    @for (movie of msg.movies; track movie.id) {
                      <div
                        class="rounded-xl border border-slate-800/90 bg-slate-900/95 p-3 shadow-lg ring-1 ring-white/5 transition-all duration-200 hover:border-amber-400/50 hover:shadow-amber-500/10"
                      >
                        <div class="flex gap-3">
                          <!-- Poster Thumbnail -->
                          <div
                            class="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-800 shadow-md ring-1 ring-white/10"
                          >
                            @if (movie.posterUrl) {
                              <img
                                [src]="movie.posterUrl"
                                [alt]="movie.title"
                                class="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                loading="lazy"
                              />
                            } @else {
                              <div
                                class="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] font-bold text-slate-400"
                              >
                                CineHub
                              </div>
                            }
                          </div>

                          <!-- Details -->
                          <div class="flex flex-1 flex-col justify-between min-w-0">
                            <div>
                              <div class="flex items-center gap-1.5">
                                @if (movie.ageRating) {
                                  <span
                                    class="inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                                    [class]="getAgeBadgeClass(movie.ageRating)"
                                  >
                                    {{ movie.ageRating }}
                                  </span>
                                }
                                <div
                                  class="font-extrabold text-white text-xs line-clamp-1 hover:text-amber-300 transition-colors"
                                >
                                  {{ movie.title }}
                                </div>
                              </div>

                              <div
                                class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400"
                              >
                                @if (movie.durationMin) {
                                  <span>{{ movie.durationMin }} phút</span>
                                }
                                @if (movie.genres && movie.genres.length > 0) {
                                  <span>• {{ movie.genres.join(', ') }}</span>
                                }
                                @if (movie.rating && movie.rating > 0) {
                                  <span
                                    class="inline-flex items-center gap-0.5 font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30"
                                  >
                                    ★ {{ movie.rating.toFixed(1) }}
                                  </span>
                                }
                              </div>

                              @if (movie.synopsis) {
                                <p
                                  class="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed"
                                >
                                  {{ movie.synopsis }}
                                </p>
                              }
                            </div>

                            <!-- Next Showtimes pills & One-click booking -->
                            <div
                              class="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80"
                            >
                              @if (movie.nextShowtimes && movie.nextShowtimes.length > 0) {
                                <div class="flex flex-wrap items-center gap-1">
                                  @for (st of movie.nextShowtimes; track st.id) {
                                    <button
                                      type="button"
                                      (click)="goToSeats(st.id)"
                                      [title]="
                                        'Đặt vé suất ' +
                                        st.time +
                                        ' (' +
                                        (st.cinemaName || '') +
                                        ')'
                                      "
                                      class="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold text-amber-300 transition-all hover:border-amber-400 hover:bg-amber-400 hover:text-black shadow-xs active:scale-95"
                                    >
                                      <span>{{ st.time }}</span>
                                      @if (st.format) {
                                        <span class="opacity-75 text-[9px]">{{ st.format }}</span>
                                      }
                                    </button>
                                  }
                                </div>
                              }

                              <!-- Quick Book Action Button -->
                              <button
                                type="button"
                                (click)="bookMovie(movie)"
                                class="ml-auto inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-red-950/40 transition-all active:scale-95"
                              >
                                <svg
                                  class="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2.2"
                                  aria-hidden="true"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                                  />
                                </svg>
                                <span>Đặt vé</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- Standalone Showtimes list -->
                @if (
                  (!msg.movies || msg.movies.length === 0) &&
                  msg.showtimes &&
                  msg.showtimes.length > 0
                ) {
                  <div class="w-full space-y-1.5 pt-1">
                    @for (st of msg.showtimes; track st.id) {
                      <div
                        class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-[11px] shadow-sm hover:border-slate-700"
                      >
                        <div>
                          <div class="font-bold text-white">
                            {{ st.movie?.title }}
                          </div>
                          <div class="text-[10px] text-slate-400">
                            {{ st.time }} • {{ st.date }} • {{ st.cinema?.name }}
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="goToSeats(st.id)"
                          class="rounded-lg bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition active:scale-95"
                        >
                          Chọn ghế
                        </button>
                      </div>
                    }
                  </div>
                }

                <!-- Contextual Dynamic Quick Replies -->
                @if (msg.sender === 'bot' && msg.quickReplies && msg.quickReplies.length > 0) {
                  <div class="flex flex-wrap items-center gap-1.5 pt-1">
                    @for (qr of msg.quickReplies; track qr) {
                      <button
                        type="button"
                        (click)="sendQuickPrompt(qr)"
                        class="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all shadow-xs active:scale-95"
                      >
                        {{ qr }}
                      </button>
                    }
                  </div>
                }
              </div>
            }

            @if (store.loading()) {
              <div
                class="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-amber-300 shadow-sm w-fit"
              >
                <div class="flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce"></span>
                  <span
                    class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.15s]"
                  ></span>
                  <span
                    class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.3s]"
                  ></span>
                </div>
                <span class="text-slate-300">CineBot đang tra cứu lịch chiếu & giá vé...</span>
              </div>
            }
          </div>

          <!-- Suggested Quick Chips -->
          <div
            class="flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 bg-slate-950/95 px-3.5 py-2.5 text-[11px] scrollbar-hide"
          >
            <button
              type="button"
              (click)="sendQuickPrompt('Phim nào đang chiếu hôm nay?')"
              class="shrink-0 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800 hover:text-amber-300 transition-all shadow-xs active:scale-95"
            >
              🎬 Đang chiếu
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Lịch chiếu tối nay tại rạp')"
              class="shrink-0 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800 hover:text-amber-300 transition-all shadow-xs active:scale-95"
            >
              🍿 Suất tối nay
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Gợi ý phim lãng mạn hợp đi hẹn hò')"
              class="shrink-0 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800 hover:text-amber-300 transition-all shadow-xs active:scale-95"
            >
              ❤️ Phim hẹn hò
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Bảng giá vé rạp Galaxy CineHub')"
              class="shrink-0 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800 hover:text-amber-300 transition-all shadow-xs active:scale-95"
            >
              🎟️ Bảng giá vé
            </button>
          </div>

          <!-- Input form -->
          <form
            (ngSubmit)="send()"
            class="flex items-center gap-2 border-t border-slate-800/80 bg-slate-950 p-3"
          >
            <div class="relative flex-1">
              <input
                type="text"
                [ngModel]="draft()"
                (ngModelChange)="draft.set($event)"
                name="chatDraft"
                placeholder="Hỏi phim đang chiếu, suất chiếu, giá vé..."
                aria-label="Tin nhắn cho CineBot"
                class="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
            <button
              type="submit"
              [disabled]="store.loading() || !draft().trim()"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-950/40 hover:from-red-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
            >
              <span>Gửi</span>
              <svg
                class="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </section>
      }

      <!-- Float Trigger Button (Shown when chat is closed) -->
      @if (!store.isOpen()) {
        <button
          type="button"
          (click)="store.toggleWidget()"
          aria-label="Mở trợ lý đặt vé CineBot"
          class="group flex items-center gap-3 rounded-full border border-red-500/40 bg-slate-950/90 px-4 py-2.5 text-xs font-bold text-white shadow-[0_10px_35px_rgba(229,9,20,0.4)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-red-500 hover:shadow-[0_15px_40px_rgba(229,9,20,0.6)] active:scale-95 ring-1 ring-white/10"
        >
          <span
            class="relative flex h-9 w-9 items-center justify-center rounded-full bg-white p-0.5 ring-1 ring-white/15 shadow-md"
          >
            <img
              src="/images/cinebot-avatar.png"
              alt="CineBot"
              class="h-full w-full rounded-full object-cover"
            />
            <span class="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </span>
          <div class="flex flex-col text-left">
            <span class="flex items-center gap-1.5 text-xs font-extrabold text-white">
              CineBot Concierge
              <span
                class="rounded bg-red-500/20 px-1 py-0.2 text-[9px] font-black tracking-wider text-red-400 border border-red-500/30"
                >AI</span
              >
            </span>
            <span class="text-[10px] text-slate-400 font-normal">Hỏi lịch chiếu & Đặt vé</span>
          </div>
        </button>
      }
    </div>
  `,
})
export class ChatbotWidgetComponent {
  readonly store = inject(AssistantStore);
  private readonly router = inject(Router);
  readonly draft = signal('');
  readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    await this.store.sendMessage(text);
    this.scrollToBottom();
  }

  async sendQuickPrompt(promptText: string): Promise<void> {
    this.draft.set('');
    await this.store.sendMessage(promptText);
    this.scrollToBottom();
  }

  goToSeats(showtimeId: string): void {
    if (!showtimeId) return;
    this.router.navigate(['/seats', showtimeId]);
    this.store.toggleWidget();
  }

  bookMovie(movie: ChatMovieCard): void {
    if (!movie?.id) return;
    if (movie.nextShowtimes && movie.nextShowtimes.length > 0) {
      this.goToSeats(movie.nextShowtimes[0].id);
    } else {
      this.router.navigate(['/movie', movie.id]);
      this.store.toggleWidget();
    }
  }

  getAgeBadgeClass(rating?: string | null): string {
    switch (rating) {
      case 'P':
        return 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300';
      case 'K':
        return 'border border-teal-500/40 bg-teal-500/20 text-teal-300';
      case 'T13':
        return 'border border-blue-500/40 bg-blue-500/20 text-blue-300';
      case 'T16':
        return 'border border-amber-500/40 bg-amber-500/20 text-amber-300';
      case 'T18':
        return 'border border-rose-500/40 bg-rose-500/20 text-rose-300';
      default:
        return 'border border-slate-700 bg-slate-800 text-slate-300';
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }
}
