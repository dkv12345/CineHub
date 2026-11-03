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
          aria-label="Trợ lý AI CineBot"
          class="mb-3 flex h-[430px] w-80 flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-xl sm:w-96"
        >
          <header
            class="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-amber-500/20 to-rose-500/10 px-4 py-3"
          >
            <div class="flex items-center gap-2">
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-slate-950"
              >
                AI
              </span>
              <div>
                <div class="text-xs font-extrabold text-white">CineBot Gemini Assistant</div>
                <div class="text-[10px] text-emerald-400">
                  ● Đang trực tuyến (RAG + Vector Search)
                </div>
              </div>
            </div>
            <button
              type="button"
              (click)="store.toggleWidget()"
              aria-label="Đóng khung chat"
              class="rounded-lg p-1 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </header>

          <div class="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            @for (msg of store.messages(); track msg.id) {
              <div class="flex" [class]="msg.sender === 'user' ? 'justify-end' : 'justify-start'">
                <div
                  class="max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed"
                  [class]="
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-900 text-slate-200'
                  "
                >
                  {{ msg.text }}
                </div>
              </div>
            }
            @if (store.loading()) {
              <div class="text-xs text-amber-300 animate-pulse">
                CineBot đang tra cứu lịch chiếu...
              </div>
            }
          </div>

          <form
            (ngSubmit)="send()"
            class="flex items-center gap-2 border-t border-slate-800 bg-slate-900/90 p-3"
          >
            <input
              type="text"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
              name="chatDraft"
              placeholder="Hỏi phim hay, lịch chiếu, giá vé..."
              aria-label="Tin nhắn cho CineBot"
              class="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              [disabled]="store.loading()"
              class="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </section>
      }

      <button
        type="button"
        (click)="store.toggleWidget()"
        aria-label="Mở trợ lý AI CineBot"
        class="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-4 py-3 text-xs font-black text-slate-950 shadow-xl shadow-amber-500/25 transition hover:scale-105"
      >
        <span>✦ CineBot AI</span>
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
