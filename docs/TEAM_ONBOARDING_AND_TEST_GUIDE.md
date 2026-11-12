# CineHub - Hướng Dẫn Cài Đặt, Khởi Chạy & Kiểm Thử Toàn Bộ Hệ Thống

Tài liệu này dành cho thành viên trong team sau khi `git pull` từ nhánh `main` về máy cá nhân để cài đặt, thiết lập cơ sở dữ liệu, khởi chạy toàn bộ dịch vụ và kiểm thử đầy đủ các chức năng.

---

## 1. Yêu cầu môi trường (Prerequisites)

Trước khi bắt đầu, đảm bảo máy của bạn đã cài đặt các công cụ sau:

- **Node.js**: Phiên bản `>= 20.x` (khuyến nghị Node 20 LTS hoặc Node 22). Kiểm tra: `node -v`
- **npm**: Phiên bản `>= 10.x`. Kiểm tra: `npm -v`
- **Docker & Docker Compose**: Để chạy cụm MySQL, Redis, MongoDB.
  > ⚠️ **LƯU Ý QUAN TRỌNG TRÊN macOS**: Phải **mở ứng dụng Docker Desktop** (`/Applications/Docker.app`) và đợi icon cá voi trên thanh Menu bar đứng yên (Docker engine đã ready) trước khi chạy lệnh. Nếu Docker Desktop chưa được mở, terminal sẽ báo lỗi `failed to connect to the docker API at unix:///...docker.sock: connect: no such file or directory`.
- **Git**: Kiểm tra: `git -v`

---

## 2. Quy trình thiết lập ban đầu (Setup từ Main)

### Bước 2.1. Cập nhật mã nguồn mới nhất từ `main`

```bash
git checkout main
git pull origin main
```

### Bước 2.2. Khởi tạo file biến môi trường (`.env`)

Copy từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

> **Lưu ý**: Các thông số mặc định trong `.env.example` đã được cấu hình sẵn cho môi trường Local Development (MySQL port 3306, Redis port 6379, MongoDB port 27017, Backend port 4000). Bạn không cần chỉnh sửa nếu dùng cấu hình tiêu chuẩn của Docker Compose.

### Bước 2.3. Cài đặt các gói thư viện (Dependencies)

```bash
npm install
```

_(Lệnh này sẽ tự động cài đặt các workspace packages trong `apps/*`, `libs/*` và kích hoạt Git Hooks qua Husky)._

---

## 3. Khởi tạo Cơ sở dữ liệu & Nạp dữ liệu (Database & Seed)

CineHub sử dụng cụm đa cơ sở dữ liệu:

- **MySQL 8.4**: Lưu trữ quan hệ chính (Phim, Suất chiếu, Rạp, Phòng chiếu, Ghế, Đặt vé, Người dùng).
- **Redis 7**: Cơ chế khóa giữ chỗ ghế thời gian thực (Atomic Seat Lease) và Rate Limiting.
- **MongoDB 7**: Lưu trữ vector embedding cho AI Chatbot, hội thoại và lịch sử cào dữ liệu raw.

### Bước 3.1. Khởi động cụm Docker Containers

> Đảm bảo ứng dụng **Docker Desktop đã được mở** trên máy trước khi chạy lệnh này. Trên macOS, bạn có thể gõ `open -a Docker` để mở nhanh.

```bash
npm run infra:up
```

Kiểm tra trạng thái các container đang chạy:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

_(Đảm bảo cả 3 container `cinehub-mysql`, `cinehub-redis`, `cinehub-mongo` đều ở trạng thái `Up` hoặc `healthy`)._

### Bước 3.2. Chạy Migration cấu trúc bảng MySQL

```bash
npm run db:migrate
```

### Bước 3.3. Nạp dữ liệu mẫu cốt lõi (Seeding)

Nạp danh sách rạp, loại ghế, phòng chiếu, ma trận giá vé, combo bắp nước và tài khoản thử nghiệm:

```bash
npm run db:seed
```

### Bước 3.4. (Khuyến nghị) Cào phim & suất chiếu thực tế từ Galaxy Cinema

Để giao diện có đầy đủ hơn 50 phim mới nhất và hơn 2.400 suất chiếu thực tế theo ngày hiện tại:

```bash
npm run crawl:galaxy
```

_(Lệnh này tự động cào dữ liệu mới nhất từ Galaxy API, upsert vào MySQL và đồng bộ file catalog cache cho frontend)._

### Bước 3.5. Kiểm tra trực quan Cơ sở dữ liệu qua Prisma Studio (Cổng 5555)

```bash
npm run db:studio
```

Mở trình duyệt truy cập: **`http://localhost:5555`** để xem các bảng `Movie`, `Showtime`, `Cinema`, `Seat`, `Booking`...

---

## 4. Khởi chạy toàn bộ hệ thống (Run Development)

### Cách 1: Chạy đồng thời toàn bộ (Khuyến nghị)

```bash
npm run dev
```

_(Nx sẽ khởi chạy song song Backend Core API và Frontend Angular Web)._

### Cách 2: Chạy tách riêng 2 Terminal (Thuận tiện khi debug log)

