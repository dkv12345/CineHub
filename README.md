# CineHub Monorepo

Nền tảng đặt vé xem phim toàn quốc kết hợp dữ liệu rạp Galaxy Cinema, chọn ghế trực quan 2D & mô phỏng góc nhìn 3D POV, chống double-booking bằng kiến trúc Polyglot Persistence (MySQL + Redis + MongoDB).

---

## 1. Cấu trúc thư mục Monorepo

```
cinehub/
├── apps/
│   └── web/                   # Frontend React (Vite + Tailwind v4 + Three.js POV)
├── services/
│   ├── core-api/              # Backend chính: Auth, Phim, Rạp, Lịch chiếu, Đặt vé, Thanh toán
│   ├── aggregator/            # Crawler Galaxy Cinema, chuẩn hoá DTO, nạp catalog
│   └── worker/                # Worker xử lý tác vụ nền BullMQ (nhả ghế, gửi email, outbox)
├── packages/
│   ├── db/                    # Prisma schema v3 (39 models, 27 enums), migrations, seed, client
│   └── shared/                # Zod schemas, hằng số nghiệp vụ và mã lỗi dùng chung
├── data/
│   ├── seed/                  # Dữ liệu chuẩn hoá nạp khởi tạo
│   └── raw/                   # Dữ liệu crawl thô (gitignore)
├── docs/
│   ├── database/              # Tài liệu thiết kế CSDL v3, diagram, SQL constraints
│   ├── api/                   # Tài liệu OpenAPI, Postman/Requestly
│   ├── data-sources/          # Ghi chú nguồn dữ liệu Galaxy Cinema
│   └── architecture/          # Sơ đồ Saga, Outbox, kiến trúc Polyglot
├── infra/
│   └── docker/                # File cấu hình phụ trợ container
├── .github/
│   ├── workflows/ci.yml       # GitHub Actions CI
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                    # Git pre-commit & commit-msg hooks
├── .vscode/                   # Thiết lập và extension khuyến nghị cho VS Code
├── docker-compose.yml         # MySQL 8.4, Redis 7, MongoDB 7
├── eslint.config.js           # Cấu hình Flat ESLint cho toàn bộ repo
├── commitlint.config.js       # Kiểm tra commit message theo Conventional Commits
├── .prettierrc                # Chuẩn format mã nguồn
├── .env.example               # Mẫu biến môi trường
└── package.json               # NPM Workspaces & kịch bản lệnh
```

---

## 2. Bảng Cổng Mặc Định

| Dịch vụ                | Cổng    | Ghi chú                                         |
| :--------------------- | :------ | :---------------------------------------------- |
| **Frontend (web)**     | `5173`  | Giao diện React + Vite                          |
| **Backend (core-api)** | `4000`  | REST API (Express 5)                            |
| **MySQL**              | `3306`  | Lưu trữ chính (ACID, Schema 39 bảng)            |
| **Redis**              | `6379`  | Cache, khoá ghế 15 phút, BullMQ queue           |
| **MongoDB**            | `27017` | Crawl raw payload, Review, AI Vector embeddings |

---

## 3. Khởi động nhanh cho thành viên mới (Onboarding)

### Bước 1: Cài đặt phụ thuộc

```bash
nvm use
npm install
```

### Bước 2: Thiết lập biến môi trường

```bash
cp .env.example .env
```

### Bước 3: Khởi động cơ sở hạ tầng (Docker Compose)

```bash
npm run infra:up
```

### Bước 4: Chạy Migration và Seed CSDL

```bash
npm run db:migrate
npm run db:seed
```

### Bước 5: Chạy ứng dụng chế độ phát triển

```bash
npm run dev
```

_Giao diện mở tại [http://localhost:5173](http://localhost:5173), API tại [http://localhost:4000](http://localhost:4000)._

---

## 4. Các lệnh kịch bản thường dùng

| Lệnh                   | Ý nghĩa                                                                              |
| :--------------------- | :----------------------------------------------------------------------------------- |
| `npm run dev`          | Chạy song song cả Backend (`core-api`) và Frontend (`web`)                           |
| `npm run dev:api`      | Chỉ chạy Backend `core-api` (với `node --watch`)                                     |
| `npm run dev:web`      | Chỉ chạy Frontend `web` (Vite dev server)                                            |
| `npm run crawl:galaxy` | Chạy job crawler dữ liệu từ Galaxy Cinema                                            |
| `npm run infra:up`     | Bật các container MySQL, Redis, MongoDB                                              |
| `npm run infra:down`   | Dừng các container cơ sở hạ tầng                                                     |
| `npm run db:migrate`   | Chạy Prisma migrate dev                                                              |
| `npm run db:seed`      | Nạp dữ liệu mẫu ban đầu (tỉnh thành, loại ghế, loại vé, bảng giá mặc định, vouchers) |
| `npm run db:studio`    | Mở giao diện trực quan Prisma Studio                                                 |
| `npm run db:validate`  | Kiểm tra cú pháp schema Prisma                                                       |
| `npm run lint`         | Chạy kiểm tra mã nguồn bằng ESLint                                                   |
| `npm run format`       | Định dạng code bằng Prettier                                                         |
| `npm run test`         | Chạy toàn bộ test suite trong workspaces với Vitest                                  |

---

## 5. Quy tắc Git & Commit

- Nhánh chính: `main` (production), `develop` (staging).
- Định dạng commit theo **Conventional Commits**:
  - `feat(scope): mô tả tính năng mới` (chữ thường, ví dụ: `feat(cinemas): thêm API danh sách rạp`)
  - `fix(scope): sửa lỗi`
  - `refactor(scope): tái cấu trúc code`
  - `chore: cập nhật cấu hình hoặc gói phụ thuộc`
  - `test: viết thêm hoặc sửa test`
  - `docs: chỉnh sửa tài liệu`
