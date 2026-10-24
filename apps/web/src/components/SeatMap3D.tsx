import type { SeatZone } from '../store';

export type SeatLayout = {
  rows: number;
  columns: number;
  aislesAfter: number[];
  vipFromRow: number;
  sweetbox: { row: number; from: number; to: number };
  style: string;
};

export type SeatCell = {
  id: string;
  row: string;
  rowIndex: number;
  column: number;
  zone: SeatZone;
  sold: boolean;
  selected: boolean;
};

export function layoutForCinema(cinema: string): SeatLayout {
  if (/galaxy/i.test(cinema))
    return {
      rows: 10,
      columns: 16,
      aislesAfter: [4, 12],
      vipFromRow: 4,
      sweetbox: { row: 9, from: 6, to: 11 },
      style: 'Galaxy Cinema · Âm thanh Dolby 7.1 · Sảnh Laser',
    };
  if (/lotte/i.test(cinema))
    return {
      rows: 9,
      columns: 15,
      aislesAfter: [5, 10],
      vipFromRow: 5,
      sweetbox: { row: 7, from: 7, to: 10 },
      style: 'Lotte · 3 khu ghế · lối đi đôi',
    };
  if (/bhd/i.test(cinema))
    return {
      rows: 8,
      columns: 18,
      aislesAfter: [6, 12],
      vipFromRow: 4,
      sweetbox: { row: 6, from: 8, to: 11 },
      style: 'BHD Star · 3 khu ghế · sảnh rộng',
    };
  return {
    rows: 10,
    columns: 16,
    aislesAfter: [8],
    vipFromRow: 6,
    sweetbox: { row: 4, from: 7, to: 10 },
    style: 'Rạp phim · mô phỏng lối đi trung tâm',
  };
}

type Props = {
  layout: SeatLayout;
  seats: SeatCell[];
  onChoose: (seat: SeatCell) => void;
};

export default function SeatMap3D({ layout, seats, onChoose }: Props) {
  const tracks = layout.columns + layout.aislesAfter.length;
  const byId = new Map(seats.map((seat) => [seat.id, seat]));

  return (
    <div className="seat-map-3d overflow-x-auto bg-transparent px-2 py-2 sm:px-4">
      <div className="mx-auto w-fit min-w-max [perspective:1100px]">
        {/* Khung sàn 3D dạng trong suốt */}
        <div className="relative mx-auto rounded-[45%_45%_18px_18px/12%_12%_18px_18px] border-x border-white/10 bg-transparent px-3 pb-7 pt-2 [transform:rotateX(14deg)] [transform-style:preserve-3d] sm:px-5">
          <div className="space-y-2 [transform-style:preserve-3d]">
            {Array.from({ length: layout.rows }, (_, rowIndex) => {
              const row = String.fromCharCode(65 + rowIndex);
              return (
                <div
                  key={row}
                  className="grid items-center gap-x-1.5"
                  style={{
                    gridTemplateColumns: `22px repeat(${tracks}, minmax(30px, 38px))`,
                    transform: `translateZ(${rowIndex - 3}px) scale(${1 + rowIndex * 0.006})`,
                    transformOrigin: 'center bottom',
                  }}
                >
                  {/* Tên hàng ghế màu trắng tinh bằng inline style */}
                  <span className="text-xs font-black" style={{ color: '#ffffff' }}>
                    {row}
                  </span>
                  {Array.from({ length: layout.columns }, (_, columnIndex) => {
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
                    const seat = byId.get(id) || {
                      id,
                      row,
                      rowIndex,
                      column: columnIndex,
                      zone,
                      sold: false,
                      selected: false,
                    };
                    const track =
                      columnIndex +
                      1 +
                      layout.aislesAfter.filter((after) => columnIndex >= after).length;

                    // Phối màu ghế tương phản nổi bật trên nền poster tối
                    const color = seat.sold
                      ? 'border-slate-700 bg-slate-800/80 text-slate-500'
                      : seat.selected
                        ? 'border-red-500 bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                        : zone === 'vip'
                          ? 'border-[#c48848] bg-[#dca762] text-slate-950 font-black'
                          : zone === 'sweetbox'
                            ? 'border-[#cc5c89] bg-[#e589ae] text-slate-950 font-black'
                            : 'border-[#7046c8] bg-[#8054d7] text-white';

                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={seat.sold}
                        aria-label={`Ghế ${id}, ${zone === 'vip' ? 'VIP' : zone === 'sweetbox' ? 'Sweetbox' : 'thường'}, ${seat.sold ? 'đã đặt' : seat.selected ? 'đang chọn' : 'trống'}`}
                        aria-pressed={seat.selected}
                        onClick={() => onChoose(seat)}
                        className={`seat-cell aspect-square min-w-[30px] rounded-t-[9px] rounded-b-[5px] border text-[9px] font-extrabold shadow-[0_4px_6px_rgba(0,0,0,0.5)] transition duration-150 hover:-translate-y-1 hover:shadow-[0_8px_12px_rgba(0,0,0,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
                        style={{ gridColumn: track + 2 }}
                      >
                        <span className="block -translate-y-px">{id}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] font-extrabold" style={{ color: '#fcd34d' }}>
          {layout.style}
        </p>
      </div>
    </div>
  );
}