- **Terminal 1 - Backend Core API (Port 4000)**:
  ```bash
  npm run dev:api
  ```
- **Terminal 2 - Frontend Angular Web (Port 4200)**:
  ```bash
  npm run dev:web
  ```

### Các đường dẫn truy cập cục bộ:

| Dịch vụ                       | Địa chỉ URL                        | Ghi chú                                   |
| :---------------------------- | :--------------------------------- | :---------------------------------------- |
| **Giao diện Web Frontend**    | `http://localhost:4200`            | Tự động proxy `/api` sang backend `:4000` |
| **Backend Core REST API**     | `http://localhost:4000/api/v1`     | Express 5 Modular Monolith                |
| **Kiểm tra sức khỏe Backend** | `http://localhost:4000/api/health` | Trả về trạng thái MySQL, Redis, Mongo     |
| **Prisma Studio (Database)**  | `http://localhost:5555`            | Quản trị dữ liệu trực quan                |

---

## 5. Danh mục Kiểm thử chức năng (Feature Test Checklist)

Sau khi hệ thống khởi chạy thành công, truy cập `http://localhost:4200` và kiểm tra các tính năng:

### 1. Trang chủ (`/`)

- [ ] **Carousel Banner**: Banner tự động chạy, có nút Next/Prev, click chuyển hướng đến chi tiết phim/lịch chiếu.
- [ ] **Thanh Mua vé nhanh (Quick Booking)**: Chọn Phim $\rightarrow$ Chọn Rạp $\rightarrow$ Chọn Ngày $\rightarrow$ Click _"Mua vé nhanh"_, điều hướng chính xác đến trang Lịch chiếu với bộ lọc phim đã chọn.
- [ ] **Tab Phim Đang chiếu / Sắp chiếu**: Hiển thị danh sách thẻ phim với điểm đánh giá, định dạng nhãn tuổi (P, K, T13, T16, T18).

### 2. Trang Lịch chiếu (`/showtimes`)

- [ ] **Timeline 5 ngày**: Chọn các ngày từ "Hôm nay", "Ngày mai" đến các ngày tiếp theo hoặc chọn "Tất cả các ngày".
- [ ] **Bộ lọc 4 tiêu chí**:
  - Lọc theo **Phim**: Dropdown hiển thị đầy đủ 54 phim; khi chọn phim có badge thông báo kèm nút `[✕]` xóa lọc nhanh.
  - Lọc theo **Tỉnh/Thành phố**: Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng...
  - Lọc theo **Định dạng**: 2D, 3D, IMAX Laser.
  - Tìm kiếm theo tên phim / tên rạp thời gian thực.
- [ ] **Empty State**: Nếu tìm kiếm một từ khóa không tồn tại, màn hình hiện thông báo thân thiện cùng nút bấm _"Xem tất cả suất chiếu"_ (click sẽ tự reset bộ lọc và tải lại đầy đủ).
- [ ] **Thẻ suất chiếu**: Hiển thị giờ chiếu, rạp chiếu, số ghế còn trống, nút _"Chọn ghế"_.

### 3. Trang Chi tiết Phim (`/movie/:id`)

- [ ] Hiển thị poster, backdrop, thông tin đạo diễn, dàn diễn viên, thời lượng, tóm tắt nội dung phim.
- [ ] Nút _"Xem trailer"_ mở modal video YouTube.
- [ ] Nút _"Mua vé ngay"_ điều hướng sang trang lịch chiếu của phim đó.

### 4. Đặt vé & Bản đồ Ghế 3D POV (`/seats/:sessionId`)

- [ ] Click suất chiếu từ trang Lịch chiếu để vào trang chọn ghế.
- [ ] **Bản đồ ghế 2D/3D (WebGL Three.js)**: Chọn loại ghế Thường (Standard), VIP, Ghế đôi (Sweetbox).
- [ ] **Cơ chế Seat Lease (Redis)**: Ghế vừa chọn được tạm giữ trong 15 phút, cập nhật tổng tiền tương ứng.

### 5. Chọn Bắp Nước & Thanh toán (`/booking/concessions` & `/booking/checkout`)

- [ ] Chọn các combo bắp nước (Combo Solo Classic, Combo Couple Sweet...).
- [ ] Kiểm tra trang tóm tắt hóa đơn, áp dụng voucher giảm giá (nếu có).
- [ ] Hoàn tất đặt vé $\rightarrow$ chuyển hướng trang vé của tôi.

### 6. Quản lý Vé của tôi (`/my-tickets`)

- [ ] Hiển thị danh sách vé đã đặt kèm mã vé.
- [ ] Xem mã QR bảo mật chống giả mạo (HMAC QR code) dùng để quét tại rạp.

### 7. Xác thực người dùng (Auth Flow)

- [ ] **Đăng ký tài khoản (`/auth/register`)**: Điền form đăng ký, nhận mã OTP 6 chữ số qua sandbox Mailtrap.
- [ ] **Xác thực email (`/auth/verify-email`)**: Nhập mã OTP để kích hoạt tài khoản.
- [ ] **Đăng nhập (`/auth/login`)**: Đăng nhập bằng email/password hoặc Google OAuth. Cơ chế JWT + Refresh Token Rotation tự động làm mới phiên đăng nhập ngầm qua cookie HTTP-only.

