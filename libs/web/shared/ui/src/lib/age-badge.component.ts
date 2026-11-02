import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ch-age-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold tracking-wider uppercase"
      [class]="badgeClasses()"
    >
      {{ age() }}
    </span>
  `,
})
export class AgeBadgeComponent {
  readonly age = input.required<string>();

  readonly badgeClasses = computed(() => {
    const rating = this.age().toUpperCase();
    switch (rating) {
      case 'T18':
      case 'C':
        return 'bg-rose-600/90 text-white border border-rose-400/40';
      case 'T16':
        return 'bg-orange-500/90 text-white border border-orange-300/40';
      case 'T13':
        return 'bg-amber-500/90 text-slate-950 border border-amber-300/40';
      case 'K':
        return 'bg-sky-500/90 text-white border border-sky-300/40';
      default:
        return 'bg-emerald-600/90 text-white border border-emerald-400/40';
    }
  });
}
