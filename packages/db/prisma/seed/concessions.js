import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALAXY_FILE = path.resolve(__dirname, '../../../../data/seed/galaxy_concessions.json');

// Món lẻ do CineHub tự đặt (Galaxy chỉ trả về combo). Giá là giá MÔ PHỎNG.
// [externalId, name, category, price, description]
const CINEHUB_EXTRAS = [
  ['CINEHUB-POPCORN-M', 'Bắp rang bơ vừa', 'POPCORN', 45000, 'Bắp rang bơ vị ngọt, cỡ vừa'],
  ['CINEHUB-POPCORN-L', 'Bắp rang bơ lớn', 'POPCORN', 59000, 'Bắp rang bơ vị ngọt, cỡ lớn'],
  ['CINEHUB-POPCORN-CHEESE', 'Bắp phô mai lớn', 'POPCORN', 69000, 'Bắp phủ bột phô mai, cỡ lớn'],
  ['CINEHUB-PEPSI-M', 'Pepsi cỡ vừa', 'DRINK', 35000, 'Pepsi mát lạnh 22oz'],
  ['CINEHUB-PEPSI-L', 'Pepsi cỡ lớn', 'DRINK', 39000, 'Pepsi mát lạnh 32oz'],
  ['CINEHUB-WATER', 'Nước suối', 'DRINK', 20000, 'Nước suối đóng chai 500ml'],
  ['CINEHUB-SNACK-PREMIUM', 'Snack Premium', 'SNACK', 35000, 'Một gói snack Premium tuỳ chọn'],
];

// 4 combo giả do bản seed cũ tạo (không có externalId) -> tắt đi, không xoá để an toàn FK
const LEGACY_MOCK_NAMES = [
  'Combo Solo Classic',
  'Combo Couple Sweet',
  'Combo CineHub VIP Gold',
  'Combo Family Party',
];

const clean = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

function fromGalaxyPackage(pkg, index) {
  const externalId = clean(pkg.ticketTypeCode); // crawl có dấu cách thừa -> trim
  const name = clean(pkg.title || pkg.name).slice(0, 150);
  const price = Number(pkg.price);
  if (!externalId || !name || !Number.isInteger(price) || price <= 0) return null;

  return {
    externalId,
    name,
    description: clean(pkg.description).slice(0, 500) || null,
    category: 'COMBO',
    imageUrl: pkg.image || null,
    price,
    minSeats: Number(pkg.minSeats ?? 0),
    maxSeats: Number(pkg.maxSeats ?? 99),
    // "1006,1007" -> ["1006","1007"]; mảng rỗng = áp dụng mọi rạp
    cinemaApply: String(pkg.cinemaApply ?? '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean),
    sortOrder: index + 1,
  };
}

function fromExtra([externalId, name, category, price, description], index) {
  return {
    externalId,
    name,
    description,
    category,
    imageUrl: null,
    price,
    minSeats: 0,
    maxSeats: 99,
    cinemaApply: [],
    sortOrder: 100 + index,
  };
}

export async function seedConcessions(prisma, chainId) {
  let galaxyItems = [];
  if (fs.existsSync(GALAXY_FILE)) {
    const packages = JSON.parse(fs.readFileSync(GALAXY_FILE, 'utf-8'));
    galaxyItems = packages.map(fromGalaxyPackage).filter(Boolean);
  } else {
    console.warn(`   [WARN] Không thấy ${GALAXY_FILE}, bỏ qua combo Galaxy.`);
  }
  const items = [...galaxyItems, ...CINEHUB_EXTRAS.map(fromExtra)];

  // Dùng để cảnh báo nếu cinemaApply chứa mã rạp không có trong DB
  const cinemas = await prisma.cinema.findMany({
    where: { chainId },
    select: { externalId: true },
  });
  const knownCodes = new Set(cinemas.map((c) => c.externalId));
  const unknownCodes = new Set();

  for (const item of items) {
    for (const code of item.cinemaApply) {
      if (!knownCodes.has(code)) unknownCodes.add(code);
    }
    const { externalId, ...data } = item;
    await prisma.concession.upsert({
      where: { externalId },
      update: data,
      create: { ...data, externalId, chainId },
    });
  }

  const retired = await prisma.concession.updateMany({
    where: { chainId, externalId: null, name: { in: LEGACY_MOCK_NAMES } },
    data: { isActive: false },
  });

  console.log(
    `   -> Upserted ${items.length} concessions (${galaxyItems.length} Galaxy + ${CINEHUB_EXTRAS.length} CineHub), ` +
      `retired ${retired.count} legacy mock combos.`,
  );
  if (unknownCodes.size > 0) {
    console.warn(
      `   [WARN] cinemaApply có ${unknownCodes.size} mã rạp không có trong DB: ${[...unknownCodes].join(', ')}`,
    );
  }
}
