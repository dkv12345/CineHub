import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ch-age-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm"
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
        return 'border-rose-500/50 bg-rose-500/20 text-rose-300';
      case 'T16':
        return 'border-amber-400/50 bg-amber-400/20 text-amber-300';
      case 'T13':
        return 'border-blue-400/50 bg-blue-400/20 text-blue-300';
      case 'K':
      case 'P':
        return 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300';
      default:
        return 'border-white/20 bg-slate-800 text-white';
    }
  });
}
