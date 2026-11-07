import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.argv[2] || 'chautt1997@gmail.com';
const prisma = new PrismaClient();

async function main() {
  console.log(`\n🔍 Đang tìm tài khoản: ${email}...`);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true }
  });

  if (!existing) {
    console.log(`ℹ️  Không tìm thấy tài khoản nào với email: ${email}`);
    console.log(`👉 Bạn có thể đăng ký tài khoản mới ngay bây giờ trên http://localhost:4200/auth !\n`);
    return;
  }

  console.log(`👤 Tìm thấy: ${existing.fullName} (${existing.role}) - ID: ${existing.id}`);
  await prisma.user.delete({
    where: { email }
  });

  console.log(`✅ ĐÃ XOÁ THÀNH CÔNG tài khoản ${email} khỏi Database CineHub!`);
  console.log(`👉 Bây giờ bạn có thể quay lại http://localhost:4200/auth và bấm ĐĂNG KÝ lại từ đầu.\n`);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi xoá dữ liệu:', err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
