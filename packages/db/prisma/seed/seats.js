const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CELL = 40; // khoảng cách giữa 2 cột/hàng (đơn vị toạ độ SVG)
const AISLE_GAP = 24; // lối đi dọc giữa phòng

// bands: [loại ghế, số hàng] theo thứ tự từ màn hình ra sau (A, B, C...)
// SWEETBOX: mỗi ghế đôi chiếm 2 cột -> `cols` phải là số chẵn
export const LAYOUTS = {
  STD_10x14: {
    cols: 14,
    aisleAfter: 7,
    bands: [
      ['STANDARD', 4],
      ['VIP', 5],
      ['SWEETBOX', 1],
    ], // 133 ghế / 140 chỗ
  },
  IMAX_12x16: {
    cols: 16,
    aisleAfter: 8,
    bands: [
      ['STANDARD', 4],
      ['VIP', 8],
    ], // 192 ghế / 192 chỗ
  },
  FOURDX_6x10: {
    cols: 10,
    aisleAfter: 5,
    bands: [['VIP', 6]], // 60 ghế (chưa có SeatType riêng cho 4DX)
  },
  VIP_5x8: {
    cols: 8,
    aisleAfter: null,
    bands: [['VIP', 5]], // 40 ghế – phòng VIP lounge
  },
  KIDS_6x10: {
    cols: 10,
    aisleAfter: 5,
    bands: [['STANDARD', 6]], // 60 ghế
  },
};

// Chọn layout theo dữ liệu phòng; fallback theo tên phòng phòng khi tier/format chưa chuẩn
export function pickLayoutCode({ name = '', tier, defaultFormat }) {
  if (defaultFormat === 'IMAX' || /imax/i.test(name)) return 'IMAX_12x16';
  if (defaultFormat === 'FOUR_DX' || /4dx/i.test(name)) return 'FOURDX_6x10';
  if (tier === 'KIDS' || /kids/i.test(name)) return 'KIDS_6x10';
  if (tier === 'VIP' || /vip|aqualis|laurus|lagom|romantico|harbor/i.test(name)) return 'VIP_5x8';
  return 'STD_10x14';
}

export function generateSeats(layoutCode) {
  const layout = LAYOUTS[layoutCode];
  if (!layout) throw new Error(`Layout không tồn tại: ${layoutCode}`);

  const seats = [];
  let rowIndex = 0;

  for (const [seatTypeCode, rowCount] of layout.bands) {
    for (let r = 0; r < rowCount; r++, rowIndex++) {
      const rowLabel = ROW_LETTERS[rowIndex];
      if (!rowLabel) throw new Error(`Layout ${layoutCode} vượt quá 26 hàng`);
      const posY = rowIndex * CELL;

      if (seatTypeCode === 'SWEETBOX') {
        // Ghế đôi: colNumber = cột bắt đầu, colSpan = 2, label "J1-2", "J3-4"...
        for (let col = 1; col + 1 <= layout.cols; col += 2) {
          seats.push({
            rowLabel,
            colNumber: col,
            label: `${rowLabel}${col}-${col + 1}`,
            seatTypeCode,
            colSpan: 2,
            posX: (col - 1) * CELL,
            posY,
          });
        }
      } else {
        for (let col = 1; col <= layout.cols; col++) {
          const gap = layout.aisleAfter && col > layout.aisleAfter ? AISLE_GAP : 0;
          seats.push({
            rowLabel,
            colNumber: col,
            label: `${rowLabel}${col}`,
            seatTypeCode,
            colSpan: 1,
            posX: (col - 1) * CELL + gap,
            posY,
          });
        }
      }
    }
  }
  return seats;
}

/**
 * Sinh Seat cho mọi Auditorium. Idempotent:
 * - Phòng đã đủ số ghế -> chỉ cập nhật metadata (layoutCode, totalSeats, totalCapacity).
 * - Phòng lệch số ghế -> xoá và tạo lại, trừ khi đã có ShowtimeSeat tham chiếu.
 * - RESEED_SEATS=1 ép tạo lại mọi phòng chưa bị tham chiếu.
 */
export async function seedSeats(prisma, seatTypeMap) {
  const force = process.env.RESEED_SEATS === '1';
  const auditoriums = await prisma.auditorium.findMany({
    select: { id: true, name: true, tier: true, defaultFormat: true },
  });

  const stats = { rebuilt: 0, skipped: 0, locked: 0, seats: 0 };
  const byLayout = {};

  for (const aud of auditoriums) {
    const layoutCode = pickLayoutCode(aud);
    const planned = generateSeats(layoutCode);
    const totalCapacity = planned.reduce(
      (sum, seat) => sum + seatTypeMap.get(seat.seatTypeCode).capacity,
      0,
    );
    const meta = { layoutCode, totalSeats: planned.length, totalCapacity, isLayoutMock: true };
    byLayout[layoutCode] = (byLayout[layoutCode] ?? 0) + 1;

    const existing = await prisma.seat.count({ where: { auditoriumId: aud.id } });
    if (existing === planned.length && !force) {
      await prisma.auditorium.update({ where: { id: aud.id }, data: meta });
      stats.skipped++;
      continue;
    }

    const inUse = await prisma.showtimeSeat.count({ where: { seat: { auditoriumId: aud.id } } });
    if (inUse > 0) {
      console.warn(`   [WARN] Phòng "${aud.name}" đã có ShowtimeSeat, giữ nguyên sơ đồ ghế.`);
      stats.locked++;
      continue;
    }

    await prisma.$transaction([
      prisma.seat.deleteMany({ where: { auditoriumId: aud.id } }),
      prisma.seat.createMany({
        data: planned.map(({ seatTypeCode, ...seat }) => ({
          ...seat,
          auditoriumId: aud.id,
          seatTypeId: seatTypeMap.get(seatTypeCode).id,
        })),
      }),
      prisma.auditorium.update({ where: { id: aud.id }, data: meta }),
    ]);
    stats.rebuilt++;
    stats.seats += planned.length;
  }

  console.log(
    `   -> ${auditoriums.length} auditoriums: rebuilt ${stats.rebuilt} (${stats.seats} seats), ` +
      `unchanged ${stats.skipped}, locked ${stats.locked}.`,
  );
  console.log(`   -> Layouts used: ${JSON.stringify(byLayout)}`);
}
