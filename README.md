# 🎬 CineHub – Nền Tảng Đặt Vé Xem Phim Toàn Quốc (Full-stack Monorepo)

> **CineHub** là nền tảng đặt vé xem phim trực tuyến hiện đại, hỗ trợ tra cứu lịch chiếu trực tiếp, chọn ghế trực quan với mô phỏng góc nhìn phòng chiếu **3D POV (Three.js)**, tích hợp **Trợ lý AI & Gợi ý phim cá nhân hóa (Google Gemini + Vector Search)**, combo bắp nước (Concessions), và đồng bộ dữ liệu thực tế từ **Galaxy Cinema** (43 phim, 31 rạp, hơn 3.500 suất chiếu) trên kiến trúc cơ sở dữ liệu Polyglot (MySQL + Redis + MongoDB).

---

## 📑 Mục lục

1. [Tính năng nổi bật](#1-tính-năng-nổi-bật)
2. [Công nghệ sử dụng & Kiến trúc hệ thống](#2-công-nghệ-sử-dụng--kiến-trúc-hệ-thống)
3. [Cấu trúc thư mục Monorepo](#3-cấu-trúc-thư-mục-monorepo)
4. [Bảng cổng dịch vụ (Port Mapping)](#4-bảng-cổng-dịch-vụ-port-mapping)
5. [Hướng dẫn cài đặt & Chạy dự án (Quickstart)](#5-hướng-dẫn-cài-đặt--chạy-dự-án-quickstart)
6. [Bảng lệnh NPM Scripts](#6-bảng-lệnh-npm-scripts)
7. [Quản lý Cơ sở dữ liệu (Prisma, Seed, Studio)](#7-quản-lý-cơ-sở-dữ-liệu-prisma-seed-studio)
8. [Quy chuẩn Git & Làm việc nhóm (Git Workflow)](#8-quy-chuẩn-git--làm-việc-nhóm-git-workflow)
9. [Xử lý sự cố thường gặp (Troubleshooting)](#9-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. 🌟 Tính năng nổi bật

- 🎟️ **Tra cứu lịch chiếu thông minh & Đặt vé đa rạp:** Đồng bộ trực tiếp hơn 3.500 suất chiếu thực tế từ Galaxy Cinema toàn quốc. Tìm kiếm và lọc theo tỉnh thành, cụm rạp, định dạng (2D, 3D, IMAX) và phụ đề/lồng tiếng.
- 💺 **Mô phỏng góc nhìn phòng chiếu 3D POV:** Sử dụng Three.js mô phỏng chân thực tầm nhìn từ vị trí từng ghế ngồi (Standard, VIP, Sweetbox) hướng lên màn chiếu lớn trước khi đưa ra quyết định đặt vé.
- 🤖 **Trợ lý ảo AI & Gợi ý phim thông minh:** Tích hợp mô hình ngôn ngữ **Google Gemini** kết hợp **Natural NLP (Tiếng Việt)** và **In-memory Vector Search** để tư vấn phim, tra cứu giá vé, rạp chiếu và đề xuất phim theo sở thích người dùng. Chi tiết xem tại [Tài liệu AI Chatbot](docs/ai/chatbot-and-recommendations.md).
- 🍿 **Chọn Combo Bắp Nước (Concessions):** Đặt trước bắp rang bơ, nước ngọt và các combo ưu đãi đi kèm vé với tính toán tổng tiền động.
- 👤 **Trang Cá nhân & Vé của tôi:** Quản lý thông tin tài khoản, xem lại danh sách vé đã mua kèm mã QR check-in tiện lợi, lưu trữ riêng biệt theo từng tài khoản (Account Isolation).
- ⚡ **Chống Double-Booking Đa Lớp:** Kết hợp khóa phân tán Redis (Redis Lock + Lua Script giữ ghế nguyên tử trong 15 phút) cùng cơ chế Database Transaction & Optimistic Locking trên MySQL.
- 🔄 **Cập nhật Live Showtimes 1-Click:** Lệnh `npm run sync:live` tự động vượt rào bảo mật API Galaxy, lấy toàn bộ suất chiếu mới nhất từ ngày hôm nay mà không bị đóng băng ngày cũ.

---

## 2. 🛠 Công nghệ sử dụng & Kiến trúc hệ thống

| Phân hệ              | Công nghệ / Thư viện                                | Vai trò & Mục đích                                                                               |
| :------------------- | :-------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Monorepo**         | **NPM Workspaces**                                  | Quản lý thống nhất Frontend, Backend Services và Shared Packages trong một kho mã nguồn duy nhất |
| **Frontend**         | **React 19 + Vite + Tailwind CSS v4 + Three.js**    | Giao diện hiện đại, tối ưu hiệu năng cao, hỗ trợ Dark Mode điện ảnh và mô phỏng phòng chiếu 3D   |
| **Backend API**      | **Node.js 20+ (ESM) + Express 5**                   | RESTful API chuẩn mực, xử lý đặt vé, xác thực người dùng (JWT/OAuth2), quản lý rạp và phim       |
| **AI & NLP**         | **Google Gemini API + Natural NLP + Vector Search** | Xử lý ngôn ngữ tự nhiên tiếng Việt, vector embeddings tra cứu thông tin phim và trợ lý ảo        |
| **CSDL Quan hệ**     | **MySQL 8.4 + Prisma ORM 6**                        | Nguồn sự thật duy nhất (Single Source of Truth) với 39 bảng quan hệ chặt chẽ và 27 ENUMs         |
| **Cache & Lock**     | **Redis 7 (AOF + Noeviction)**                      | Tăng tốc đọc dữ liệu, quản lý phiên giữ ghế tạm thời (15 phút) chống trùng lặp vé qua Lua script |
| **Crawler & NoSQL**  | **MongoDB 7**                                       | Lưu trữ payload crawl thô từ Galaxy Cinema, reviews và vector embeddings dự phòng                |
| **Xác thực dữ liệu** | **Zod (`@cinehub/shared`)**                         | Schema validation dùng chung xuyên suốt giữa Frontend và Backend                                 |
| **Chất lượng mã**    | **ESLint 9, Prettier, Husky, Commitlint, Vitest**   | Đảm bảo phong cách code nhất quán, tự động kiểm tra định dạng và chuẩn Conventional Commits      |

---

## 3. 📂 Cấu trúc thư mục Monorepo

```
cinehub/
├── apps/
│   └── web/                   # Frontend React (Vite + Tailwind v4 + Three.js POV Scene)
│       ├── src/
│       │   ├── components/    # Layout, Navbar, Footer, SeatMap3D, UI Components
│       │   ├── pages/         # Home, Movies, Showtimes, Seats, Concessions, Checkout, Profile, MyTickets
│       │   ├── services/      # API clients: sessionsApi, chatbotApi, concessionsApi, moviesApi...
│       │   └── store.tsx      # Quản lý trạng thái giỏ vé, auth và user state
├── services/
│   ├── core-api/              # Backend chính (Express 5 REST API)
│   │   ├── src/
│   │   │   ├── modules/       # Auth, Movies, Cinemas, Showtimes, Booking, Concessions, Chatbot, Recommendations
│   │   │   └── middleware/    # Auth, Validation, Error Handling
│   │   └── test/              # Unit & Integration tests cho Core API
│   ├── aggregator/            # Crawler & Adapter Galaxy Cinema (Security Handshake, ETL, Catalog Upsert)
│   └── worker/                # Worker BullMQ xử lý nhả ghế hết hạn và gửi email
├── packages/
│   ├── db/                    # Prisma schema v3 (39 models), migrations, seed scripts, Prisma Client
│   └── shared/                # Zod validation schemas, business constants và error codes dùng chung
├── data/
│   ├── seed/                  # Bộ dữ liệu mẫu chuẩn hoá (galaxy_normalized_v3.json)
│   └── raw/                   # Dữ liệu crawl thô từ nhà rạp (đã gitignore)
├── docs/
│   ├── GIT_WORKFLOW.md        # Cẩm nang quy trình làm việc Git chuẩn cho cả team (Không conflict)
│   ├── ai/                    # Tài liệu kiến trúc AI Chatbot & Hybrid Recommendation System
│   └── database/              # Thiết kế CSDL v3, schema diagram, migration notes
├── scripts/
│   └── sync-data.js           # Script đồng bộ trực tiếp 3.500+ suất chiếu mới vào web và DB
├── .env.example               # Mẫu khai báo biến môi trường chuẩn
├── docker-compose.yml         # Hạ tầng CSDL: MySQL 8.4, Redis 7, MongoDB 7
└── package.json               # Cấu hình NPM Workspaces & kịch bản lệnh Monorepo
```

---

## 4. 🔌 Bảng cổng dịch vụ (Port Mapping)

| Dịch vụ            | Cổng mặc định | Địa chỉ URL / Tham chiếu                                             | Mô tả                             |
| :----------------- | :------------ | :------------------------------------------------------------------- | :-------------------------------- |
| **Frontend Web**   | `5173`        | [http://localhost:5173](http://localhost:5173)                       | Giao diện người dùng CineHub      |
| **Core API**       | `4000`        | [http://localhost:4000/api/health](http://localhost:4000/api/health) | Backend RESTful API               |
| **Prisma Studio**  | `5555`        | [http://localhost:5555](http://localhost:5555)                       | Giao diện quản trị CSDL trực quan |
| **MySQL Database** | `3306`        | `localhost:3306` (`cinehub_root`)                                    | CSDL quan hệ chính                |
| **Redis Cache**    | `6379`        | `localhost:6379`                                                     | Quản lý khóa ghế & bộ nhớ đệm     |
| **MongoDB**        | `27017`       | `localhost:27017`                                                    | CSDL tài liệu NoSQL & raw payload |

---

## 5. 🚀 Hướng dẫn cài đặt & Chạy dự án (Quickstart)

### Yêu cầu tiên quyết

- **Node.js**: Phiên bản `>= 20.0.0` (Khuyên dùng `nvm use`).
- **NPM**: Phiên bản `>= 10.0.0`.
- **Docker & Docker Compose** (Hoặc MySQL 8.4 cài đặt trực tiếp trên máy).
- **Git**: Quản lý phiên bản mã nguồn.

---

### Quy trình 6 bước khởi động nhanh:

#### Bước 1: Clone repo và mở thư mục

```bash
git clone https://github.com/dkv12345/CineHub.git
cd CineHub
```

#### Bước 2: Cài đặt Dependencies toàn bộ Monorepo

```bash
npm install
```

_(Lệnh này tự động liên kết các workspace `apps/*`, `services/*`, `packages/*` và tạo sẵn Prisma Client)._

#### Bước 3: Tạo file cấu hình môi trường

```bash
cp .env.example .env
```

_(Nếu cần tuỳ chỉnh cổng hoặc tài khoản MySQL, chỉnh sửa trực tiếp trong file `.env` vừa tạo)._

#### Bước 4: Khởi động Cơ sở hạ tầng (Database Services)

- **Cách A (Khuyên dùng - Dùng Docker):**
  ```bash
  npm run infra:up
  ```
- **Cách B (Nếu bạn đã cài sẵn MySQL trên macOS/Linux):**
  Đảm bảo dịch vụ MySQL đang chạy trên cổng `3306` và mật khẩu khớp với `DATABASE_URL` trong `.env`.

#### Bước 5: Khởi tạo Database & Nạp dữ liệu mẫu (Seed)

```bash
# Áp dụng migration CSDL
npm run db:migrate

# Nạp dữ liệu khởi tạo (Phim, rạp, phòng chiếu, loại ghế, bảng giá)
npm run db:seed
```

#### Bước 6: Khởi chạy dự án

```bash
npm run dev
```

Bây giờ bạn có thể trải nghiệm ngay:

- 🌐 **Giao diện Web:** Mở trình duyệt tại **[http://localhost:5173](http://localhost:5173)**
- 🔍 **Trang Lịch chiếu:** Xem tại **[http://localhost:5173/showtimes](http://localhost:5173/showtimes)**
- 📊 **Quản lý CSDL (Prisma Studio):** Chạy `npm run db:studio` và truy cập **[http://localhost:5555](http://localhost:5555)**

---

## 6. 📜 Bảng lệnh NPM Scripts

Mọi kịch bản lệnh đều được chạy thuận tiện từ thư mục gốc Monorepo:

| Lệnh                   | Ý nghĩa & Mô tả chi tiết                                                                        |
| :--------------------- | :---------------------------------------------------------------------------------------------- |
| `npm run dev`          | Khởi chạy song song cả Core API (`:4000`) và Frontend Web (`:5173`)                             |
| `npm run dev:web`      | Chỉ khởi chạy riêng Frontend Vite Dev Server                                                    |
| `npm run dev:api`      | Chỉ khởi chạy riêng Core API kèm tính năng tự động reload (`--watch`)                           |
| `npm run sync:live`    | **Cập nhật nhanh 3.500+ suất chiếu mới nhất** từ Galaxy Cinema trực tiếp lên giao diện Frontend |
| `npm run crawl:galaxy` | Chạy job crawler lưu toàn diện vào CSDL MySQL và đồng bộ sang Frontend                          |
| `npm run infra:up`     | Bật các container Docker ngầm (MySQL, Redis, MongoDB)                                           |
| `npm run infra:down`   | Dừng các container cơ sở hạ tầng (dữ liệu vẫn an toàn trong Docker Volumes)                     |
| `npm run db:migrate`   | Áp dụng các thay đổi Prisma Schema vào CSDL MySQL                                               |
| `npm run db:seed`      | Nạp dữ liệu mẫu ban đầu từ `galaxy_normalized_v3.json`                                          |
| `npm run db:studio`    | Mở giao diện web quản trị cơ sở dữ liệu Prisma Studio trên cổng `5555`                          |
| `npm run db:validate`  | Kiểm tra cú pháp và tính hợp lệ của file `schema.prisma`                                        |
| `npm run lint`         | Chạy ESLint kiểm tra cú pháp và chất lượng mã nguồn                                             |
| `npm run format`       | Tự động định dạng toàn bộ mã nguồn theo chuẩn Prettier                                          |
| `npm test`             | Chạy bộ kiểm thử tự động (Unit & Integration tests) qua Vitest                                  |

---

## 7. 🗄 Quản lý Cơ sở dữ liệu (Prisma, Seed, Studio)

- **Vị trí file Schema chính:** [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)
- **Script nạp dữ liệu Seed:** [packages/db/prisma/seed.js](packages/db/prisma/seed.js)
- **Truy cập Prisma Client:** Mọi dịch vụ và script backend sử dụng chung package:
  ```js
  import { prisma } from '@cinehub/db';
  ```

### Quy trình khi sửa đổi Schema CSDL:

1. Chỉnh sửa mô hình bảng trong `packages/db/prisma/schema.prisma`.
2. Tạo và áp dụng migration mới:
   ```bash
   npm run db:migrate -- --name mo_ta_thay_doi
   ```
3. Khởi tạo lại Prisma Client:
   ```bash
   npm run generate -w @cinehub/db
   ```
4. Commit cả file `schema.prisma` và thư mục `packages/db/prisma/migrations/` vào Git.

---

## 8. 🌿 Quy chuẩn Git & Làm việc nhóm (Git Workflow)

Để toàn bộ thành viên làm việc trơn tru, **không bao giờ bị xung đột code (conflict)**, dự án áp dụng mô hình Feature Branch Workflow tiêu chuẩn:

> 📘 **Xem tài liệu chi tiết đầy đủ tại:** [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)

### Tóm tắt 5 bước chuẩn khi làm 1 Task:

1. **Trước khi làm:** Cập nhật `main` mới nhất:
   ```bash
   git checkout main && git pull origin main
   ```
2. **Tạo nhánh mới cho task:**
   ```bash
   git checkout -b feat/ten-tinh-nang
   ```
3. **Code và Commit thường xuyên:**
   ```bash
   git add . && git commit -m "feat(web): mo ta tinh nang"
   ```
4. **Chống conflict trước khi push:**
   ```bash
   git fetch origin && git rebase origin/main
   ```
5. **Đẩy lên GitHub và tạo Pull Request (PR):**
   ```bash
   git push -u origin feat/ten-tinh-nang
   ```
6. **Sau khi PR được merge:** Quay về `main`, kéo code mới và xoá nhánh cũ trên máy:
   ```bash
   git checkout main && git pull origin main && git branch -d feat/ten-tinh-nang
   ```

---

## 9. 🛠 Xử lý sự cố thường gặp (Troubleshooting)

### 1. Suất chiếu trên giao diện web bị hiện ngày cũ

- **Nguyên nhân:** Dữ liệu mẫu tĩnh trước đó bị đóng băng ngày cũ.
- **Khắc phục:** Mở Terminal và chạy lệnh sau để tải 3.500+ suất chiếu mới nhất từ hôm nay:
  ```bash
  npm run sync:live
  ```

### 2. Lỗi `Environment variable not found: DATABASE_URL`

- **Nguyên nhân:** Chưa sao chép file cấu hình `.env` ở thư mục gốc.
- **Khắc phục:** Chạy `cp .env.example .env`.

### 3. Lỗi chiếm cổng `EADDRINUSE: address already in use :::3306`

- **Nguyên nhân:** Máy tính của bạn đang chạy sẵn dịch vụ MySQL local khác.
- **Khắc phục:**
  - Nếu muốn dùng MySQL của Docker: Đổi cổng sang `3307:3306` trong `docker-compose.yml` và cập nhật `DATABASE_URL` trong `.env` thành `localhost:3307`.
  - Hoặc tắt service MySQL nội bộ trên máy: `brew services stop mysql` (macOS) hoặc `sudo systemctl stop mysql` (Linux).

### 4. Lỗi `@prisma/client did not initialize yet`

- **Khắc phục:** Chạy lệnh sinh client:
  ```bash
  npm run generate -w @cinehub/db
  ```

### 5. Husky hooks báo lỗi quyền thực thi trên macOS/Linux

- **Khắc phục:** Cấp quyền chạy file cho thư mục `.husky`:
  ```bash
  chmod +x .husky/*
  ```

---

<p align="center">
  <b>CineHub Monorepo</b> – Phát triển với ❤️ bởi đội ngũ kỹ sư CineHub.
</p>
