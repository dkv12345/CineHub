import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssistantStore } from '@cinehub/web/assistant/data-access';

@Component({
  selector: 'ch-chatbot-widget',
  standalone: true,
  imports: [FormsModule, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed right-5 bottom-5 z-50">
      @if (store.isOpen()) {
        <section
          cdkTrapFocus
          role="dialog"
          aria-label="Trợ lý đặt vé CineBot"
          class="cinema-panel-raised mb-3 flex h-[460px] w-80 flex-col overflow-hidden shadow-xl sm:w-96"
        >
          <header
            class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-[var(--color-brand-primary)] font-display text-xs font-bold text-[#fffdf9]"
              >
                CB
              </span>
              <div>
                <div class="text-xs font-bold text-[var(--color-text-primary)]">
                  CineBot Concierge
                </div>
                <div class="text-[11px] text-[var(--color-text-secondary)]">
                  Trợ lý tư vấn lịch chiếu & chọn ghế
                </div>
              </div>
            </div>
            <button
              type="button"
              (click)="store.toggleWidget()"
              aria-label="Đóng khung chat"
              class="inline-flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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

          <div
            class="flex-1 space-y-3 overflow-y-auto bg-[var(--color-surface-secondary)] p-4 text-xs"
            aria-live="polite"
          >
            @for (msg of store.messages(); track msg.id) {
              <div class="flex" [class]="msg.sender === 'user' ? 'justify-end' : 'justify-start'">
                <div
                  class="max-w-[84%] rounded-[4px] border px-3.5 py-2.5 leading-relaxed shadow-2xs"
                  [class]="
                    msg.sender === 'user'
                      ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9] font-medium'
                      : 'border-[var(--color-border)] bg-[#ffffff] text-[var(--color-text-primary)]'
                  "
                >
                  {{ msg.text }}
                </div>
              </div>
            }
            @if (store.loading()) {
              <div class="text-xs font-semibold text-[var(--color-brand-primary)]">
                Đang tra cứu lịch chiếu từ hệ thống rạp...
              </div>
            }
          </div>

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
              class="cinema-input !min-h-[38px] !py-1.5 !text-xs"
            />
            <button
              type="submit"
              [disabled]="store.loading()"
              class="cinema-btn-primary !min-h-[38px] !px-3.5 !py-1.5 !text-xs font-bold"
            >
              Gửi
            </button>
          </form>
        </section>
      }

      <button
        type="button"
        (click)="store.toggleWidget()"
        aria-label="Mở trợ lý đặt vé CineBot"
        class="inline-flex items-center gap-2.5 rounded-[4px] border border-[var(--color-border)] bg-[#ffffff] px-4 py-2.5 text-xs font-bold text-[var(--color-brand-primary)] shadow-md transition-all hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]"
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
  readonly draft = signal('');

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    await this.store.sendMessage(text);
  }
}
