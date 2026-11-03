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
    <div class="fixed right-5 bottom-5 z-50">
      @if (store.isOpen()) {
        <section
          cdkTrapFocus
          role="dialog"
          aria-label="Trợ lý đặt vé CineBot"
          class="cinema-panel-raised mb-3 flex h-[560px] w-84 sm:w-[420px] flex-col overflow-hidden shadow-2xl rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <!-- Header -->
          <header
            class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--color-brand-primary)] text-xs font-bold text-[#fffdf9] shadow-xs"
              >
                CB
              </span>
              <div>
                <div
                  class="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5"
                >
                  <span>CineBot Concierge</span>
                  <span
                    class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                  ></span>
                </div>
                <div class="text-[11px] text-[var(--color-text-secondary)]">
                  AI Concierge • Tra lịch chiếu & Đặt vé thông minh
                </div>
              </div>
            </div>
            <button
              type="button"
              (click)="store.toggleWidget()"
              aria-label="Đóng khung chat"
              class="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- Messages Body -->
          <div
            #scrollContainer
            class="flex-1 space-y-3.5 overflow-y-auto bg-[var(--color-surface-secondary)] p-3.5 text-xs"
            aria-live="polite"
          >
            @for (msg of store.messages(); track msg.id) {
              <div
                class="flex flex-col gap-1.5"
                [class]="msg.sender === 'user' ? 'items-end' : 'items-start'"
              >
                <!-- Bubble -->
                <div
                  class="max-w-[90%] rounded-[6px] border px-3.5 py-2.5 leading-relaxed shadow-2xs"
                  [class]="
                    msg.sender === 'user'
                      ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9] font-medium'
                      : 'border-[var(--color-border)] bg-[#ffffff] text-[var(--color-text-primary)]'
                  "
                >
                  <p class="whitespace-pre-line">{{ msg.text }}</p>
                </div>

                <!-- Interactive Movie Cards -->
                @if (msg.movies && msg.movies.length > 0) {
                  <div class="w-full space-y-2.5 pt-1">
                    @for (movie of msg.movies; track movie.id) {
                      <div
                        class="rounded-[6px] border border-[var(--color-border)] bg-[#ffffff] p-2.5 shadow-xs transition-all hover:border-[var(--color-brand-primary)]"
                      >
                        <div class="flex gap-2.5">
                          <!-- Poster Thumbnail -->
                          <div
                            class="relative h-20 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[var(--color-surface-secondary)]"
                          >
                            @if (movie.posterUrl) {
                              <img
                                [src]="movie.posterUrl"
                                [alt]="movie.title"
                                class="h-full w-full object-cover"
                                loading="lazy"
                              />
                            } @else {
                              <div
                                class="flex h-full w-full items-center justify-center text-[10px] font-bold text-[var(--color-text-secondary)]"
                              >
                                CineHub
                              </div>
                            }
                          </div>

                          <!-- Details -->
                          <div class="flex flex-1 flex-col justify-between">
                            <div>
                              <div class="flex items-center gap-1.5">
                                @if (movie.ageRating) {
                                  <span
                                    class="inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                                    [class]="getAgeBadgeClass(movie.ageRating)"
                                  >
                                    {{ movie.ageRating }}
                                  </span>
                                }
                                <div
                                  class="font-bold text-[var(--color-text-primary)] line-clamp-1"
                                >
                                  {{ movie.title }}
                                </div>
                              </div>

                              <div
                                class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)]"
                              >
                                @if (movie.durationMin) {
                                  <span>{{ movie.durationMin }} phút</span>
                                }
                                @if (movie.genres && movie.genres.length > 0) {
                                  <span>• {{ movie.genres.join(', ') }}</span>
                                }
                                @if (movie.rating && movie.rating > 0) {
                                  <span class="font-semibold text-amber-600"
                                    >★ {{ movie.rating.toFixed(1) }}</span
                                  >
                                }
                              </div>

                              @if (movie.synopsis) {
                                <p
                                  class="mt-1 text-[11px] text-[var(--color-text-secondary)] line-clamp-2"
                                >
                                  {{ movie.synopsis }}
                                </p>
                              }
                            </div>

                            <!-- Next Showtimes pills & One-click booking -->
                            <div
                              class="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border-subtle)]"
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
                                      class="inline-flex items-center gap-1 rounded-[3px] border border-[var(--color-brand-primary)] bg-[var(--color-brand-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-[#fffdf9] transition-colors"
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
                                class="ml-auto inline-flex items-center gap-1 rounded-[3px] bg-[var(--color-brand-primary)] px-2.5 py-1 text-[10px] font-bold text-[#fffdf9] hover:opacity-90 shadow-2xs transition-opacity"
                              >
                                <svg
                                  class="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
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
                        class="flex items-center justify-between rounded-[4px] border border-[var(--color-border)] bg-[#ffffff] px-2.5 py-1.5 text-[11px]"
                      >
                        <div>
                          <div class="font-bold text-[var(--color-text-primary)]">
                            {{ st.movie?.title }}
                          </div>
                          <div class="text-[10px] text-[var(--color-text-secondary)]">
                            {{ st.time }} • {{ st.date }} • {{ st.cinema?.name }}
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="goToSeats(st.id)"
                          class="rounded-[3px] bg-[var(--color-brand-primary)] px-2 py-1 text-[10px] font-bold text-[#fffdf9]"
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
                        class="rounded-[12px] border border-[var(--color-brand-primary)] bg-[var(--color-surface)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-[#fffdf9] transition-all shadow-2xs"
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
                class="flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-primary)]"
              >
                <span
                  class="inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)] animate-ping"
                ></span>
                <span>Đang kết nối database & tra cứu lịch chiếu CineHub...</span>
              </div>
            }
          </div>

          <!-- Suggested Quick Chips -->
          <div
            class="flex items-center gap-1.5 overflow-x-auto border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px]"
          >
            <button
              type="button"
              (click)="sendQuickPrompt('Phim nào đang chiếu hôm nay?')"
              class="shrink-0 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
            >
              🎬 Đang chiếu
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Lịch chiếu tối nay tại rạp')"
              class="shrink-0 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
            >
              🍿 Suất tối nay
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Gợi ý phim lãng mạn hợp đi hẹn hò')"
              class="shrink-0 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
            >
              ❤️ Phim hẹn hò
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Bảng giá vé rạp Galaxy CineHub')"
              class="shrink-0 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
            >
              🎟️ Giá vé
            </button>
          </div>

          <!-- Input form -->
          <form
            (ngSubmit)="send()"
            class="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <input
              type="text"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
              name="chatDraft"
              placeholder="Hỏi phim đang chiếu, suất chiếu, giá vé..."
              aria-label="Tin nhắn cho CineBot"
              class="cinema-input !min-h-[38px] !py-1.5 !text-xs flex-1"
            />
            <button
              type="submit"
              [disabled]="store.loading()"
              class="cinema-btn-primary !min-h-[38px] !px-3.5 !py-1.5 !text-xs font-bold shrink-0"
            >
              Gửi
            </button>
          </form>
        </section>
      }

      <!-- Float Trigger Button -->
      <button
        type="button"
        (click)="store.toggleWidget()"
        aria-label="Mở trợ lý đặt vé CineBot"
        class="inline-flex items-center gap-2.5 rounded-[6px] border border-[var(--color-border)] bg-[#ffffff] px-4 py-2.5 text-xs font-bold text-[var(--color-brand-primary)] shadow-lg transition-all hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]"
      >
        <svg
          class="h-4 w-4 text-[var(--color-brand-primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
        <span>CineBot Concierge</span>
      </button>
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
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'K':
        return 'bg-teal-100 text-teal-800 border border-teal-300';
      case 'T13':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'T16':
        return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'T18':
        return 'bg-rose-100 text-rose-800 border border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-300';
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