### 8. Trợ lý ảo AI CineBot Concierge

- [ ] Click vào icon CineBot ở góc dưới bên phải màn hình.
- [ ] Đặt câu hỏi tự nhiên về phim: _"Hôm nay có phim kinh dị nào chiếu không?"_, _"Gợi ý cho tôi phim hành động hay nhất"_.
- [ ] Chatbot trả lời thông minh dựa trên dữ liệu phim thực tế từ Gemini API.

---

## 6. Lệnh kiểm thử tự động & Đảm bảo chất lượng (Quality Assurance)

Trước khi tạo pull request hoặc đẩy code lên remote, hãy chạy các lệnh kiểm tra sau để đảm bảo không phát sinh lỗi:

### 6.1. Kiểm tra lỗi cú pháp & kiểu dữ liệu TypeScript (Toàn bộ dự án)

```bash
npx tsc -p tsconfig.json --noEmit
```

_(Đảm bảo trả về mã 0 và không có bất kỳ lỗi đỏ nào)._

### 6.2. Kiểm tra quy chuẩn mã nguồn (ESLint)

```bash
npm run lint
```

_(Dự án tuân thủ nghiêm ngặt tiêu chuẩn 0 errors, 0 warnings)._

### 6.3. Tự động định dạng mã nguồn (Prettier)

```bash
npm run format
```

### 6.4. Chạy Unit Tests & Integration Tests (Vitest)

```bash
# Chạy toàn bộ test suites
npm run test

# Hoặc chạy kiểm tra riêng module lịch chiếu (Showtimes)
npx vitest run libs/web/showtimes/
```

### 6.5. Chạy Kiểm thử End-to-End (Playwright)

```bash
npm run e2e
```

### 6.6. Kiểm tra Build Production (Angular & Express)

```bash
# Build toàn bộ monorepo
npm run build

# Hoặc chỉ build riêng ứng dụng web
npm run build:web
```

---

## 7. Bảng tra cứu các lệnh thường dùng (Quick Reference)

| Lệnh npm               | Chức năng chi tiết                                         |
| :--------------------- | :--------------------------------------------------------- |
| `npm run infra:up`     | Bật toàn bộ cụm Docker (MySQL, Redis, MongoDB)             |
| `npm run infra:down`   | Tắt cụm Docker                                             |
| `npm run db:migrate`   | Áp dụng Prisma schema migration                            |
| `npm run db:seed`      | Nạp dữ liệu mẫu ban đầu                                    |
| `npm run crawl:galaxy` | Cào phim & suất chiếu thực tế từ Galaxy Cinema             |
| `npm run db:studio`    | Mở giao diện xem Database tại `http://localhost:5555`      |
| `npm run dev`          | Khởi chạy đồng thời cả Backend (:4000) và Frontend (:4200) |
| `npm run dev:api`      | Chỉ chạy Backend Core API                                  |
| `npm run dev:web`      | Chỉ chạy Frontend Angular Web                              |
| `npm run test`         | Chạy toàn bộ Unit & Component Tests                        |
| `npm run lint`         | Quét kiểm tra lỗi Linting                                  |
| `npm run build`        | Đóng gói sản phẩm production                               |

---

## 8. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `"Không thể kết nối máy chủ."` trên giao diện web**:
   - Kiểm tra xem Backend Core API đã chạy chưa (`npm run dev:api`).
   - Kiểm tra xem Docker MySQL và Redis có đang hoạt động không (`docker compose -f infra/docker/docker-compose.yml ps`).

2. **Lỗi gạch đỏ đường dẫn `@cinehub/web/...` trong VS Code**:
   - Đảm bảo file `tsconfig.json` ở thư mục gốc tồn tại.
   - Trong VS Code, nhấn `F1` (hoặc `Cmd + Shift + P` trên macOS), gõ và chọn: `TypeScript: Restart TS Server`.

3. **Lỗi cổng 3306 hoặc 6379 đã bị chiếm dụng (Port Conflict)**:
   - Nếu bạn có cài MySQL hoặc Redis local trước đó, hãy tạm dừng service local hoặc kiểm tra tiến trình đang chiếm cổng: `lsof -i :3306`.

4. **Lỗi `failed to connect to the docker API... docker.sock` và `P1001: Can't reach database server at localhost:3306`**:
   - **Nguyên nhân**: Ứng dụng **Docker Desktop trên máy Mac chưa được mở**.
   - **Cách xử lý**:
     - Mở ứng dụng Docker Desktop trong Launchpad / Applications (hoặc gõ `open -a Docker` trong Terminal).
     - Đợi khoảng 10-15 giây cho icon cá voi trên Menu Bar đứng yên (Docker engine đã sẵn sàng).
     - Sau đó chạy lại: `npm run infra:up` $\rightarrow$ `npm run db:migrate` $\rightarrow$ `npm run db:seed`.
