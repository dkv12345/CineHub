import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ShowtimeFilters } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-showtime-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="cinema-panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 shadow-2xs"
      role="search"
      aria-label="Bộ lọc lịch chiếu"
    >
      <div>
        <label for="filter-city" class="cinema-label">Tỉnh / Thành phố</label>
        <select
          id="filter-city"
          [value]="filters().cityId ?? 'all'"
          (change)="onSelectChange('cityId', $event)"
          class="cinema-input"
        >
          <option value="all">Toàn quốc (Tất cả cụm rạp)</option>
          @for (city of cities(); track city.id) {
            <option [value]="city.id">{{ city.name }}</option>
          }
        </select>
      </div>

      <div>
        <label for="filter-format" class="cinema-label">Định dạng phòng chiếu</label>
        <select
          id="filter-format"
          [value]="filters().format ?? 'all'"
          (change)="onSelectChange('format', $event)"
          class="cinema-input"
        >
          <option value="all">Mọi định dạng</option>
          <option value="2D">2D Digital Standard</option>
          <option value="3D">3D RealD Cinema</option>
          <option value="IMAX">IMAX Laser</option>
        </select>
      </div>

      <div>
        <label for="filter-search" class="cinema-label">Tìm kiếm phim hoặc rạp</label>
        <input
          id="filter-search"
          type="search"
          [value]="filters().searchQuery ?? ''"
          (input)="onSelectChange('searchQuery', $event)"
          placeholder="Nhập tên phim, cụm rạp..."
          class="cinema-input"
        />
      </div>

      <div class="flex items-end">
        <button type="button" (click)="resetClicked.emit()" class="cinema-btn-secondary w-full">
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  `,
})
export class ShowtimeFilterBarComponent {
  readonly filters = input.required<ShowtimeFilters>();
  readonly cities = input.required<ReadonlyArray<{ id: string; name: string }>>();
  readonly filterChanged = output<Partial<ShowtimeFilters>>();
  readonly resetClicked = output<void>();

  onSelectChange(key: keyof ShowtimeFilters, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    this.filterChanged.emit({ [key]: target?.value ?? '' });
  }
}
