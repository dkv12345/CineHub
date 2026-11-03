import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<readonly ToastMessage[]>([]);

  readonly toasts = this.items.asReadonly();

  show(text: string, tone: ToastTone = 'info', durationMs = 3600): void {
    const id = this.nextId++;
    this.items.update((list) => [...list, { id, text, tone }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }
}
