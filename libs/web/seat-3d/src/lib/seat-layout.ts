export type SeatZone = 'normal' | 'vip' | 'sweetbox';

export interface SeatLayout {
  readonly rows: number;
  readonly columns: number;
  readonly aislesAfter: number[];
  readonly vipFromRow: number;
  readonly sweetbox: { row: number; from: number; to: number };
  readonly style: string;
}

export interface SeatCell {
  readonly id: string;
  readonly row: string;
  readonly rowIndex: number;
  readonly column: number;
  readonly zone: SeatZone;
  readonly sold: boolean;
  readonly selected: boolean;
}

export function layoutForCinema(cinema: string): SeatLayout {
  if (/galaxy/i.test(cinema)) {
    return {
      rows: 10,
      columns: 16,
      aislesAfter: [4, 12],
      vipFromRow: 4,
      sweetbox: { row: 9, from: 6, to: 11 },
      style: 'Galaxy Cinema · Âm thanh Dolby 7.1 · Sảnh Laser',
    };
  }
  if (/lotte/i.test(cinema)) {
    return {
      rows: 9,
      columns: 15,
      aislesAfter: [5, 10],
      vipFromRow: 5,
      sweetbox: { row: 7, from: 7, to: 10 },
      style: 'Lotte · 3 khu ghế · lối đi đôi',
    };
  }
  if (/bhd/i.test(cinema)) {
    return {
      rows: 8,
      columns: 18,
      aislesAfter: [6, 12],
      vipFromRow: 4,
      sweetbox: { row: 6, from: 8, to: 11 },
      style: 'BHD Star · 3 khu ghế · sảnh rộng',
    };
  }
  return {
    rows: 10,
    columns: 16,
    aislesAfter: [8],
    vipFromRow: 6,
    sweetbox: { row: 4, from: 7, to: 10 },
    style: 'Rạp phim · mô phỏng lối đi trung tâm',
  };
}

export function generateAuditoriumSeats(
  layout: SeatLayout,
  selectedIds: ReadonlySet<string>,
  seedKey = 'cinehub',
): SeatCell[] {
  const cells: SeatCell[] = [];
  let hash = 17;
  for (const ch of seedKey) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }

  for (let rowIndex = 0; rowIndex < layout.rows; rowIndex++) {
    const row = String.fromCharCode(65 + rowIndex);
    for (let columnIndex = 0; columnIndex < layout.columns; columnIndex++) {
      const number = columnIndex + 1;
      const zone: SeatZone =
        rowIndex === layout.sweetbox.row &&
        number >= layout.sweetbox.from &&
        number <= layout.sweetbox.to
          ? 'sweetbox'
          : rowIndex >= layout.vipFromRow
            ? 'vip'
            : 'normal';
      const id = `${row}${number}`;
      const sold =
        (rowIndex * 13 + columnIndex * 7 + (hash % 19)) % 11 === 0 && !selectedIds.has(id);

      cells.push({
        id,
        row,
        rowIndex,
        column: columnIndex,
        zone,
        sold,
        selected: selectedIds.has(id),
      });
    }
  }
  return cells;
}
