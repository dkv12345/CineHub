# 🎬 CineHub – Nền Tảng Đặt Vé Xem Phim Toàn Quốc (Monorepo)

> **CineHub** là nền tảng đặt vé xem phim trực tuyến hiện đại, hỗ trợ tra cứu lịch chiếu, chọn ghế trực quan 2D & mô phỏng góc nhìn phòng chiếu 3D POV (Three.js), tích hợp dữ liệu thực tế từ **Galaxy Cinema** (43 phim, 31 rạp, 3.289 suất chiếu) và kiến trúc cơ sở dữ liệu Polyglot (MySQL + Redis + MongoDB) với cơ chế chống double-booking đa lớp.

---

## 📑 Mục lục

1. [Công nghệ sử dụng & Quyết định kiến trúc](#1-công-nghệ-sử-dụng--quyết-định-kiến-trúc)
2. [Cấu trúc thư mục Monorepo](#2-cấu-trúc-thư-mục-monorepo)
3. [Bảng cổng dịch vụ (Port Mapping)](#3-bảng-cổng-dịch-vụ-port-mapping)
4. [Hướng dẫn cài đặt & Chạy dự án (Onboarding)](#4-hướng-dẫn-cài-đặt--chạy-dự-án-onboarding)
5. [Các kịch bản lệnh (NPM Scripts)](#5-các-kịch-bản-lệnh-npm-scripts)
6. [Quản lý Cơ sở dữ liệu (Prisma, Seed, Studio)](#6-quản-lý-cơ-sở-dữ-liệu-prisma-seed-studio)
7. [Chất lượng mã nguồn & Quy ước Git](#7-chất-lượng-mã-nguồn--quy-ước-git)
8. [Xử lý sự cố thường gặp (Troubleshooting)](#8-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Công nghệ sử dụng & Quyết định kiến trúc

| Hạng mục             | Công nghệ / Thư viện                              | Vai trò                                                                                 |
| :------------------- | :------------------------------------------------ | :-------------------------------------------------------------------------------------- |
| **Mô hình dự án**    | **NPM Workspaces** (Monorepo)                     | Quản lý chung Frontend, Backend Services và Shared Packages trong 1 repo duy nhất       |
| **Frontend**         | **React 19 + Vite + Tailwind CSS v4 + Three.js**  | Giao diện Single Page App, mô phỏng góc nhìn 3D POV phòng chiếu và sơ đồ ghế 2D         |
| **Backend API**      | **Node.js (ESM) + Express 5**                     | RESTful API cho đặt vé, xác thực (Auth), phim, rạp và thanh toán                        |
| **ORM / Database**   | **Prisma 6 + MySQL 8.4**                          | Nguồn sự thật (Single Source of Truth) với 39 bảng và 27 ENUMs                          |
| **Cache & Queue**    | **Redis 7 (AOF + Noeviction)**                    | Tăng tốc độ đọc, giữ khoá ghế 15 phút nguyên tử qua Lua script, hàng đợi BullMQ         |
| **Crawl & NoSQL**    | **MongoDB 7**                                     | Lưu trữ payload crawl thô từ Galaxy Cinema, dữ liệu đánh giá (reviews) và AI embeddings |
| **Xác thực dữ liệu** | **Zod** (`@cinehub/shared`)                       | Schema kiểm tra dữ liệu đầu vào dùng chung giữa Frontend và Backend                     |
| **Chất lượng code**  | **ESLint 9, Prettier, Husky, Commitlint, Vitest** | Tự động kiểm tra chất lượng code và commit message theo chuẩn Conventional Commits      |

---

## 2. Cấu trúc thư mục Monorepo

```
cinehub/
├── apps/
│   └── web/                   # Frontend React (Vite + Tailwind v4 + Three.js POV Scene)
├── services/
│   ├── core-api/              # Backend chính: Auth, Cinemas, Movies, Showtimes, Booking, Payment
│   ├── aggregator/            # Crawler & Adapter Galaxy Cinema (ETL, chuẩn hoá DTO, catalog upsert)
│   └── worker/                # Worker xử lý hàng đợi BullMQ (nhả ghế hết hạn, gửi email vé QR, outbox)
├── packages/
│   ├── db/                    # Prisma schema v3 (39 models, 27 enums), migrations, seed script, Prisma Client
│   └── shared/                # Zod schemas, hằng số nghiệp vụ (MAX_SEATS, SEAT_HOLD_SECONDS) và mã lỗi
├── data/
│   ├── seed/                  # Dữ liệu chuẩn hoá Galaxy (galaxy_normalized_v3.json)
│   └── raw/                   # Dữ liệu crawl thô (được gitignore)
├── docs/
│   ├── database/              # Tài liệu thiết kế CSDL v3, schema diagram, migration.sql
│   ├── api/                   # Tài liệu OpenAPI / Postman collection
│   └── data-sources/          # Ghi chú kỹ thuật nguồn Galaxy Cinema & scripts tham khảo
├── .github/
│   ├── workflows/ci.yml       # GitHub Actions CI (tự động kiểm tra lint, schema, test khi tạo PR)
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                    # Git Hooks: pre-commit (lint-staged) & commit-msg (commitlint)
├── .vscode/                   # Settings và danh sách Extensions khuyến nghị cho VS Code
├── docker-compose.yml         # MySQL 8.4 (utf8mb4), Redis 7 (AOF), MongoDB 7
├── eslint.config.js           # Flat ESLint cấu hình dùng chung toàn bộ Monorepo
├── commitlint.config.js       # Ràng buộc format commit Conventional Commits
├── .prettierrc & .prettierignore
├── .env.example               # Mẫu khai báo biến môi trường chuẩn
├── package.json               # Cấu hình NPM Workspaces & Scripts gốc
└── README.md                  # Tài liệu hướng dẫn này
```

---

## 3. Bảng cổng dịch vụ (Port Mapping)

| Dịch vụ           | Cổng mặc định           | Mô tả                                                           |
| :---------------- | :---------------------- | :-------------------------------------------------------------- |
| **Frontend Web**  | `http://localhost:5173` | Giao diện React người dùng                                      |
| **Core API**      | `http://localhost:4000` | Backend REST API (`/api/health`, `/api/cinemas`, v.v.)          |
| **Prisma Studio** | `http://localhost:5555` | Giao diện quản trị CSDL trực quan                               |
| **MySQL**         | `3306`                  | CSDL quan hệ chính (Username: `root`, Password: `cinehub_root`) |
| **Redis**         | `6379`                  | Cache & Quản lý khoá giữ ghế tạm thời                           |
| **MongoDB**       | `27017`                 | CSDL NoSQL (Username: `cinehub`, Password: `cinehub_pw`)        |

---

## 4. Hướng dẫn cài đặt & Chạy dự án (Onboarding)

### Yêu cầu môi trường

- **Node.js**: Phiên bản `>= 20.0.0` (Khuyến nghị dùng `nvm` hoặc `fnm`).
- **NPM**: Đi kèm Node.js (phiên bản `>= 10.0.0`).
- **Docker & Docker Compose**: Để chạy cụm CSDL local (MySQL, Redis, MongoDB).
- **Git**: Quản lý mã nguồn.

---

### Các bước khởi động (Chỉ với 6 lệnh)

#### Bước 1: Clone repo và di chuyển vào thư mục

```bash
git clone https://github.com/dkv12345/CineHub.git
cd CineHub
```

#### Bước 2: Cài đặt Node version & dependencies

```bash
nvm use
npm install
```

_(Lệnh `npm install` ở thư mục gốc sẽ tự động liên kết toàn bộ các gói trong `apps/*`, `services/*`, `packages/*` và khởi tạo Prisma Client)._

#### Bước 3: Tạo file cấu hình môi trường

```bash
cp .env.example .env
```

_(Nếu cần tuỳ chỉnh cổng hoặc mật khẩu, bạn có thể chỉnh sửa trực tiếp trong file `.env` vừa tạo)._

#### Bước 4: Khởi động cơ sở hạ tầng (Docker Compose)

```bash
npm run infra:up
```

_(Kiểm tra trạng thái container bằng lệnh: `docker compose ps`)_

#### Bước 5: Áp dụng CSDL & Nạp dữ liệu mẫu (Seed)

```bash
npm run db:migrate
npm run db:seed
```

_Lệnh `db:seed` sẽ tự động nạp toàn bộ 43 phim, 31 rạp Galaxy, 3.289 suất chiếu thực tế, các cụm rạp, tỉnh thành, thể loại, phòng chiếu, bảng giá và tài khoản admin._

#### Bước 6: Khởi chạy chế độ phát triển (Development)

```bash
npm run dev
```

🎉 **Hoàn tất!**

- Giao diện người dùng mở tại: **[http://localhost:5173](http://localhost:5173)**
- Backend API mở tại: **[http://localhost:4000/api/health](http://localhost:4000/api/health)**

---

## 5. Các kịch bản lệnh (NPM Scripts)

Mọi thao tác đều có thể chạy trực tiếp từ thư mục gốc của Monorepo:

| Lệnh                   | Mô tả chi tiết                                                                      |
| :--------------------- | :---------------------------------------------------------------------------------- |
| `npm run dev`          | Chạy song song cả Backend (`@cinehub/core-api`) và Frontend (`@cinehub/web`)        |
| `npm run dev:api`      | Chỉ chạy riêng Backend API với tính năng tự reload khi lưu file (`node --watch`)    |
| `npm run dev:web`      | Chỉ chạy riêng Frontend Vite Dev Server                                             |
| `npm run infra:up`     | Bật các container MySQL, Redis, MongoDB ngầm trong nền                              |
| `npm run infra:down`   | Dừng các container cơ sở hạ tầng (dữ liệu vẫn được giữ nguyên trong Docker Volumes) |
| `npm run db:migrate`   | Chạy Prisma Migrate trên MySQL                                                      |
| `npm run db:seed`      | Nạp dữ liệu mẫu toàn diện từ `galaxy_normalized_v3.json` vào database               |
| `npm run db:studio`    | Mở giao diện web Prisma Studio trực quan để xem và sửa dữ liệu                      |
| `npm run db:validate`  | Kiểm tra tính đúng đắn của cú pháp schema Prisma                                    |
| `npm run crawl:galaxy` | Chạy job crawler lấy dữ liệu mới nhất từ Galaxy Cinema                              |
| `npm run lint`         | Chạy ESLint kiểm tra lỗi logic và cú pháp cho toàn bộ dự án                         |
| `npm run format`       | Tự động định dạng toàn bộ mã nguồn theo chuẩn Prettier                              |
| `npm test`             | Chạy toàn bộ test suites trong mọi workspace qua Vitest                             |

---

## 6. Quản lý Cơ sở dữ liệu (Prisma, Seed, Studio)

- **Vị trí Schema**: [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)
- **Vị trí Seed script**: [packages/db/prisma/seed.js](packages/db/prisma/seed.js)
- **Truy cập Prisma Client dùng chung**: Mọi service và scripts backend chỉ cần:
  ```js
  import { prisma } from '@cinehub/db';
  ```

### Khi thay đổi Schema CSDL:

1. Chỉnh sửa file `packages/db/prisma/schema.prisma`.
2. Tạo migration mới:
   ```bash
   npm run db:migrate -- --name ten_thay_doi
   ```
3. Commit cả `schema.prisma` và thư mục `packages/db/prisma/migrations/` vào Git.

---

## 7. Chất lượng mã nguồn & Quy ước Git

### 7.1. Chuẩn Commit (Conventional Commits)

Repo sử dụng `husky` và `commitlint` để đảm bảo định dạng commit:

- `feat(scope): mô tả tính năng mới` (VD: `feat(auth): them api dang nhap local va jwt`)
- `fix(scope): mô tả sửa lỗi` (VD: `fix(seats): sua loi tinh toan toa do svg`)
- `refactor(scope): tái cấu trúc mã nguồn`
- `chore: công việc cấu hình, cập nhật dependencies`
- `test: thêm hoặc sửa unit tests`
- `docs: cập nhật tài liệu`

> **Lưu ý:** Phần mô tả commit không viết hoa chữ cái đầu và không có dấu chấm ở cuối (theo chuẩn commitlint).

### 7.2. Quy trình làm việc nhóm với Git

1. Luôn cập nhật code mới nhất từ nhánh `develop`:
   ```bash
   git switch develop
   git pull origin develop
   ```
2. Tạo nhánh tính năng mới theo số issue / tên tính năng:
   ```bash
   git switch -c feature/auth-login
   ```
3. Code, kiểm tra `npm test` và commit nhỏ. Pre-commit hook sẽ tự động chạy `eslint --fix` và `prettier --write` đối với các file bạn vừa sửa.
4. Push nhánh và mở Pull Request vào nhánh `develop`.

---

## 8. Xử lý sự cố thường gặp (Troubleshooting)

### 1. Lỗi `Environment variable not found: DATABASE_URL`

- **Nguyên nhân**: Chưa copy file `.env` ở thư mục gốc.
- **Khắc phục**: Chạy `cp .env.example .env`.

### 2. Lỗi `EADDRINUSE: address already in use :::3306` hoặc `:::5173` / `:::4000`

- **Nguyên nhân**: Cổng đang bị ứng dụng khác (ví dụ MySQL cài sẵn trên máy) chiếm dụng.
- **Khắc phục**:
  - Với MySQL: Mở `docker-compose.yml`, đổi cổng `ports: ["3307:3306"]` và sửa lại `DATABASE_URL=mysql://root:cinehub_root@localhost:3307/cinehub` trong file `.env`.
  - Với Core API: Đổi `PORT=4001` trong `.env` và đổi proxy trong `apps/web/vite.config.ts`.

### 3. Lỗi `@prisma/client did not initialize yet`

- **Khắc phục**: Chạy `npm run generate -w @cinehub/db` hoặc chạy `npm install` tại thư mục gốc.

### 4. Husky hooks báo lỗi quyền thực thi trên macOS/Linux

- **Khắc phục**: Chạy lệnh:
  ```bash
  chmod +x .husky/*
  ```

---

_CineHub – Xây dựng bởi đội ngũ phát triển CineHub._
