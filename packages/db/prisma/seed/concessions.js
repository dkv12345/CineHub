import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALAXY_FILE = path.resolve(__dirname, '../../../../data/seed/galaxy_concessions.json');

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

export async function seedConcessions(prisma, chainId) {
  let galaxyItems = [];
  if (fs.existsSync(GALAXY_FILE)) {
    const packages = JSON.parse(fs.readFileSync(GALAXY_FILE, 'utf-8'));
    galaxyItems = packages.map(fromGalaxyPackage).filter(Boolean);
  } else {
    console.warn(`   [WARN] Không thấy ${GALAXY_FILE}, bỏ qua combo Galaxy.`);
  }
  // Dùng để cảnh báo nếu cinemaApply chứa mã rạp không có trong DB
  const cinemas = await prisma.cinema.findMany({
    where: { chainId },
    select: { externalId: true },
  });
  const knownCodes = new Set(cinemas.map((c) => c.externalId));
  const unknownCodes = new Set();

  for (const item of galaxyItems) {
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
  const retiredExtras = await prisma.concession.updateMany({
    where: { chainId, externalId: { startsWith: 'CINEHUB-' } },
    data: { isActive: false },
  });

  console.log(
    `   -> Upserted ${galaxyItems.length} Galaxy concessions, retired ${retired.count} legacy mock combos ` +
      `and ${retiredExtras.count} CineHub extras.`,
  );
  if (unknownCodes.size > 0) {
    console.warn(
      `   [WARN] cinemaApply có ${unknownCodes.size} mã rạp không có trong DB: ${[...unknownCodes].join(', ')}`,
    );
  }
}
