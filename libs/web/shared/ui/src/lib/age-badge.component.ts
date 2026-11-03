import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ch-age-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center rounded-[2px] border px-1.5 py-0.5 font-ui text-[11px] font-semibold tracking-wider uppercase"
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
        return 'border-[#d77870]/60 bg-[#2a1615] text-[#f2c6c2]';
      case 'T16':
        return 'border-[#d3ac65]/60 bg-[#272012] text-[#ebd2a0]';
      case 'T13':
        return 'border-[#c2a16b]/60 bg-[#231e15] text-[#e5cfa6]';
      case 'K':
        return 'border-[#8fb49a]/50 bg-[#142219] text-[#cce0d2]';
      default:
        return 'border-[#39352f] bg-[#211f1c] text-[#f2eee6]';
    }
  });
}
