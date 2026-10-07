import { prisma } from '../src/index.js';

async function main() {
  console.log('🌱 Starting CineHub database seed...');

  // 1. Seat Types
  console.log('  -> Seeding Seat Types...');
  const seatTypes = [
    { code: 'STANDARD', name: 'Ghế thường', capacity: 1, colorHex: '#4b5563' },
    { code: 'VIP', name: 'Ghế VIP', capacity: 1, colorHex: '#eab308' },
    { code: 'SWEETBOX', name: 'Ghế đôi', capacity: 2, colorHex: '#ec4899' },
  ];
  for (const item of seatTypes) {
    await prisma.seatType.upsert({
      where: { code: item.code },
      update: { name: item.name, capacity: item.capacity, colorHex: item.colorHex },
      create: item,
    });
  }

  // 2. Ticket Types
  console.log('  -> Seeding Ticket Types...');
  const ticketTypes = [
    { code: 'ADULT', name: 'Người lớn', sortOrder: 1 },
    { code: 'STUDENT', name: 'HSSV', sortOrder: 2 },
    { code: 'CHILD', name: 'Trẻ em', sortOrder: 3 },
    { code: 'MEMBER', name: 'Thành viên', sortOrder: 4 },
  ];
  for (const item of ticketTypes) {
    await prisma.ticketType.upsert({
      where: { code: item.code },
      update: { name: item.name, sortOrder: item.sortOrder },
      create: item,
    });
  }

  // 3. Cinema Chains
  console.log('  -> Seeding Cinema Chains...');
  const chains = [
    {
      code: 'GALAXY',
      name: 'Galaxy Cinema',
      logoUrl: 'https://www.galaxycine.vn/media/logo.png',
      websiteUrl: 'https://www.galaxycine.vn',
    },
    {
      code: 'CGV',
      name: 'CGV Cinemas',
      logoUrl: 'https://www.cgv.vn/skin/frontend/cgv/default/images/cgvlogo.png',
      websiteUrl: 'https://www.cgv.vn',
    },
    {
      code: 'LOTTE',
      name: 'Lotte Cinema',
      logoUrl: 'https://lottecinemavn.com/logo.png',
      websiteUrl: 'https://lottecinemavn.com',
    },
    {
      code: 'BHD',
      name: 'BHD Star Cineplex',
      logoUrl: 'https://bhdstar.vn/logo.png',
      websiteUrl: 'https://bhdstar.vn',
    },
  ];
  for (const item of chains) {
    await prisma.cinemaChain.upsert({
      where: { code: item.code },
      update: { name: item.name, logoUrl: item.logoUrl, websiteUrl: item.websiteUrl },
      create: item,
    });
  }

  // 4. Provinces
  console.log('  -> Seeding Provinces...');
  const provinces = [
    { code: 'HCM', name: 'TP. Hồ Chí Minh', nameNormalized: 'ho chi minh' },
    { code: 'HN', name: 'Hà Nội', nameNormalized: 'ha noi' },
    { code: 'DN', name: 'Đà Nẵng', nameNormalized: 'da nang' },
    { code: 'HP', name: 'Hải Phòng', nameNormalized: 'hai phong' },
    { code: 'BD', name: 'Bình Dương', nameNormalized: 'binh duong' },
    { code: 'CT', name: 'Cần Thơ', nameNormalized: 'can tho' },
    { code: 'DNA', name: 'Đồng Nai', nameNormalized: 'dong nai' },
    { code: 'VT', name: 'Bà Rịa - Vũng Tàu', nameNormalized: 'ba ria - vung tau' },
    { code: 'AG', name: 'An Giang', nameNormalized: 'an giang' },
    { code: 'KH', name: 'Khánh Hòa', nameNormalized: 'khanh hoa' },
    { code: 'NA', name: 'Nghệ An', nameNormalized: 'nghe an' },
    { code: 'QN', name: 'Quảng Ninh', nameNormalized: 'quang ninh' },
    { code: 'TG', name: 'Tiền Giang', nameNormalized: 'tien giang' },
    { code: 'TN', name: 'Tây Ninh', nameNormalized: 'tay ninh' },
    { code: 'CM', name: 'Cà Mau', nameNormalized: 'ca mau' },
    { code: 'KG', name: 'Kiên Giang', nameNormalized: 'kien giang' },
    { code: 'BTR', name: 'Bến Tre', nameNormalized: 'ben tre' },
    { code: 'GL', name: 'Gia Lai', nameNormalized: 'gia lai' },
    { code: 'DL', name: 'Đắk Lắk', nameNormalized: 'dak lak' },
  ];
  for (const item of provinces) {
    await prisma.province.upsert({
      where: { code: item.code },
      update: { name: item.name, nameNormalized: item.nameNormalized },
      create: item,
    });
  }

  // 5. Genres
  console.log('  -> Seeding Genres...');
  const genres = [
    { slug: 'lang-man', name: 'Lãng Mạn' },
    { slug: 'hai', name: 'Hài' },
    { slug: 'hoat-hinh', name: 'Hoạt Hình' },
    { slug: 'hanh-dong', name: 'Hành Động' },
    { slug: 'kinh-di', name: 'Kinh Dị' },
    { slug: 'tam-ly', name: 'Tâm Lý' },
    { slug: 'phieu-luu', name: 'Phiêu Lưu' },
    { slug: 'vien-tuong', name: 'Viễn Tưởng' },
    { slug: 'toi-pham', name: 'Tội Phạm' },
    { slug: 'gia-dinh', name: 'Gia Đình' },
    { slug: 'am-nhac', name: 'Âm Nhạc' },
    { slug: 'chien-tranh', name: 'Chiến Tranh' },
    { slug: 'tai-lieu', name: 'Tài Liệu' },
  ];
  for (const item of genres) {
    await prisma.genre.upsert({
      where: { slug: item.slug },
      update: { name: item.name },
      create: item,
    });
  }

  // 6. Price Rules for Galaxy
  console.log('  -> Seeding Default Price Rules for Galaxy...');
  const galaxyChain = await prisma.cinemaChain.findUnique({ where: { code: 'GALAXY' } });
  if (galaxyChain) {
    const seatTypeRecords = await prisma.seatType.findMany();
    const ticketTypeRecords = await prisma.ticketType.findMany();
    const standardSeat = seatTypeRecords.find((s) => s.code === 'STANDARD');
    const vipSeat = seatTypeRecords.find((s) => s.code === 'VIP');
    const sweetboxSeat = seatTypeRecords.find((s) => s.code === 'SWEETBOX');

    const adultTicket = ticketTypeRecords.find((t) => t.code === 'ADULT');
    const studentTicket = ticketTypeRecords.find((t) => t.code === 'STUDENT');
    const childTicket = ticketTypeRecords.find((t) => t.code === 'CHILD');
    const memberTicket = ticketTypeRecords.find((t) => t.code === 'MEMBER');

    if (
      standardSeat &&
      vipSeat &&
      sweetboxSeat &&
      adultTicket &&
      studentTicket &&
      childTicket &&
      memberTicket
    ) {
      const priceRulesData = [
        // 2D STANDARD ROOM - WEEKDAY
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKDAY',
          price: 80000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: studentTicket.id,
          dayType: 'WEEKDAY',
          price: 65000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: childTicket.id,
          dayType: 'WEEKDAY',
          price: 60000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: memberTicket.id,
          dayType: 'WEEKDAY',
          price: 75000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKDAY',
          price: 95000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: studentTicket.id,
          dayType: 'WEEKDAY',
          price: 80000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: childTicket.id,
          dayType: 'WEEKDAY',
          price: 75000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: memberTicket.id,
          dayType: 'WEEKDAY',
          price: 90000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKDAY',
          price: 180000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: studentTicket.id,
          dayType: 'WEEKDAY',
          price: 160000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: childTicket.id,
          dayType: 'WEEKDAY',
          price: 150000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: memberTicket.id,
          dayType: 'WEEKDAY',
          price: 170000,
        },

        // 2D STANDARD ROOM - WEEKEND
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKEND',
          price: 95000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: studentTicket.id,
          dayType: 'WEEKEND',
          price: 80000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: childTicket.id,
          dayType: 'WEEKEND',
          price: 75000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: standardSeat.id,
          ticketTypeId: memberTicket.id,
          dayType: 'WEEKEND',
          price: 90000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKEND',
          price: 110000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: studentTicket.id,
          dayType: 'WEEKEND',
          price: 95000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: childTicket.id,
          dayType: 'WEEKEND',
          price: 90000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: vipSeat.id,
          ticketTypeId: memberTicket.id,
          dayType: 'WEEKEND',
          price: 105000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKEND',
          price: 210000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: studentTicket.id,
          dayType: 'WEEKEND',
          price: 190000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: childTicket.id,
          dayType: 'WEEKEND',
          price: 180000,
        },
        {
          format: 'TWO_D',
          roomTier: 'STANDARD',
          seatTypeId: sweetboxSeat.id,
          ticketTypeId: memberTicket.id,
          dayType: 'WEEKEND',
          price: 200000,
        },

        // 3D / IMAX
        {
          format: 'IMAX',
          roomTier: 'PREMIUM',
          seatTypeId: standardSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKDAY',
          price: 140000,
        },
        {
          format: 'IMAX',
          roomTier: 'PREMIUM',
          seatTypeId: vipSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKDAY',
          price: 160000,
        },
        {
          format: 'IMAX',
          roomTier: 'PREMIUM',
          seatTypeId: standardSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKEND',
          price: 170000,
        },
        {
          format: 'IMAX',
          roomTier: 'PREMIUM',
          seatTypeId: vipSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKEND',
          price: 190000,
        },

        // VIP Room Tier
        {
          format: 'TWO_D',
          roomTier: 'VIP',
          seatTypeId: vipSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKDAY',
          price: 150000,
        },
        {
          format: 'TWO_D',
          roomTier: 'VIP',
          seatTypeId: vipSeat.id,
          ticketTypeId: adultTicket.id,
          dayType: 'WEEKEND',
          price: 180000,
        },
      ];

      for (const rule of priceRulesData) {
        await prisma.priceRule.upsert({
          where: {
            chainId_format_roomTier_seatTypeId_ticketTypeId_dayType: {
              chainId: galaxyChain.id,
              format: rule.format,
              roomTier: rule.roomTier,
              seatTypeId: rule.seatTypeId,
              ticketTypeId: rule.ticketTypeId,
              dayType: rule.dayType,
            },
          },
          update: { price: rule.price },
          create: {
            chainId: galaxyChain.id,
            format: rule.format,
            roomTier: rule.roomTier,
            seatTypeId: rule.seatTypeId,
            ticketTypeId: rule.ticketTypeId,
            dayType: rule.dayType,
            price: rule.price,
          },
        });
      }
    }
  }

  // 7. Sample Vouchers
  console.log('  -> Seeding Sample Vouchers...');
  const vouchers = [
    {
      code: 'CINEHUB20',
      description: 'Giảm 20% tổng đơn hàng chào mừng thành viên mới',
      type: 'PERCENT',
      value: 20,
      maxDiscount: 50000,
      minOrderAmount: 100000,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      usageLimit: 1000,
      perUserLimit: 1,
    },
    {
      code: 'CINEHUB50K',
      description: 'Giảm trực tiếp 50.000đ cho đơn từ 200.000đ',
      type: 'FIXED',
      value: 50000,
      maxDiscount: 50000,
      minOrderAmount: 200000,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      usageLimit: 500,
      perUserLimit: 1,
    },
  ];
  for (const v of vouchers) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        description: v.description,
        value: v.value,
        maxDiscount: v.maxDiscount,
        minOrderAmount: v.minOrderAmount,
      },
      create: v,
    });
  }

  console.log('✅ CineHub database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
