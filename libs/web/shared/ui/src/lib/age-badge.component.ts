import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ch-age-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center rounded-[3px] border px-1.5 py-0.5 font-ui text-[11px] font-bold tracking-wider uppercase"
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
        return 'border-[#7C2638] bg-[#F3E9E7] text-[#7C2638]';
      case 'T16':
        return 'border-[#B28A50] bg-[#FDF8EE] text-[#845E1B]';
      case 'T13':
        return 'border-[#A07C45] bg-[#FAF4EA] text-[#785B28]';
      case 'K':
      case 'P':
        return 'border-[#2B7442] bg-[#EDF7F0] text-[#2B7442]';
      default:
        return 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]';
    }
  });
}
