# CineHub – Tài liệu Thiết kế Cơ sở dữ liệu

Oct 7, 2026 · @vi · v3

## 1. Tổng quan & nguyên tắc thiết kế

CineHub dùng ba kho dữ liệu với vai trò tách bạch: MySQL (qua Prisma) là nguồn sự thật cho mọi thứ cần ACID, MongoDB giữ dữ liệu crawl, review và AI, Redis xử lý trạng thái tạm thời và tốc độ.

**Phạm vi đồ án:** CineHub crawl phim, rạp và suất chiếu từ Galaxy Cinema (API di động cho lịch chiếu, trang chi tiết phim cho thể loại và diễn viên), nên `CinemaChain.code = GALAXY`. Số ghế còn trống và đã đặt là dữ liệu mô phỏng nằm trong database của CineHub, vì nguồn trả `totalSeat` và `bookedSeat` luôn bằng 0. Giữ ghế, đặt vé và thanh toán sandbox là nghiệp vụ nội bộ. Bảng `CinemaChain` cho phép thêm CGV, Lotte, BHD mà không đổi schema.

| Dữ liệu                                                                | Nguồn                                                                                                 | Nơi lưu                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Phim: tên, poster, backdrop, trailer, thời lượng, độ tuổi              | Crawl Galaxy (feed suất chiếu)                                                                        | MongoDB (thô) → MySQL `Movie`, `MovieSource`            |
| Phim: mô tả, thể loại, đạo diễn, diễn viên, quốc gia                   | Crawl Galaxy (trang chi tiết phim)                                                                    | `Movie`, `Genre`, `Person`, `MovieCredit`               |
| Điểm đánh giá của nguồn (thang 10)                                     | Crawl Galaxy                                                                                          | `MovieSource.sourceScore` (tách khỏi `Movie.ratingAvg`) |
| Rạp: tên, địa chỉ, toạ độ, điện thoại, ảnh, tỉnh/thành, phường/xã      | Crawl Galaxy                                                                                          | `Cinema`, `Province`, `Ward`                            |
| Suất chiếu: giờ, định dạng, ngôn ngữ, loại suất (thường, encore, live) | Crawl Galaxy                                                                                          | `Showtime`                                              |
| Phòng chiếu                                                            | Tên phòng (`screenName`) crawl; hạng phòng suy ra từ tên                                              | `Auditorium` (`tier`)                                   |
| Giá vé                                                                 | Nguồn không cung cấp; dùng bảng giá mặc định theo định dạng, hạng phòng, loại ghế, loại vé, loại ngày | `PriceRule` → `ShowtimePrice` (`source = DEFAULT`)      |
| Sơ đồ ghế                                                              | Mô phỏng: CineHub sinh theo mẫu                                                                       | `Seat` (`Auditorium.isLayoutMock = true`)               |
| Ghế còn trống / đã bán                                                 | Mô phỏng: sinh kèm tỷ lệ đã bán giả lập                                                               | `ShowtimeSeat` (`isSeeded = true`)                      |
| Banner khuyến mãi                                                      | Crawl Galaxy nếu có, hoặc seed                                                                        | `Promotion`                                             |
| Bắp nước                                                               | Seed thủ công, hoặc crawl nếu có                                                                      | `Concession`                                            |
| Tài khoản, đơn, vé, thanh toán, review                                 | Phát sinh từ người dùng CineHub                                                                       | MySQL / MongoDB                                         |

| #   | Quyết định kiến trúc                                                           | Lý do                                                                                        |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Lịch chiếu chuẩn hoá (`Showtime`) nằm ở MySQL; dữ liệu crawl thô nằm ở MongoDB | Ghế và đơn hàng cần khoá ngoại + transaction với suất chiếu                                  |
| 2   | Khoá chính UUID v7                                                             | Không lộ số lượng bản ghi, sinh được ở service, có thứ tự thời gian nên giảm phân mảnh index |
| 3   | Tiền lưu số nguyên VND                                                         | Tránh sai số số thực; VND không có đơn vị lẻ                                                 |
| 4   | Ghế theo suất chiếu vật chất hoá thành `showtime_seats`                        | Khoá hàng + cột `version`, lấy sơ đồ ghế bằng 1 query                                        |
| 5   | MySQL là sự thật, Redis là bộ tăng tốc                                         | Mất Redis không làm mất đơn; có job đối soát                                                 |
| 6   | Outbox + Inbox cho event Saga                                                  | Giao event ít nhất một lần; consumer chống xử lý lặp bằng `InboxEvent`                       |
| 7   | Review ở MongoDB, điểm trung bình ở MySQL; điểm của nguồn lưu riêng            | `ratingAvg` chỉ tính từ review CineHub (thang 5), điểm Galaxy (thang 10) nằm ở `MovieSource` |
| 8   | Soft delete `User`, `Movie`; ẩn danh email khi xoá user                        | Phục vụ đối soát, vẫn giải phóng email để đăng ký lại                                        |
| 9   | Đăng nhập Local và Google                                                      | `authProvider`, `googleId`; `passwordHash` cho phép NULL với tài khoản chỉ dùng Google       |
| 10  | Giá vé sinh từ `PriceRule`                                                     | Nguồn Galaxy không công bố giá; `ShowtimePrice.source` ghi rõ giá mặc định hay crawl         |
| 11  | Vé QR không lưu token                                                          | Mã QR = HMAC của `ticketId` và `qrVersion`; lộ database không làm lộ vé                      |

**Nguyên tắc chung:** mỗi service chỉ ghi vào kho của mình; tham chiếu chéo bằng ID; không JOIN chéo database; đồng bộ bằng event.

## 2. Chiến lược Polyglot Persistence

Mỗi miền dữ liệu có đúng một kho là nguồn sự thật; kho còn lại chỉ là bản sao hoặc bộ đệm.

| Miền dữ liệu                                | Kho                                        | Service ghi                                                                | Lý do chọn                               |
| ------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------- |
| Tài khoản (Local, Google), token            | MySQL                                      | Core Booking & Auth                                                        | Quan hệ, bảo mật, ACID                   |
| Cụm rạp, rạp, phòng, sơ đồ ghế mẫu          | MySQL                                      | Core (rạp và tên phòng nạp từ Aggregator; sơ đồ ghế do Core sinh mô phỏng) | Là đầu của khoá ngoại                    |
| Phim, thể loại, diễn viên (phần lõi)        | MySQL                                      | Core (nạp từ Aggregator)                                                   | Liên kết suất chiếu, yêu thích           |
| Phim (metadata mở rộng: gallery, nguồn thô) | MongoDB                                    | Aggregator                                                                 | Schema thay đổi theo từng nguồn          |
| Suất chiếu, giá theo loại ghế               | MySQL                                      | Core (nạp từ Aggregator)                                                   | Join với ghế và đơn                      |
| Trạng thái ghế theo suất                    | MySQL (source of truth) + Redis (khoá tạm) | Core Booking                                                               | Chống đặt trùng                          |
| Đơn, vé, bắp nước, thanh toán, voucher      | MySQL                                      | Core Booking, Payment                                                      | ACID, đối soát tiền                      |
| Outbox / Inbox event                        | MySQL                                      | Core                                                                       | Cùng transaction với nghiệp vụ           |
| Dữ liệu crawl thô, log chạy crawl           | MongoDB (TTL)                              | Aggregator                                                                 | Linh hoạt, tự xoá                        |
| Review + vector embedding                   | MongoDB                                    | AI Service                                                                 | Vector search, văn bản dài               |
| Hồ sơ gu phim, lịch sử chat AI              | MongoDB                                    | AI Service                                                                 | Dạng document, đổi cấu trúc thường xuyên |
| Cache danh sách phim, bảng xếp hạng         | Redis                                      | Core, AI                                                                   | Đọc nhanh, mất được                      |
| Khoá ghế 15 phút                            | Redis                                      | Core Booking                                                               | `SET NX EX` nguyên tử                    |
| Hàng đợi job                                | Redis (BullMQ)                             | Worker                                                                     | Delayed job, retry                       |
| Rate limit, JWT blacklist, idempotency      | Redis                                      | Gateway, Payment                                                           | TTL tự nhiên                             |

**Đồng bộ Aggregator → Core (3 bước):**

1. Aggregator crawl Galaxy, chuẩn hoá bằng Adapter, ghi bản thô và `movie_metadata` vào MongoDB.
2. Aggregator gửi event `MovieSynced` / `ShowtimeSynced` (hoặc gọi API nội bộ của Core) kèm DTO chuẩn.
3. Core upsert vào MySQL theo `externalId` (ưu tiên) và `dedupKey` (dự phòng), rồi xoá cache Redis liên quan.

Cách này giữ đúng ranh giới service: chỉ Core ghi MySQL, chỉ Aggregator ghi dữ liệu crawl.

## 3. Quy ước chung

| Hạng mục                  | Quy ước                                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Khoá chính SQL            | `String @id @default(uuid(7)) @db.Char(36)`. Cần Prisma 5.18 trở lên để dùng `uuid(7)`. Cột khoá đặt collation `ascii_bin` bằng migration SQL thủ công (Prisma không khai báo được)                                                 |
| Khoá MongoDB              | `_id` là ObjectId. Tham chiếu sang SQL lưu chuỗi UUID ở trường `movieId`, `userId`                                                                                                                                                  |
| Đặt tên                   | Model PascalCase số ít; bảng snake\_case số nhiều qua `@@map`; field camelCase                                                                                                                                                      |
| Thời gian                 | Lưu UTC. `Showtime.localDate` lưu ngày chiếu theo giờ `Asia/Ho_Chi_Minh` để truy vấn nhanh theo ngày; FE đổi múi giờ khi hiển thị                                                                                                   |
| Tiền tệ                   | `Int`, đơn vị VND. Tính `subtotal`, `discount`, `total` ở backend                                                                                                                                                                   |
| Enum                      | Prisma enum (MySQL ENUM). Thêm giá trị mới = một migration                                                                                                                                                                          |
| Audit                     | `createdAt`, `updatedAt` trên mọi bảng có thay đổi; `deletedAt` cho `User`, `Movie`                                                                                                                                                 |
| Khoá ngoại                | `Restrict` cho mọi liên kết tài chính (Booking, Payment, ghế). `Cascade` chỉ cho token và ghế mẫu. Ba relation có CHECK đi kèm đặt thêm `onUpdate: Restrict` (MySQL báo lỗi 3823 nếu cột có CHECK mà FK dùng CASCADE hoặc SET NULL) |
| Snapshot                  | `BookingSeat`, `BookingConcession` lưu tên và giá tại lúc mua, không phụ thuộc bảng gốc                                                                                                                                             |
| Mã đơn                    | `CH` + `yymmdd` + 6 ký tự ngẫu nhiên, cột `code` unique                                                                                                                                                                             |
| Mã QR vé                  | `ticketId` + `.` + HMAC-SHA256(secret, `ticketId` + `qrVersion`) rút gọn. Không lưu token; tăng `qrVersion` để thu hồi hoặc làm mới QR                                                                                              |
| Optimistic lock           | Cột `version Int` trên `ShowtimeSeat`, `Booking`                                                                                                                                                                                    |
| Khoá chống trùng dạng cột | `BookingSeat.activeLock`, `Payment.successLock`: NULL = không giữ (MySQL cho phép nhiều NULL); chỉ set hoặc clear qua một hàm duy nhất                                                                                              |
| Voucher                   | `VoucherRedemption`: RESERVED khi áp mã, REDEEMED khi thanh toán xong, RELEASED khi đơn huỷ hoặc hết hạn                                                                                                                            |
| Chuẩn hoá tên             | `titleNormalized`, `Person.nameNormalized`, `Province.nameNormalized`: bỏ dấu, chữ thường; dùng làm khoá khớp khi crawl                                                                                                             |
| Khoá nguồn                | `externalId` là mã của nguồn Galaxy; `lastSyncedAt`, `lastSeenAt` ghi lần crawl cuối và lần cuối còn thấy                                                                                                                           |
| Charset                   | `utf8mb4`, collation `utf8mb4_unicode_ci` (tiếng Việt có dấu)                                                                                                                                                                       |
| Khoá Redis                | `{miền}:{thực thể}:{id}[:phụ]`, chữ thường, ngăn cách bằng `:`                                                                                                                                                                      |
| Bí mật                    | Chỉ lưu hash: `passwordHash` bằng bcrypt (NULL với tài khoản Google), `tokenHash` bằng SHA-256; không lưu token gốc                                                                                                                 |

## 4. Mô hình thực thể SQL

Schema gồm 39 bảng chia 8 nhóm; mọi quan hệ nhiều-nhiều đều qua bảng trung gian.

| Nhóm       | Thực thể                                                                                                                                                            | Vai trò                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Identity   | `User`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`                                                                                              | Đăng ký, đăng nhập (Local, Google), xoay vòng token, quên mật khẩu, xác thực email |
| Catalog    | `CinemaChain`, `Province`, `Ward`, `Cinema`, `Auditorium`, `TicketType`, `SeatType`, `Seat`, `Genre`, `Movie`, `MovieGenre`, `Person`, `MovieCredit`, `MovieSource` | Danh mục chuẩn hoá: phim và rạp từ crawl, ghế do CineHub sinh                      |
| Scheduling | `Showtime`, `PriceRule`, `ShowtimePrice`, `ShowtimeSeat`                                                                                                            | Suất chiếu, bảng giá mặc định, giá từng suất, trạng thái từng ghế (mô phỏng)       |
| Commerce   | `Concession`, `Booking`, `BookingSeat`, `BookingConcession`, `Ticket`                                                                                               | Bắp nước, đơn, ghế trong đơn, vé có QR                                             |
| Payment    | `Payment`, `PaymentWebhookEvent`, `Refund`                                                                                                                          | Giao dịch, idempotency webhook, hoàn tiền                                          |
| Promotion  | `Voucher`, `VoucherRedemption`, `Promotion`                                                                                                                         | Mã giảm giá và banner khuyến mãi                                                   |
| Engagement | `Favorite`, `MovieSubscription`, `NotificationLog`, `Notification`                                                                                                  | Yêu thích, đăng ký nhận thông báo phim, nhật ký gửi mail, thông báo trong app      |
| Platform   | `OutboxEvent`, `InboxEvent`                                                                                                                                         | Phát event đáng tin cậy và chống xử lý lặp                                         |

**Quan hệ chính:**

| Quan hệ                              | Bản số   | Ghi chú                                                                        |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| CinemaChain → Cinema                 | 1 – N    | Mỗi rạp thuộc một cụm                                                          |
| CinemaChain → PriceRule              | 1 – N    | Bảng giá mặc định theo cụm                                                     |
| CinemaChain → Promotion              | 0..1 – N | `chainId` trống nếu banner do CineHub tạo                                      |
| Province → Ward                      | 1 – N    | Địa chỉ Galaxy chỉ có phường, không có quận                                    |
| Province / Ward → Cinema             | 1 – N    | `wardId` có thể trống                                                          |
| Cinema → Auditorium                  | 1 – N    | Tên phòng lấy từ `screenName`                                                  |
| Cinema → Showtime                    | 1 – N    | `Showtime.cinemaId` denormalize từ Auditorium, bất biến                        |
| Cinema → User (STAFF)                | 1 – N    | `User.cinemaId`: rạp mà nhân viên được quét vé                                 |
| Auditorium → Seat                    | 1 – N    | Sinh từ mẫu sơ đồ; Sweetbox là 1 bản ghi với `colSpan = 2`                     |
| Movie ↔ Genre                        | N – M    | Qua `MovieGenre`                                                               |
| Movie ↔ Person                       | N – M    | Qua `MovieCredit` (DIRECTOR / ACTOR)                                           |
| Movie → MovieSource                  | 1 – N    | Mã, slug, URL và điểm của nguồn                                                |
| Movie → Showtime                     | 1 – N    |                                                                                |
| Auditorium → Showtime                | 1 – N    | Không trùng giờ trong cùng phòng                                               |
| Showtime → ShowtimePrice             | 1 – N    | Một giá cho mỗi cặp (loại ghế, loại vé)                                        |
| PriceRule → ShowtimePrice            | logic    | Không có khoá ngoại; Core tra `PriceRule` khi tạo suất rồi ghi `ShowtimePrice` |
| Showtime → ShowtimeSeat              | 1 – N    | Một dòng cho mỗi ghế của suất                                                  |
| Seat → ShowtimeSeat                  | 1 – N    | Mỗi (suất, ghế) tối đa 1 dòng                                                  |
| User → Booking                       | 1 – N    |                                                                                |
| Booking → BookingSeat                | 1 – N    | Tối đa 6 ghế mỗi đơn (kiểm ở service)                                          |
| ShowtimeSeat → BookingSeat           | 1 – N    | Giữ lịch sử; chỉ 1 dòng active nhờ `activeLock`                                |
| Booking → BookingConcession          | 1 – N    |                                                                                |
| BookingSeat → Ticket                 | 1 – 1    | Mỗi ghế một vé                                                                 |
| Booking → Payment                    | 1 – N    | Thử thanh toán lại; tối đa 1 payment thành công nhờ `successLock`              |
| Payment → Refund                     | 1 – N    |                                                                                |
| Booking → VoucherRedemption          | 0..1 – 1 | Nguồn duy nhất cho voucher của đơn                                             |
| Voucher → VoucherRedemption          | 1 – N    |                                                                                |
| User → RefreshToken                  | 1 – N    | Cả chuỗi xoay vòng chia sẻ một `familyId`                                      |
| User → Notification, NotificationLog | 1 – N    | Thông báo trong app và nhật ký gửi mail                                        |
| User ↔ Movie                         | N – M    | Qua `Favorite` và `MovieSubscription`                                          |

**Sơ đồ ERD dạng văn bản:**

```text
CinemaChain 1──N Cinema 1──N Auditorium 1──N Seat N──1 SeatType
     │              │  │          │
     │              │  │          └──N Showtime N──1 Movie
     │              │  └────────────N Showtime   (Showtime.cinemaId, denormalize)
     │              └──N User(STAFF)               (User.cinemaId)
     ├──N MovieSource N──1 Movie M──N Genre
     │                          M──N Person  (MovieCredit)
     ├──N PriceRule ··· tra khi tạo suất ···> ShowtimePrice
     └──0..N Promotion

Province 1──N Ward 1──N Cinema ; Province 1──N Cinema

Showtime 1──N ShowtimePrice N──1 SeatType, N──1 TicketType
Showtime 1──N ShowtimeSeat N──1 Seat

User 1──N Booking N──1 Showtime
Booking 1──N BookingSeat N──1 ShowtimeSeat ; BookingSeat 1──1 Ticket
Booking 1──N BookingConcession N──1 Concession
Booking 1──N Payment 1──N Refund
Booking 1──0..1 VoucherRedemption N──1 Voucher
User 1──N RefreshToken, PasswordResetToken, EmailVerificationToken
User 1──N Notification, NotificationLog ; User N──M Movie (Favorite, MovieSubscription)
OutboxEvent (phát) ──> InboxEvent (consumer ghi nhận, chống xử lý lặp)
```

## 5. Prisma schema hoàn chỉnh

File `prisma/schema.prisma` (v3) dùng MySQL 8.0.16 trở lên và Prisma 5.18 trở lên; mọi khoá ngoại khai báo `@db.Char(36)` để khớp kiểu với khoá chính. Phần đầu file ghi lịch sử thay đổi so với v2: mã G1 đến G9 là các phát hiện từ dữ liệu crawl Galaxy, kèm đăng nhập Google và bảng `Ward`. Schema chia làm hai khối code: khối 1 gồm enum, Identity và Catalog; khối 2 gồm Scheduling đến Platform.

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// CineHub – prisma/schema.prisma (v3)
// MySQL 8.0.16+ | Prisma >= 5.18 (uuid(7)) | 39 model, 8 nhóm
//
// v3 = v2 (đã áp dụng review mục 5) + Google Auth + Ward + dữ liệu crawl Galaxy.
// CHANGELOG v3 so với v2 (mã G* = phát hiện từ dữ liệu crawl Galaxy Cinema):
//   G1  Nguồn crawl là Galaxy Cinema (CinemaChain.code = GALAXY)
//   G2  Cinema: externalId = cinema.code của API (ổn định); + slug, sourceCityId,
//       sourceUrl, imageUrl, thumbnailUrl, galleryUrls, sortOrder, lastSyncedAt
//   G3  Auditorium: name = screenName của API; + tier (RoomTier), isLayoutMock
//   G4  Showtime: externalId = "{cinemaCode}-{sessionNo}"; + formatRaw, versionCode,
//       kind (REGULAR/ENCORE/LIVE), captionMode (SUBTITLED/DUBBED),
//       providerTotalSeats, providerBookedSeats
//   G5  ScreenFormat + DOLBY, LED; PriceRule + roomTier (phòng VIP giá khác)
//   G6  Movie.durationMin nullable (phim sắp chiếu chưa có thời lượng);
//       Movie.endDate (endDate của API); ageRating map từ movie.age
//   G7  MovieSource: + sourceSlug, sourceScore/sourceScoreScale/sourceVotes
//       (điểm 10 thang của nguồn tách khỏi ratingAvg 5 thang của CineHub)
//   G8  Promotion: startsAt/endsAt nullable; + chainId, dedupKey
//   G9  Ward thay District (địa chỉ Galaxy có "Phường …", không có quận)
//   Auth: AuthProvider, User.googleId, passwordHash nullable
//
// LƯU Ý MySQL: CHECK không dùng được trên cột có FK action CASCADE/SET NULL
// (lỗi 3823). Vì vậy 3 relation có CHECK đi kèm được đặt onUpdate: Restrict
// (BookingSeat.showtimeSeat, Payment.booking, ShowtimeSeat.heldByBooking).
// ═══════════════════════════════════════════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ═══════════ ENUMS ═══════════
enum AuthProvider {
  LOCAL
  GOOGLE
}

enum UserRole {
  CUSTOMER
  STAFF
  ADMIN
}

enum UserStatus {
  ACTIVE
  LOCKED
  DELETED
}

enum MovieStatus {
  COMING_SOON
  NOW_SHOWING
  ENDED
}

enum AgeRating {
  P
  K
  T13
  T16
  T18
  C // cấm phổ biến
}

enum ScreenFormat {
  TWO_D
  THREE_D
  IMAX
  FOUR_DX
  SCREENX
  DOLBY // Dolby Vision + Atmos
  LED // Onyx LED
}

enum RoomTier {
  STANDARD
  VIP // VIP – AQUALIS / LAURUS / LAGOM / ROMANTICO / X-HARBOR
  KIDS // Cine de Kids
  PREMIUM // Infinity Vision, Dolby, IMAX...
}

enum ShowtimeKind {
  REGULAR
  ENCORE // version "rebroadcast" – Phát Encore
  LIVE // version "live" – Phát Delayed Live
}

enum CaptionMode {
  SUBTITLED // caption = sub  (Phụ đề)
  DUBBED // caption = voice (Lồng tiếng)
}

enum CreditRole {
  DIRECTOR
  ACTOR
}

enum ShowtimeStatus {
  SCHEDULED // đã crawl, chưa mở bán
  OPEN // đang mở bán
  SOLD_OUT
  CANCELLED
  FINISHED
}

enum SeatState {
  AVAILABLE
  HELD
  SOLD
  BLOCKED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  EXPIRED
  PARTIALLY_REFUNDED
  REFUNDED
}

enum PaymentProvider {
  VNPAY
  ZALOPAY
  MOMO // ngoài phạm vi đồ án, giữ để mở rộng
}

enum PaymentStatus {
  INITIATED
  PENDING
  SUCCESS
  FAILED
  CANCELLED
  REFUNDED
}

enum RefundStatus {
  REQUESTED
  DONE
  FAILED
}

enum TicketStatus {
  VALID
  USED
  VOID
}

enum VoucherType {
  PERCENT
  FIXED
}

enum RedemptionStatus {
  RESERVED // đã chiếm lượt khi áp voucher
  REDEEMED // thanh toán thành công
  RELEASED // đơn hết hạn/huỷ, trả lượt
}

enum ConcessionCategory {
  COMBO
  POPCORN
  DRINK
  SNACK
}

enum NotificationType {
  TICKET_EMAIL
  MOVIE_RELEASE
  NEW_SHOWTIME
  BOOKING_CONFIRMED
  SHOWTIME_REMINDER
}

enum InboxType {
  MOVIE_RELEASE
  NEW_SHOWTIME
  BOOKING_CONFIRMED
  SHOWTIME_REMINDER
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

enum SeatDataSource {
  MOCK // ghế do CineHub mô phỏng
  PROVIDER // dự phòng: dữ liệu ghế thật từ nhà cung cấp sau này
}

enum PriceSource {
  CRAWLED
  DEFAULT // lấy từ PriceRule
  MANUAL
}

enum DayType {
  WEEKDAY
  WEEKEND
  HOLIDAY
}

enum OutboxStatus {
  PENDING
  PROCESSED
  FAILED
}

// ═══════════ IDENTITY ═══════════
model User {
  id              String       @id @default(uuid(7)) @db.Char(36)
  email           String       @unique @db.VarChar(255) // khi xoá: anonymize deleted+{id}@cinehub.invalid
  authProvider    AuthProvider @default(LOCAL)
  googleId        String?      @unique @db.VarChar(100) // sub của Google OAuth
  passwordHash    String?      @db.VarChar(255) // NULL với tài khoản chỉ đăng nhập Google
  fullName        String       @db.VarChar(120)
  phone           String?      @db.VarChar(20)
  avatarUrl       String?      @db.VarChar(500)
  role            UserRole     @default(CUSTOMER)
  status          UserStatus   @default(ACTIVE)
  cinemaId        String?      @db.Char(36) // chỉ dùng cho STAFF: rạp được phép quét vé
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  cinema            Cinema?                  @relation("CinemaStaff", fields: [cinemaId], references: [id])
  refreshTokens     RefreshToken[]
  resetTokens       PasswordResetToken[]
  emailVerifyTokens EmailVerificationToken[]
  bookings          Booking[]
  favorites         Favorite[]
  subscriptions     MovieSubscription[]
  redemptions       VoucherRedemption[]
  notificationLogs  NotificationLog[]
  notifications     Notification[]
  checkedTickets    Ticket[]                 @relation("TicketCheckin")

  @@index([role, status])
  @@index([cinemaId])
  @@map("users")
}

model RefreshToken {
  id           String    @id @default(uuid(7)) @db.Char(36)
  userId       String    @db.Char(36)
  familyId     String    @db.Char(36) // cả chuỗi xoay vòng chia sẻ 1 familyId
  tokenHash    String    @unique @db.Char(64) // SHA-256
  replacedById String?   @db.Char(36) // token mới thay thế (rotation)
  userAgent    String?   @db.VarChar(255)
  ip           String?   @db.VarChar(45)
  expiresAt    DateTime
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id        String    @id @default(uuid(7)) @db.Char(36)
  userId    String    @db.Char(36)
  tokenHash String    @unique @db.Char(64)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

model EmailVerificationToken {
  id        String    @id @default(uuid(7)) @db.Char(36)
  userId    String    @db.Char(36)
  tokenHash String    @unique @db.Char(64)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("email_verification_tokens")
}

// ═══════════ CATALOG ═══════════
model CinemaChain {
  id         String  @id @default(uuid(7)) @db.Char(36)
  code       String  @unique @db.VarChar(20) // GALAXY, CGV, LOTTE, BHD
  name       String  @db.VarChar(100)
  logoUrl    String? @db.VarChar(500)
  websiteUrl String? @db.VarChar(500)
  isActive   Boolean @default(true)

  cinemas      Cinema[]
  movieSources MovieSource[]
  concessions  Concession[]
  priceRules   PriceRule[]
  promotions   Promotion[]

  @@map("cinema_chains")
}

model Province {
  id             String @id @default(uuid(7)) @db.Char(36)
  code           String @unique @db.VarChar(20) // HCM, HN, DN... (một mã duy nhất cho mỗi tỉnh/thành)
  name           String @db.VarChar(100) // tên chuẩn: "TP. Hồ Chí Minh"
  nameNormalized String @unique @db.VarChar(100) // bỏ dấu, bỏ "TP."/"Tỉnh", lowercase – khớp "TP.HCM"/"TP. HCM"

  wards   Ward[]
  cinemas Cinema[]

  @@map("provinces")
}

model Ward {
  id         String @id @default(uuid(7)) @db.Char(36)
  provinceId String @db.Char(36)
  name       String @db.VarChar(100) // "Phường Thông Tây Hội" – tách từ địa chỉ rạp

  province Province @relation(fields: [provinceId], references: [id])
  cinemas  Cinema[]

  @@unique([provinceId, name])
  @@map("wards")
}

model Cinema {
  id           String    @id @default(uuid(7)) @db.Char(36)
  chainId      String    @db.Char(36)
  externalId   String    @db.VarChar(100) // Galaxy: cinema.code ("1001", "0000001005")
  slug         String?   @db.VarChar(120) // Galaxy: "galaxy-quang-trung" (đường dẫn /rap-gia-ve/{slug})
  name         String    @db.VarChar(200)
  address      String    @db.VarChar(500)
  provinceId   String    @db.Char(36)
  wardId       String?   @db.Char(36)
  latitude     Decimal?  @db.Decimal(9, 6)
  longitude    Decimal?  @db.Decimal(9, 6)
  phone        String?   @db.VarChar(20) // chuẩn hoá: bỏ khoảng trắng ("1900 2224" → "19002224")
  timezone     String    @default("Asia/Ho_Chi_Minh") @db.VarChar(50)
  sourceCityId String?   @db.VarChar(100) // Galaxy: cityId (UUID) của nguồn, giữ để đối chiếu
  sourceUrl    String?   @db.VarChar(500)
  imageUrl     String?   @db.VarChar(500) // imageLandscape
  thumbnailUrl String?   @db.VarChar(500) // imagePortrait
  galleryUrls  Json? // imageUrls[] (3–5 ảnh)
  sortOrder    Int       @default(99) // Galaxy: order (99 = chưa xếp)
  isActive     Boolean   @default(true)
  lastSyncedAt DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  chain       CinemaChain  @relation(fields: [chainId], references: [id])
  province    Province     @relation(fields: [provinceId], references: [id])
  ward        Ward?        @relation(fields: [wardId], references: [id])
  auditoriums Auditorium[]
  showtimes   Showtime[]
  concessions Concession[]
  staff       User[]       @relation("CinemaStaff")

  @@unique([chainId, externalId])
  @@unique([chainId, slug])
  @@index([provinceId, isActive])
  @@index([chainId, sortOrder])
  @@map("cinemas")
}

model Auditorium {
  id            String       @id @default(uuid(7)) @db.Char(36)
  cinemaId      String       @db.Char(36)
  name          String       @db.VarChar(50) // Galaxy: screenName ("RAP 5-DAISY", "IMAX with Laser", "VIP – LAURUS")
  tier          RoomTier     @default(STANDARD)
  defaultFormat ScreenFormat @default(TWO_D)
  totalSeats    Int          @default(0) // số bản ghi Seat
  totalCapacity Int          @default(0) // số chỗ ngồi thực (Sweetbox = 2)
  layoutCode    String?      @db.VarChar(30) // mã mẫu sơ đồ ghế do CineHub sinh
  isLayoutMock  Boolean      @default(true) // true = sơ đồ ghế do CineHub mô phỏng
  isActive      Boolean      @default(true)

  cinema    Cinema     @relation(fields: [cinemaId], references: [id], onDelete: Cascade)
  seats     Seat[]
  showtimes Showtime[]

  @@unique([cinemaId, name])
  @@map("auditoriums")
}

model TicketType {
  id        String  @id @default(uuid(7)) @db.Char(36)
  code      String  @unique @db.VarChar(20) // ADULT, STUDENT, CHILD, MEMBER
  name      String  @db.VarChar(60)
  sortOrder Int     @default(0)
  isActive  Boolean @default(true)

  prices       ShowtimePrice[]
  priceRules   PriceRule[]
  bookingSeats BookingSeat[]

  @@map("ticket_types")
}

model SeatType {
  id       String  @id @default(uuid(7)) @db.Char(36)
  code     String  @unique @db.VarChar(20) // STANDARD, VIP, SWEETBOX
  name     String  @db.VarChar(50)
  colorHex String? @db.VarChar(9)
  capacity Int     @default(1) // Sweetbox = 2 người

  seats          Seat[]
  priceRules     PriceRule[]
  showtimePrices ShowtimePrice[]

  @@map("seat_types")
}

model Seat {
  id           String  @id @default(uuid(7)) @db.Char(36)
  auditoriumId String  @db.Char(36)
  seatTypeId   String  @db.Char(36)
  rowLabel     String  @db.VarChar(3) // A, B, ... AA
  colNumber    Int
  label        String  @db.VarChar(8) // A5
  posX         Int // toạ độ vẽ SVG
  posY         Int
  colSpan      Int     @default(1)
  isActive     Boolean @default(true)

  auditorium    Auditorium     @relation(fields: [auditoriumId], references: [id], onDelete: Cascade)
  seatType      SeatType       @relation(fields: [seatTypeId], references: [id])
  showtimeSeats ShowtimeSeat[]

  @@unique([auditoriumId, rowLabel, colNumber])
  @@map("seats")
}

model Genre {
  id   String @id @default(uuid(7)) @db.Char(36)
  slug String @unique @db.VarChar(60) // lang-man, hai, hoat-hinh, hanh-dong...
  name String @db.VarChar(60)

  movies MovieGenre[]

  @@map("genres")
}

model Movie {
  id              String      @id @default(uuid(7)) @db.Char(36)
  slug            String      @unique @db.VarChar(200) // slug của nguồn (vd: trai-buon-nguoi); trùng thì thêm năm
  title           String      @db.VarChar(255)
  titleNormalized String      @db.VarChar(255) // bỏ dấu + lowercase, phục vụ gộp phim giữa các cụm
  originalTitle   String?     @db.VarChar(255)
  synopsis        String?     @db.Text
  durationMin     Int? // NULL với phim sắp chiếu chưa công bố thời lượng
  releaseDate     DateTime?   @db.Date // startDate của nguồn
  endDate         DateTime?   @db.Date // endDate của nguồn (hết lịch chiếu dự kiến)
  releaseYear     Int?
  ageRating       AgeRating? // map từ movie.age: 0→P, k→K, 13→T13, 16→T16, 18→T18
  status          MovieStatus @default(COMING_SOON)
  posterUrl       String?     @db.VarChar(500)
  backdropUrl     String?     @db.VarChar(500)
  trailerUrl      String?     @db.VarChar(500)
  language        String?     @db.VarChar(50)
  country         String?     @db.VarChar(60)
  ratingAvg       Decimal     @default(0) @db.Decimal(3, 2) // CHỈ từ review CineHub (thang 5), không lấy điểm nguồn
  ratingCount     Int         @default(0)
  mongoMetaId     String?     @db.VarChar(24) // ObjectId của movie_metadata
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?

  genres        MovieGenre[]
  credits       MovieCredit[]
  sources       MovieSource[]
  showtimes     Showtime[]
  favorites     Favorite[]
  subscriptions MovieSubscription[]

  @@index([status, releaseDate])
  @@index([titleNormalized, releaseYear])
  @@index([title])
  @@map("movies")
}

model MovieGenre {
  movieId String @db.Char(36)
  genreId String @db.Char(36)

  movie Movie @relation(fields: [movieId], references: [id], onDelete: Cascade)
  genre Genre @relation(fields: [genreId], references: [id])

  @@id([movieId, genreId])
  @@index([genreId])
  @@map("movie_genres")
}

model Person {
  id             String  @id @default(uuid(7)) @db.Char(36)
  fullName       String  @db.VarChar(150)
  nameNormalized String  @unique @db.VarChar(150) // khoá upsert khi crawl; bỏ qua giá trị "Đang cập nhật"
  photoUrl       String? @db.VarChar(500)

  credits MovieCredit[]

  @@index([fullName])
  @@map("persons")
}

model MovieCredit {
  id            String     @id @default(uuid(7)) @db.Char(36)
  movieId       String     @db.Char(36)
  personId      String     @db.Char(36)
  role          CreditRole
  billingOrder  Int        @default(0)
  characterName String?    @db.VarChar(150)

  movie  Movie  @relation(fields: [movieId], references: [id], onDelete: Cascade)
  person Person @relation(fields: [personId], references: [id])

  @@unique([movieId, personId, role])
  @@map("movie_credits")
}

model MovieSource {
  id               String    @id @default(uuid(7)) @db.Char(36)
  movieId          String    @db.Char(36)
  chainId          String    @db.Char(36)
  externalId       String    @db.VarChar(100) // Galaxy: movie.id (UUID)
  sourceSlug       String?   @db.VarChar(200)
  url              String?   @db.VarChar(500) // https://www.galaxycine.vn/dat-ve/{slug}/
  sourceScore      Decimal?  @db.Decimal(4, 2) // điểm của nguồn (Galaxy: rate, thang 10)
  sourceScoreScale Int       @default(10)
  sourceVotes      Int? // Galaxy: totalVotes
  lastSyncedAt     DateTime?
  lastSeenAt       DateTime?

  movie Movie       @relation(fields: [movieId], references: [id], onDelete: Cascade)
  chain CinemaChain @relation(fields: [chainId], references: [id])

  @@unique([chainId, externalId])
  @@index([movieId])
  @@map("movie_sources")
}
```

**Khối 2: Scheduling, Commerce, Payment, Promotion, Engagement, Platform** (tiếp nối khối 1, cùng một file `schema.prisma`):

```prisma
// ═══════════ SCHEDULING ═══════════
model Showtime {
  id                  String         @id @default(uuid(7)) @db.Char(36)
  movieId             String         @db.Char(36)
  auditoriumId        String         @db.Char(36)
  cinemaId            String         @db.Char(36) // denormalize từ Auditorium; bất biến
  externalId          String?        @db.VarChar(100) // Galaxy: session.id = "{cinemaCode}-{sessionNo}"
  // sha1(chain:cinema:movie:startTimeUTC:format) – KHÔNG chứa auditorium
  dedupKey            String         @unique @db.Char(40)
  startTime           DateTime // UTC (Galaxy: showDate + showTime giờ VN → UTC)
  endTime             DateTime // startTime + durationMin (mặc định 120) + buffer quảng cáo
  localDate           DateTime       @db.Date // ngày chiếu theo giờ Asia/Ho_Chi_Minh
  format              ScreenFormat   @default(TWO_D)
  formatRaw           String?        @db.VarChar(60) // Galaxy: movieFormat ("2D Phụ Đề", "VIP - AQUALIS 2D Phụ Đề")
  versionCode         String?        @db.VarChar(30) // Galaxy: version ("2d", "laurus2d", "rebroadcast")
  kind                ShowtimeKind   @default(REGULAR)
  captionMode         CaptionMode    @default(SUBTITLED)
  audioLanguage       String?        @db.VarChar(10) // vi, en, ko...
  subtitleLanguage    String?        @db.VarChar(10)
  status              ShowtimeStatus @default(SCHEDULED)
  seatSource          SeatDataSource @default(MOCK)
  providerTotalSeats  Int? // Galaxy: totalSeat (hiện luôn 0)
  providerBookedSeats Int? // Galaxy: bookedSeat (hiện luôn 0)
  lastSyncedAt        DateTime?
  lastSeenAt          DateTime? // lần cuối crawl còn thấy suất này
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  movie      Movie           @relation(fields: [movieId], references: [id])
  auditorium Auditorium      @relation(fields: [auditoriumId], references: [id])
  cinema     Cinema          @relation(fields: [cinemaId], references: [id])
  prices     ShowtimePrice[]
  seats      ShowtimeSeat[]
  bookings   Booking[]

  @@unique([cinemaId, externalId])
  @@unique([auditoriumId, startTime])
  @@index([movieId, startTime])
  @@index([cinemaId, localDate, movieId])
  @@index([startTime, status])
  @@map("showtimes")
}

model PriceRule {
  id           String       @id @default(uuid(7)) @db.Char(36)
  chainId      String       @db.Char(36)
  format       ScreenFormat
  roomTier     RoomTier     @default(STANDARD)
  seatTypeId   String       @db.Char(36)
  ticketTypeId String       @db.Char(36)
  dayType      DayType      @default(WEEKDAY)
  price        Int
  isActive     Boolean      @default(true)

  chain      CinemaChain @relation(fields: [chainId], references: [id])
  seatType   SeatType    @relation(fields: [seatTypeId], references: [id])
  ticketType TicketType  @relation(fields: [ticketTypeId], references: [id])

  @@unique([chainId, format, roomTier, seatTypeId, ticketTypeId, dayType])
  @@map("price_rules")
}

model ShowtimePrice {
  id           String      @id @default(uuid(7)) @db.Char(36)
  showtimeId   String      @db.Char(36)
  seatTypeId   String      @db.Char(36)
  ticketTypeId String      @db.Char(36)
  price        Int
  source       PriceSource @default(DEFAULT)

  showtime   Showtime   @relation(fields: [showtimeId], references: [id], onDelete: Cascade)
  seatType   SeatType   @relation(fields: [seatTypeId], references: [id])
  ticketType TicketType @relation(fields: [ticketTypeId], references: [id])

  @@unique([showtimeId, seatTypeId, ticketTypeId])
  @@map("showtime_prices")
}

model ShowtimeSeat {
  id              String    @id @default(uuid(7)) @db.Char(36)
  showtimeId      String    @db.Char(36)
  seatId          String    @db.Char(36)
  status          SeatState @default(AVAILABLE)
  heldByBookingId String?   @db.Char(36)
  heldUntil       DateTime?
  version         Int       @default(0) // optimistic lock: UPDATE ... WHERE version = ?
  isSeeded        Boolean   @default(false) // true = ghế bán giả lập, không thuộc đơn nào
  // LƯU Ý: updatedAt do Prisma Client gán; raw SQL phải tự set updatedAt = NOW(3)
  updatedAt       DateTime  @updatedAt

  showtime      Showtime      @relation(fields: [showtimeId], references: [id], onDelete: Cascade)
  seat          Seat          @relation(fields: [seatId], references: [id])
  heldByBooking Booking?      @relation("SeatHold", fields: [heldByBookingId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  bookingSeats  BookingSeat[]

  @@unique([showtimeId, seatId])
  @@index([showtimeId, status])
  @@index([status, heldUntil])
  @@index([heldByBookingId])
  @@map("showtime_seats")
}

// ═══════════ COMMERCE ═══════════
model Concession {
  id          String             @id @default(uuid(7)) @db.Char(36)
  chainId     String             @db.Char(36)
  cinemaId    String?            @db.Char(36) // null = áp dụng cả cụm; service phải kiểm cinema thuộc chain
  name        String             @db.VarChar(150)
  description String?            @db.VarChar(500)
  category    ConcessionCategory @default(COMBO)
  imageUrl    String?            @db.VarChar(500)
  price       Int
  isActive    Boolean            @default(true)
  sortOrder   Int                @default(0)

  chain  CinemaChain         @relation(fields: [chainId], references: [id])
  cinema Cinema?             @relation(fields: [cinemaId], references: [id])
  items  BookingConcession[]

  @@index([chainId, isActive, sortOrder])
  @@map("concessions")
}

model Booking {
  id             String        @id @default(uuid(7)) @db.Char(36)
  code           String        @unique @db.VarChar(20) // CH + yymmdd + 6 ký tự
  userId         String        @db.Char(36)
  showtimeId     String        @db.Char(36)
  status         BookingStatus @default(PENDING)
  subtotalAmount Int           @default(0)
  discountAmount Int           @default(0)
  serviceFee     Int           @default(0)
  totalAmount    Int           @default(0)
  contactEmail   String        @db.VarChar(255)
  contactPhone   String?       @db.VarChar(20)
  expiresAt      DateTime
  confirmedAt    DateTime?
  cancelledAt    DateTime?
  cancelReason   String?       @db.VarChar(255)
  version        Int           @default(0)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  user        User                @relation(fields: [userId], references: [id])
  showtime    Showtime            @relation(fields: [showtimeId], references: [id])
  seats       BookingSeat[]
  concessions BookingConcession[]
  payments    Payment[]
  tickets     Ticket[]
  redemption  VoucherRedemption? // nguồn duy nhất cho voucher của đơn
  heldSeats   ShowtimeSeat[]      @relation("SeatHold")

  @@index([userId, createdAt])
  @@index([status, expiresAt])
  @@index([showtimeId, status])
  @@map("bookings")
}

model BookingSeat {
  id             String  @id @default(uuid(7)) @db.Char(36)
  bookingId      String  @db.Char(36)
  showtimeSeatId String  @db.Char(36)
  seatLabel      String  @db.VarChar(8)
  seatTypeCode   String  @db.VarChar(20)
  ticketTypeId   String  @db.Char(36)
  ticketTypeCode String  @db.VarChar(20)
  price          Int
  // = showtimeSeatId khi đơn còn hiệu lực, NULL khi nhả ghế.
  // Chỉ được set/clear qua hàm releaseSeats()/lockSeats() duy nhất
  activeLock     String? @unique @db.Char(36)

  booking      Booking      @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  showtimeSeat ShowtimeSeat @relation(fields: [showtimeSeatId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  ticketType   TicketType   @relation(fields: [ticketTypeId], references: [id])
  ticket       Ticket?

  @@unique([bookingId, showtimeSeatId])
  @@index([bookingId])
  @@index([showtimeSeatId])
  @@map("booking_seats")
}

model BookingConcession {
  id           String @id @default(uuid(7)) @db.Char(36)
  bookingId    String @db.Char(36)
  concessionId String @db.Char(36)
  nameSnapshot String @db.VarChar(150)
  quantity     Int
  unitPrice    Int

  booking    Booking    @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  concession Concession @relation(fields: [concessionId], references: [id])

  @@unique([bookingId, concessionId])
  @@map("booking_concessions")
}

model Ticket {
  id            String       @id @default(uuid(7)) @db.Char(36)
  bookingId     String       @db.Char(36)
  bookingSeatId String       @unique @db.Char(36)
  // QR = ticketId + "." + HMAC_SHA256(secret, ticketId + qrVersion) rút gọn.
  // Không lưu token; tăng qrVersion để thu hồi/làm mới QR.
  qrVersion     Int          @default(1)
  status        TicketStatus @default(VALID)
  issuedAt      DateTime     @default(now())
  usedAt        DateTime?
  checkedInById String?      @db.Char(36)

  booking     Booking     @relation(fields: [bookingId], references: [id])
  bookingSeat BookingSeat @relation(fields: [bookingSeatId], references: [id])
  checkedInBy User?       @relation("TicketCheckin", fields: [checkedInById], references: [id])

  @@index([bookingId])
  @@map("tickets")
}

// ═══════════ PAYMENT ═══════════
model Payment {
  id            String          @id @default(uuid(7)) @db.Char(36)
  bookingId     String          @db.Char(36)
  provider      PaymentProvider
  status        PaymentStatus   @default(INITIATED)
  amount        Int
  currency      String          @default("VND") @db.Char(3)
  txnRef        String          @unique @db.VarChar(64) // mã merchant gửi cổng thanh toán
  providerTxnNo String?         @db.VarChar(100)
  bankCode      String?         @db.VarChar(30)
  failureCode   String?         @db.VarChar(50)
  rawResponse   Json?
  // = bookingId khi status IN (SUCCESS, REFUNDED), NULL còn lại -> tối đa 1 payment thành công/đơn
  successLock   String?         @unique @db.Char(36)
  paidAt        DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  booking Booking  @relation(fields: [bookingId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  refunds Refund[]

  @@index([bookingId])
  @@index([status, createdAt])
  @@map("payments")
}

model PaymentWebhookEvent {
  id             String          @id @default(uuid(7)) @db.Char(36)
  provider       PaymentProvider
  eventKey       String          @db.VarChar(120) // vd: vnp_TxnRef + vnp_TransactionNo
  txnRef         String?         @db.VarChar(64)
  payload        Json
  signatureValid Boolean
  processedAt    DateTime?
  createdAt      DateTime        @default(now())

  @@unique([provider, eventKey])
  @@index([txnRef])
  @@map("payment_webhook_events")
}

model Refund {
  id               String       @id @default(uuid(7)) @db.Char(36)
  paymentId        String       @db.Char(36)
  amount           Int
  reason           String?      @db.VarChar(255)
  status           RefundStatus @default(REQUESTED)
  providerRefundNo String?      @db.VarChar(100)
  processedAt      DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  payment Payment @relation(fields: [paymentId], references: [id])

  @@index([paymentId])
  @@map("refunds")
}

// ═══════════ PROMOTION ═══════════
model Voucher {
  id             String      @id @default(uuid(7)) @db.Char(36)
  code           String      @unique @db.VarChar(40) // service chuẩn hoá UPPERCASE
  description    String?     @db.VarChar(255)
  type           VoucherType
  value          Int // % hoặc VND tuỳ type
  maxDiscount    Int?
  minOrderAmount Int         @default(0)
  startsAt       DateTime
  endsAt         DateTime
  usageLimit     Int?
  usedCount      Int         @default(0) // tăng khi RESERVE, giảm khi RELEASE
  perUserLimit   Int         @default(1)
  isActive       Boolean     @default(true)

  redemptions VoucherRedemption[]
  promotions  Promotion[]

  @@index([isActive, startsAt, endsAt])
  @@map("vouchers")
}

model VoucherRedemption {
  id             String           @id @default(uuid(7)) @db.Char(36)
  voucherId      String           @db.Char(36)
  userId         String           @db.Char(36)
  bookingId      String           @unique @db.Char(36)
  status         RedemptionStatus @default(RESERVED)
  discountAmount Int
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  voucher Voucher @relation(fields: [voucherId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
  booking Booking @relation(fields: [bookingId], references: [id])

  @@index([voucherId, userId, status])
  @@map("voucher_redemptions")
}

model Promotion {
  id        String    @id @default(uuid(7)) @db.Char(36)
  chainId   String?   @db.Char(36) // banner crawl từ cụm rạp nào; NULL = do CineHub tạo
  dedupKey  String?   @unique @db.Char(40) // sha1(chainCode:linkUrl) để upsert khi crawl
  title     String    @db.VarChar(200)
  imageUrl  String    @db.VarChar(500)
  linkUrl   String?   @db.VarChar(500)
  voucherId String?   @db.Char(36)
  startsAt  DateTime? // Galaxy không công bố thời hạn → NULL = không giới hạn
  endsAt    DateTime?
  sortOrder Int       @default(0)
  isActive  Boolean   @default(true)

  chain   CinemaChain? @relation(fields: [chainId], references: [id])
  voucher Voucher?     @relation(fields: [voucherId], references: [id])

  @@index([isActive, startsAt, endsAt])
  @@index([chainId])
  @@map("promotions")
}

// ═══════════ ENGAGEMENT ═══════════
model Favorite {
  userId    String   @db.Char(36)
  movieId   String   @db.Char(36)
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id], onDelete: Cascade)

  @@id([userId, movieId])
  @@index([movieId])
  @@map("favorites")
}

model MovieSubscription {
  id         String    @id @default(uuid(7)) @db.Char(36)
  userId     String    @db.Char(36)
  movieId    String    @db.Char(36)
  notifiedAt DateTime?
  createdAt  DateTime  @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id], onDelete: Cascade)

  @@unique([userId, movieId])
  @@map("movie_subscriptions")
}

model NotificationLog {
  id        String             @id @default(uuid(7)) @db.Char(36)
  userId    String?            @db.Char(36)
  type      NotificationType
  status    NotificationStatus @default(PENDING)
  toAddress String             @db.VarChar(255)
  // INSERT trước khi gửi; vi phạm unique = đã xử lý. Vd: TICKET_EMAIL:{bookingId}
  dedupeKey String             @unique @db.VarChar(120)
  payload   Json?
  error     String?            @db.VarChar(500)
  sentAt    DateTime?
  createdAt DateTime           @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@map("notification_logs")
}

model Notification {
  id        String    @id @default(uuid(7)) @db.Char(36)
  userId    String    @db.Char(36)
  type      InboxType
  title     String    @db.VarChar(200)
  body      String?   @db.VarChar(500)
  linkUrl   String?   @db.VarChar(500)
  isRead    Boolean   @default(false)
  readAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

// ═══════════ PLATFORM ═══════════
model OutboxEvent {
  id            String       @id @default(uuid(7)) @db.Char(36)
  aggregateType String       @db.VarChar(50)
  aggregateId   String       @db.Char(36)
  eventType     String       @db.VarChar(80) // BookingCreated, PaymentSuccess...
  payload       Json
  status        OutboxStatus @default(PENDING)
  attempts      Int          @default(0)
  nextAttemptAt DateTime     @default(now()) // backoff khi retry
  lastError     String?      @db.VarChar(500)
  correlationId String?      @db.VarChar(64) // trace xuyên service
  createdAt     DateTime     @default(now())
  processedAt   DateTime?

  @@index([status, nextAttemptAt])
  @@index([aggregateType, aggregateId])
  @@map("outbox_events")
}

// Phía consumer: INSERT (consumer, eventId) trước khi xử lý; vi phạm unique = bỏ qua
model InboxEvent {
  id          String   @id @default(uuid(7)) @db.Char(36)
  consumer    String   @db.VarChar(50) // vd: worker-email, core-booking
  eventId     String   @db.Char(36) // = OutboxEvent.id
  processedAt DateTime @default(now())

  @@unique([consumer, eventId])
  @@map("inbox_events")
}
```

Schema đủ 39 model và 27 enum, đã qua kiểm tra cú pháp bằng trình phân tích của Prisma 5.22; chưa chạy trên MySQL thật, hãy chạy `npx prisma validate` rồi `migrate dev` trên máy bạn.

**Lưu ý khi dùng Prisma:** Prisma không khai báo được ràng buộc `CHECK`, collation `ascii_bin` và khoá `SELECT ... FOR UPDATE`; các phần này nằm ở migration SQL thủ công và `$queryRaw` (xem mục 6 và mục 11). Prisma không tự lọc `deletedAt`: dùng Prisma Client extension để mọi query của `User`, `Movie` mặc định thêm `deletedAt: null`. `@updatedAt` do Prisma Client gán nên raw SQL phải tự `SET updatedAt = NOW(3)`.

## 6. Ràng buộc, index và chống đặt trùng ghế

Chống double-booking dùng ba lớp độc lập, lớp nào hỏng thì lớp sau vẫn chặn được.

| Lớp                  | Cơ chế                                                                                                                                                                                                                                                                                                     | Chặn được gì                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1. Redis             | `SET NX EX 900` cho toàn bộ ghế bằng một Lua script (tất cả hoặc không ghế nào)                                                                                                                                                                                                                            | Phần lớn request trùng, trước khi chạm MySQL |
| 2. MySQL transaction | `SELECT ... FOR UPDATE` trên `showtime_seats` (sắp xếp theo `id` để tránh deadlock), kiểm tra `AVAILABLE` hoặc `HELD` đã hết hạn, rồi cập nhật `version + 1`                                                                                                                                               | Race khi Redis mất khoá hoặc restart         |
| 3. Ràng buộc dữ liệu | `UNIQUE(activeLock)` trên `booking_seats`: chỉ một đơn còn hiệu lực giữ được một ghế. Nhả ghế = đặt `activeLock = NULL` (MySQL cho phép nhiều NULL). `CHECK (activeLock IS NULL OR activeLock = showtimeSeatId)` chặn trỏ nhầm ghế; `UNIQUE(bookingId, showtimeSeatId)` chặn một đơn chứa cùng ghế hai lần | Lỗi logic ở tầng ứng dụng                    |

`ShowtimeSeat` (có `version`) là nguồn chính, `activeLock` là chốt chặn cuối. Mọi thao tác nhả ghế (job hết hạn, cron đối soát, `PaymentFailed`, hoàn tiền) đều gọi MỘT hàm `releaseSeats(bookingId)` cập nhật cả ba thứ trong một transaction: `ShowtimeSeat.status`, `BookingSeat.activeLock = NULL`, `Booking.status`. Một job đối soát phát hiện lệch: ghế do đơn thật đang `HELD`/`SOLD` mà không có `activeLock` tương ứng, và ngược lại (SQL ở `migration.sql`, phần phụ lục).

**Mẫu code giữ ghế (Prisma + raw SQL):**

```js
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw`
    SELECT id, status, heldUntil, version
    FROM showtime_seats
    WHERE showtimeId = ${showtimeId} AND seatId IN (${Prisma.join(seatIds)})
    ORDER BY id
    FOR UPDATE`;

  const ok =
    rows.length === seatIds.length &&
    rows.every(
      (r) => r.status === 'AVAILABLE' || (r.status === 'HELD' && r.heldUntil < new Date()),
    );
  if (!ok) throw new SeatUnavailableError();

  const booking = await tx.booking.create({ data: {/* PENDING, expiresAt = now + 15 phút */} });
  // optimistic lock thật sự: where chứa version cũ, rồi kiểm tra count
  for (const r of rows) {
    const { count } = await tx.showtimeSeat.updateMany({
      where: { id: r.id, version: r.version },
      data: {
        status: 'HELD',
        heldByBookingId: booking.id,
        heldUntil: booking.expiresAt,
        version: { increment: 1 },
      },
    });
    if (count !== 1) throw new SeatUnavailableError();
  }
  await tx.bookingSeat.createMany({ data: /* activeLock = showtimeSeatId */ [] });
  await tx.outboxEvent.create({ data: { eventType: 'BookingCreated' /* ... */ } });
});
```

**Máy trạng thái:**

| Thực thể            | Chuyển trạng thái hợp lệ                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `ShowtimeSeat`      | AVAILABLE → HELD → SOLD; HELD → AVAILABLE (hết hạn hoặc huỷ); BLOCKED do quản trị đặt tay                 |
| `Booking`           | PENDING → CONFIRMED; PENDING → EXPIRED; PENDING → CANCELLED; CONFIRMED → PARTIALLY_REFUNDED hoặc REFUNDED |
| `Payment`           | INITIATED → PENDING → SUCCESS hoặc FAILED hoặc CANCELLED; SUCCESS → REFUNDED                              |
| `Ticket`            | VALID → USED; VALID → VOID khi hoàn tiền                                                                  |
| `VoucherRedemption` | RESERVED → REDEEMED; RESERVED → RELEASED                                                                  |
| `Showtime`          | SCHEDULED → OPEN → SOLD_OUT hoặc FINISHED; SCHEDULED / OPEN → CANCELLED                                   |

Mọi chuyển trạng thái của `Booking` dùng điều kiện `WHERE id = ? AND status = 'PENDING' AND version = ?`; nếu 0 dòng bị ảnh hưởng thì có tiến trình khác đã xử lý trước.

**Index quan trọng:**

| Bảng                     | Index / ràng buộc                                                                                                                                                       | Phục vụ                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `showtimes`              | unique `(cinemaId, externalId)`, unique `dedupKey`, unique `(auditoriumId, startTime)`, `(movieId, startTime)`, `(cinemaId, localDate, movieId)`, `(startTime, status)` | Upsert từ crawl, lịch chiếu theo rạp theo ngày, chống trùng giờ cùng phòng |
| `showtime_seats`         | unique `(showtimeId, seatId)`, `(showtimeId, status)`, `(status, heldUntil)`, `(heldByBookingId)`                                                                       | Sơ đồ ghế, job nhả ghế hết hạn                                             |
| `bookings`               | `(userId, createdAt)`, `(status, expiresAt)`, `(showtimeId, status)`                                                                                                    | Vé của tôi, job huỷ đơn quá hạn                                            |
| `booking_seats`          | unique `activeLock`, unique `(bookingId, showtimeSeatId)`                                                                                                               | Chặn double booking, một đơn không chứa một ghế hai lần                    |
| `payments`               | unique `txnRef`, unique `successLock`, `(bookingId)`                                                                                                                    | Khớp callback VNPay, chặn hai payment thành công cho một đơn               |
| `payment_webhook_events` | unique `(provider, eventKey)`                                                                                                                                           | Idempotency webhook                                                        |
| `movies`                 | unique `slug`, `(status, releaseDate)`, `(titleNormalized, releaseYear)`                                                                                                | Đang chiếu / sắp chiếu, gộp phim giữa các cụm                              |
| `cinemas`                | unique `(chainId, externalId)`, unique `(chainId, slug)`, `(provinceId, isActive)`, `(chainId, sortOrder)`                                                              | Upsert từ crawl, lọc rạp theo tỉnh                                         |
| `persons`                | unique `nameNormalized`                                                                                                                                                 | Upsert diễn viên khi crawl                                                 |
| `price_rules`            | unique `(chainId, format, roomTier, seatTypeId, ticketTypeId, dayType)`                                                                                                 | Tra giá mặc định                                                           |
| `outbox_events`          | `(status, nextAttemptAt)`, `(aggregateType, aggregateId)`                                                                                                               | Relay lấy batch, truy vết                                                  |
| `inbox_events`           | unique `(consumer, eventId)`                                                                                                                                            | Consumer idempotent                                                        |

**Ràng buộc CHECK (migration SQL thủ công, MySQL 8.0.16 trở lên).** Có 33 ràng buộc trong `migration.sql`; các ràng buộc cốt lõi:

```sql
ALTER TABLE bookings ADD CONSTRAINT chk_booking_amount
  CHECK (subtotalAmount >= 0 AND discountAmount >= 0 AND serviceFee >= 0 AND totalAmount >= 0
         AND totalAmount = subtotalAmount + serviceFee - discountAmount);
ALTER TABLE booking_seats ADD CONSTRAINT chk_active_lock
  CHECK (activeLock IS NULL OR activeLock = showtimeSeatId);
ALTER TABLE payments ADD CONSTRAINT chk_payment_success_lock
  CHECK ((successLock IS NULL AND status NOT IN ('SUCCESS','REFUNDED'))
      OR (successLock = bookingId AND status IN ('SUCCESS','REFUNDED')));
ALTER TABLE users ADD CONSTRAINT chk_user_credential
  CHECK (passwordHash IS NOT NULL OR googleId IS NOT NULL);
ALTER TABLE booking_concessions ADD CONSTRAINT chk_bc_qty CHECK (quantity > 0 AND quantity <= 20);
ALTER TABLE showtimes ADD CONSTRAINT chk_showtime_time CHECK (endTime > startTime);
ALTER TABLE showtime_prices ADD CONSTRAINT chk_price CHECK (price >= 0);
ALTER TABLE seats ADD CONSTRAINT chk_seat_col CHECK (colNumber > 0 AND colSpan IN (1, 2));
ALTER TABLE vouchers ADD CONSTRAINT chk_voucher_value
  CHECK (value > 0 AND (type <> 'PERCENT' OR value BETWEEN 1 AND 100));
ALTER TABLE movies ADD CONSTRAINT chk_movie_duration CHECK (durationMin IS NULL OR durationMin > 0);
```

Giới hạn 6 ghế mỗi đơn kiểm ở service (và validate bằng Zod); không dùng trigger để giữ logic ở một chỗ. MySQL không có exclusion constraint nên việc chống chồng giờ trong cùng phòng (hai suất 10:00–12:00 và 11:00–13:00) kiểm ở service trong một transaction có khoá hàng `Auditorium`. Hai bất biến liên bảng (`BookingSeat.showtimeSeat.showtimeId` bằng `Booking.showtimeId`; `Concession.cinema` thuộc đúng `chain`) cũng kiểm ở service và viết test.

### Mô phỏng dữ liệu ghế (Seat Data Mocking)

Ghế còn trống hay đã bán chỉ có nghĩa trong CineHub: MySQL là nguồn sự thật, và hai cờ `Showtime.seatSource = MOCK` cùng `ShowtimeSeat.isSeeded = true` đánh dấu dữ liệu giả. Khi sau này có nguồn ghế thật, chỉ cần đổi `seatSource` sang `PROVIDER`, schema không đổi.

**1. Mẫu sơ đồ ghế (layout template).** Phòng chiếu được gán một mẫu theo hạng phòng và định dạng; script seed sinh `Seat` từ mẫu, chừa lối đi bằng khoảng cách `posX`.

| Mã mẫu       | Lưới             | Phân khu                                    | Tổng ghế | Dùng cho                                     |
| ------------ | ---------------- | ------------------------------------------- | -------- | -------------------------------------------- |
| `SMALL_8x10` | 8 hàng × 10 cột  | A–B thường, C–G VIP, H Sweetbox (5 ghế đôi) | 75       | Phòng nhỏ, phòng Kids                        |
| `STD_10x14`  | 10 hàng × 14 cột | A–C thường, D–I VIP, J Sweetbox (7 ghế đôi) | 133      | Phòng 2D/3D tiêu chuẩn                       |
| `IMAX_12x18` | 12 hàng × 18 cột | A–D thường, E–K VIP, L Sweetbox (9 ghế đôi) | 207      | Phòng `format = IMAX`                        |
| `VIP_6x8`    | 6 hàng × 8 cột   | A–F VIP                                     | 48       | Phòng `tier = VIP` (AQUALIS, LAURUS, LAGOM…) |

Phòng `tier = VIP` luôn dùng `VIP_6x8`; phòng IMAX luôn dùng `IMAX_12x18`; các phòng còn lại gán mẫu bằng hash của tên phòng (ổn định giữa các lần chạy). Cập nhật `Auditorium.totalSeats`, `totalCapacity`, `layoutCode` sau khi sinh; `isLayoutMock` giữ `true` cho tới khi có sơ đồ thật.

**2. Tạo ghế cho suất chiếu.** Với mỗi suất trong 7 ngày tới, tạo một `ShowtimeSeat` cho mọi `Seat` đang hoạt động bằng `createMany({ skipDuplicates: true })`; unique `(showtimeId, seatId)` làm việc chạy lại không sinh trùng. Giá lấy từ `ShowtimePrice` của loại ghế với loại vé ADULT. Suất `kind = ENCORE` hoặc `LIVE` vẫn tạo ghế như suất thường.

**3. Tỷ lệ ghế đã bán giả lập.** Tỷ lệ tăng theo độ hot của phim, khung giờ và độ gần giờ chiếu:

| Yếu tố                               | Cách tính (ví dụ, chỉnh theo ý)                              |
| ------------------------------------ | ------------------------------------------------------------ |
| Nền                                  | 15%                                                          |
| Độ hot của phim                      | + 0–35% theo thứ hạng trong `rank:movies:trending`           |
| Khung giờ 18:00–22:00 hoặc cuối tuần | + 10–15%                                                     |
| Còn dưới 3 giờ đến giờ chiếu         | + 10%                                                        |
| Giới hạn                             | tối thiểu 5%, tối đa 85% để luôn còn ghế cho người dùng thật |

Ghế bán được chọn theo nhóm 1–4 người ngồi cạnh nhau cùng hàng cho giống thật, và dùng bộ sinh số ngẫu nhiên có seed theo `showtime.id` nên cùng một suất luôn ra cùng một sơ đồ:

```js
function pickSeededSoldSeats(showtime, seats, soldRatio) {
  // seats đã sắp theo (rowLabel, colNumber)
  const rand = mulberry32(hashString(showtime.id));
  const target = Math.floor(seats.length * soldRatio);
  const sold = new Set();
  while (sold.size < target) {
    const start = Math.floor(rand() * seats.length);
    const groupSize = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < groupSize && sold.size < target; i++) {
      const s = seats[start + i];
      if (s && s.rowLabel === seats[start].rowLabel) sold.add(s.id);
    }
  }
  return sold;
}
```

**4. Quy tắc dữ liệu giả.**

- Ghế bán giả lập có `status = SOLD`, `isSeeded = true`, và không có `BookingSeat` nào; đơn thật của người dùng đi đúng luồng ở mục 9.
- Không bao giờ ghi đè ghế đang `HELD` hoặc `SOLD` bởi đơn thật (`isSeeded = false`).
- Nếu mọi ghế đều `SOLD`, chuyển `Showtime.status` sang `SOLD_OUT`.
- Doanh thu và thống kê chỉ tính từ `Booking` + `Payment`, không tính ghế `isSeeded`.

**5. Biến động giả lập (tuỳ chọn).** Một cron mỗi 5 phút chọn vài suất sắp chiếu và bán thêm vài ghế giả lập để sơ đồ ghế trông "sống". Chỉ chạy tới 30 phút trước giờ chiếu, dùng cập nhật có điều kiện `WHERE status = 'AVAILABLE' AND version = ?` để không tranh chấp với đơn thật, rồi publish `ch:showtime:{id}` để FE cập nhật.

**6. Đặt lại và dọn dẹp.** Lệnh `seed:seats --showtime <id> --reset` đưa ghế `isSeeded = true` về `AVAILABLE` rồi sinh lại. Suất đã `FINISHED` quá 30 ngày: chỉ xoá `ShowtimeSeat` chưa từng gắn đơn nào (phần lớn là ghế giả); ghế đã có `BookingSeat` được giữ lại vì khoá ngoại `Restrict` (SQL ở `migration.sql`, mục A1).

**7. Giao diện nhà cung cấp.** Service ghế gọi qua một interface `SeatAvailabilityProvider { getAvailability(showtime) }`; hiện chỉ có `MockSeatProvider`, sau này thêm provider thật mà không sửa luồng đặt vé.

## 7. Thiết kế MongoDB

MongoDB giữ dữ liệu mà schema thay đổi theo nguồn hoặc cần vector search; mọi tham chiếu sang SQL là chuỗi UUID, không có khoá ngoại.

| Collection            | Service ghi | Mục đích                                                                                       | TTL / index chính                                                              |
| --------------------- | ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `crawl_runs`          | Aggregator  | Nhật ký mỗi lần chạy: nguồn, số bản ghi, lỗi, thời gian                                        | `startedAt` (TTL 90 ngày)                                                      |
| `crawl_raw_items`     | Aggregator  | Payload thô từ Galaxy (`kind`: session, movie, cinema, promotion) để debug và chạy lại Adapter | TTL 30 ngày trên `fetchedAt`; unique `(source, kind, externalId, contentHash)` |
| `movie_metadata`      | Aggregator  | Metadata mở rộng: gallery, mô tả theo đoạn, nhà sản xuất, thẻ                                  | unique `movieId`; `(slug)`                                                     |
| `reviews`             | AI / Core   | Review của người dùng kèm embedding                                                            | unique `(userId, movieId)`; `(movieId, createdAt)`; vector index               |
| `movie_embeddings`    | AI Service  | Vector tổng hợp từ synopsis + review của phim                                                  | unique `movieId`; vector index                                                 |
| `user_taste_profiles` | AI Service  | Hồ sơ gu: trọng số thể loại, vector gu                                                         | unique `userId`                                                                |
| `ai_chat_sessions`    | AI Service  | Hội thoại chat và danh sách phim đã gợi ý                                                      | `(userId, updatedAt)`; TTL 30 ngày                                             |

**Mẫu document:**

```js
// movie_metadata (dữ liệu thật từ phim henrys-first-date đã crawl)
{
  _id: ObjectId(),
  movieId: '0192f1c4-....',          // UUID của movies.id (Core cấp khi upsert)
  slug: 'henrys-first-date',
  sources: [{ chain: 'GALAXY', externalId: 'a0cd6a78-f461-4264-9e7d-ee220b3bde9d',
              url: 'https://www.galaxycine.vn/dat-ve/henrys-first-date/',
              syncedAt: ISODate('2026-10-05T14:51:22.982Z') }],
  gallery: ['https://cdn.galaxycine.vn/media/2026/9/24/henrys-first-date-1_1790237320350.jpg'],
  tags: ['Lãng Mạn', 'Hài'],
  extra: {                            // phần mở rộng theo từng cụm rạp
    descriptionParagraphs: ['...', '...', '...'],
    descriptionMeta: '...',
    producers: ['GDH'],
    listingTags: ['dang-chieu', 'sap-chieu', 'imax', 'trang-chu']   // nhóm danh sách của nguồn
  },
  updatedAt: ISODate()
}

// crawl_raw_items
{
  _id: ObjectId(), source: 'GALAXY', kind: 'session',
  externalId: '0000001005-307029',    // session.id của Galaxy
  contentHash: 'sha1...', payload: { /* nguyên văn JSON từ sessions2 */ },
  fetchedAt: ISODate()
}

// reviews
{
  _id: ObjectId(),
  movieId: '0192f1c4-....',
  userId: '0192f1a0-....',
  user: { name: 'Minh', avatarUrl: '...' },   // snapshot để khỏi join sang SQL
  rating: 5,                                  // 1..5
  content: 'Phim hài, hợp xem cùng gia đình',
  status: 'PUBLISHED',                        // PUBLISHED / HIDDEN
  likeCount: 0,
  embedding: [0.012, -0.07, ...],             // 384 chiều
  createdAt: ISODate(), updatedAt: ISODate()
}

// user_taste_profiles
{
  userId: '0192f1a0-....',
  genreWeights: { 'hai': 0.6, 'hanh-dong': 0.3 },   // khoá là Genre.slug
  tasteVector: [ ... ],                        // trung bình embedding các phim đã xem / đánh giá cao
  watchedMovieIds: ['...'],
  updatedAt: ISODate()
}
```

**Vector index (Atlas Vector Search)** cho `reviews.embedding` và `movie_embeddings.embedding`: 384 chiều, độ đo cosine, phù hợp mô hình đa ngôn ngữ nhỏ như `multilingual-e5-small` chạy bằng `@xenova/transformers`. Nếu đổi mô hình, phải đổi số chiều và tính lại toàn bộ vector.

**Upsert khi crawl (idempotent):**

```js
await MovieMetadata.bulkWrite(
  items.map((m) => ({
    updateOne: {
      filter: { movieId: m.movieId },
      update: { $set: { ...m, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      upsert: true,
    },
  })),
);
```

**Quy tắc review:** mỗi người một review cho một phim (unique `(userId, movieId)`); khi tạo, sửa hoặc ẩn review, AI Service phát event `ReviewChanged` để Core tính lại `movies.ratingAvg` và `ratingCount` bằng aggregate, rồi xoá cache Redis của phim đó. `ratingAvg` chỉ tính từ review CineHub (thang 5); điểm Galaxy (thang 10) nằm ở `MovieSource.sourceScore`.

## 8. Thiết kế Redis

Redis chỉ chứa dữ liệu tạm hoặc dựng lại được từ MySQL, ngoại trừ hàng đợi BullMQ.

| Khoá                              | Kiểu                           | TTL                              | Mục đích                                                                   |
| --------------------------------- | ------------------------------ | -------------------------------- | -------------------------------------------------------------------------- |
| `seat:lock:{showtimeId}:{seatId}` | STRING (giá trị = `bookingId`) | 900 s                            | Khoá ghế tạm, tạo bằng Lua all-or-nothing                                  |
| `hold:booking:{bookingId}`        | SET các khoá ghế               | 960 s                            | Nhả toàn bộ ghế của một đơn nhanh                                          |
| `showtime:{showtimeId}:seats`     | HASH `seatId → status`         | 10 s, xoá khi có thay đổi        | Cache sơ đồ ghế cho `GET /seats/:showtimeId`                               |
| `ch:showtime:{showtimeId}`        | Pub/Sub                        | không                            | Đẩy cập nhật ghế realtime qua WebSocket/SSE                                |
| `rank:movies:trending`            | ZSET (điểm = số vé 7 ngày)     | không, job làm mới mỗi giờ       | Top 10 thịnh hành                                                          |
| `cache:movies:now-showing`        | STRING JSON                    | 600 s                            | Danh sách đang chiếu                                                       |
| `cache:movie:{movieId}`           | STRING JSON                    | 600 s                            | Chi tiết phim                                                              |
| `cache:showtimes:{date}:{hash}`   | STRING JSON                    | 120 s                            | Kết quả lọc lịch chiếu theo rạp, định dạng                                 |
| `rec:user:{userId}`               | STRING JSON                    | 3600 s                           | Gợi ý AI đã tính                                                           |
| `auth:blacklist:{jti}`            | STRING                         | bằng thời gian còn lại của token | Thu hồi access token khi đăng xuất                                         |
| `auth:blacklist:{familyId}`       | STRING                         | theo hạn refresh token           | Thu hồi cả chuỗi refresh token khi phát hiện dùng lại token cũ             |
| `auth:oauth:state:{state}`        | STRING                         | 600 s                            | Chống CSRF cho luồng đăng nhập Google                                      |
| `rl:{route}:{ip or userId}`       | STRING (INCR)                  | 60 s                             | Giới hạn tốc độ (login, chat AI, lock ghế)                                 |
| `idem:pay:{provider}:{eventKey}`  | STRING `SET NX`                | 86400 s                          | Chặn xử lý lặp webhook (lớp nhanh trước unique của MySQL)                  |
| `crawl:lock:{chainCode}`          | STRING `SET NX`                | 3600 s                           | Không cho hai tiến trình crawl cùng cụm rạp (vd: `crawl:lock:GALAXY`)      |
| `bull:{queue}:*`                  | BullMQ                         | do thư viện quản lý              | Hàng đợi `booking-expiry`, `email`, `crawl`, `rating-sync`, `outbox-relay` |

**Lua script giữ nhiều ghế nguyên tử:**

```lua
-- KEYS = các khoá ghế; ARGV[1] = bookingId; ARGV[2] = ttl giây
for i, k in ipairs(KEYS) do
  if redis.call('EXISTS', k) == 1 then return 0 end
end
for i, k in ipairs(KEYS) do
  redis.call('SET', k, ARGV[1], 'EX', ARGV[2])
end
return 1
```

**Quy tắc vận hành:**

- Nếu chạy Redis Cluster, đặt `{showtimeId}` trong dấu ngoặc nhọn để mọi khoá ghế cùng slot; với đồ án một node thì không cần.
- Nhả khoá phải kiểm tra giá trị (`GET` rồi `DEL` trong Lua) để không xoá nhầm khoá của đơn khác.
- Một node Redis đã đủ cho `SET NX EX`; Redlock chỉ cần khi chạy nhiều node độc lập.
- Tách hai instance (hoặc hai database logic có cấu hình riêng): cache dùng `allkeys-lru`; queue và khoá dùng `noeviction`, vì BullMQ yêu cầu không bị evict.
- Bật AOF (`appendonly yes`) cho instance queue để delayed job sống sót khi restart.

## 9. Luồng dữ liệu end-to-end

Mọi luồng ghi tiền và ghế đi qua MySQL transaction, Redis chỉ tăng tốc và đếm giờ.

**9.1. Đặt vé (màn chọn ghế → thanh toán)**

1. `POST /booking/lock`: kiểm tra tối đa 6 ghế, chạy Lua giữ khoá Redis; thất bại trả 409 "Ghế đang được giữ".
2. Transaction MySQL: khoá hàng `showtime_seats`, chuyển `HELD`, tạo `Booking` PENDING (`expiresAt` = bây giờ + 15 phút), `BookingSeat` (đặt `activeLock`), ghi `OutboxEvent(BookingCreated)`. Lỗi thì nhả khoá Redis.
3. Relay đọc outbox (`FOR UPDATE SKIP LOCKED`, backoff theo `nextAttemptAt`), đẩy sự kiện vào BullMQ, tạo delayed job `booking-expiry` (`jobId = bookingId`, trễ 900 s).
4. Màn bắp nước: `PUT /booking/:id/concessions` thay toàn bộ `BookingConcession`, server tính lại `subtotalAmount` và `totalAmount` (không tin số tiền từ FE).
5. Áp voucher: trong một transaction chạy `UPDATE vouchers SET usedCount = usedCount + 1 WHERE ... AND usedCount < usageLimit`; `affectedRows = 0` nghĩa là hết lượt. Thành công thì tạo `VoucherRedemption` RESERVED và cập nhật `discountAmount`, `totalAmount`.
6. `POST /booking/checkout`: tạo `Payment` INITIATED với `txnRef` duy nhất, ký URL VNPay, trả về để FE redirect.

**9.2. Thanh toán thành công (Saga + Inbox/Outbox)**

1. VNPay gọi IPN/return: xác thực chữ ký, so khớp `amount` với `Booking.totalAmount` (VNPay trả `vnp_Amount` nhân 100), ghi `PaymentWebhookEvent` (unique chặn lặp), kiểm tra thêm `idem:pay:*` trong Redis.
2. Transaction: `Payment` → SUCCESS (gán `successLock = bookingId`); `Booking` PENDING → CONFIRMED (có điều kiện `version`); `ShowtimeSeat` → SOLD; tạo `Ticket` (`qrVersion = 1`, mã QR sinh bằng HMAC từ `ticket.id`, không lưu token); `VoucherRedemption` RESERVED → REDEEMED; ghi outbox `PaymentSuccess`.
3. Sau commit: xoá khoá ghế trong Redis, publish cập nhật ghế; Worker nhận event, ghi `InboxEvent (consumer, eventId)` trước khi xử lý (vi phạm unique = đã xử lý, bỏ qua), gửi email QR và ghi `NotificationLog` với `dedupeKey = TICKET_EMAIL:{bookingId}`.

**9.3. Thất bại hoặc hết hạn**

- Job `booking-expiry` chạy: nếu `Booking` còn PENDING thì gọi `releaseSeats()`: chuyển EXPIRED, đặt `BookingSeat.activeLock = NULL`, `ShowtimeSeat` HELD → AVAILABLE, xoá khoá Redis, `Payment` INITIATED → CANCELLED, `VoucherRedemption` → RELEASED và trừ `usedCount`.
- Event `PaymentFailed` đi cùng đường nhả ghế (bồi hoàn).
- Cron đối soát mỗi phút: quét `showtime_seats` có `status = HELD AND heldUntil < now()` và nhả ghế, phòng khi job bị mất; đồng thời chạy hai truy vấn đối soát `activeLock`.
- Thanh toán thành công nhưng đơn đã EXPIRED và ghế đã bị người khác lấy: giữ `Payment` SUCCESS, tạo `Refund` và báo người dùng.

**9.4. Crawl Galaxy (ETL)**

1. Cron 02:00 lấy khoá `crawl:lock:GALAXY`; ghi `crawl_runs` bắt đầu.
2. Aggregator gọi API `sessions2` (`includeCinema=true`, `includeMovie=true`) lấy phim, rạp, phòng và suất chiếu của 7 ngày tới; lấy thêm trang `/dat-ve/{slug}/` cho mô tả, thể loại, diễn viên, quốc gia, nhà sản xuất; trang `/rap-gia-ve/{slug}/` thử lấy bảng giá; trang khuyến mãi cho banner. Không có dữ liệu ghế. Ghi `crawl_raw_items` kèm `contentHash` để bỏ qua bản không đổi.
3. `galaxyAdapter` chuẩn hoá sang DTO chung: khoá rạp = `cinema.code`, tách phường và tỉnh từ địa chỉ, ánh xạ `version` → (`format`, `Auditorium.tier`, `kind`), `caption` → `captionMode`, `age` → `ageRating`; upsert `movie_metadata` bằng `bulkWrite`.
4. Gửi `MovieSynced` / `ShowtimeSynced`; Core upsert theo thứ tự `Province` → `Ward` → `Cinema` → `Auditorium` → `Movie`, `Genre`, `Person`, `MovieCredit`, `MovieSource` → `Showtime` (khoá `(cinemaId, externalId)`) → `ShowtimePrice`. Thiếu giá thì điền từ `PriceRule` theo định dạng, hạng phòng, loại ghế, loại vé và loại ngày (`source = DEFAULT`). Mỗi suất còn thấy trong lần crawl được cập nhật `lastSeenAt`.
5. Suất biến mất khỏi nguồn: nếu chưa có `Booking` thì chuyển CANCELLED; nếu đã có `Booking` thì giữ nguyên và gắn cờ để quản trị xử lý, không xoá hay ghi đè.
6. Với suất trong 7 ngày tới, chạy trình mô phỏng ghế: tạo `ShowtimeSeat` kèm ghế bán giả lập, đặt `seatSource = MOCK` (mục 6). Phòng mới chưa có `Seat` thì gán `layoutCode` và sinh ghế từ mẫu sơ đồ.
7. Xoá cache Redis liên quan; cập nhật `crawl_runs`.

**9.5. Gợi ý AI**

1. Người dùng đã đăng nhập: đọc `rec:user:{id}`; nếu trống thì lấy `tasteVector` rồi vector search trong `movie_embeddings`.
2. Loại phim đã xem (từ `tickets` trong MySQL), chỉ giữ phim `NOW_SHOWING`, trả ID rồi Core ghép thông tin card từ MySQL.
3. Chưa đăng nhập: trả lời nhắc đăng nhập; chat AI vẫn dùng semantic search trên review nhưng không cá nhân hoá.

**9.6. Đăng nhập Google**

1. FE gọi `/auth/google`; server tạo `state`, lưu `auth:oauth:state:{state}` (600 s), redirect sang Google.
2. `/auth/google/callback`: kiểm `state`, đổi code lấy token, đọc `sub` và `email`.
3. Tìm `User` theo `googleId`; chưa có thì tìm theo `email` đã xác thực để liên kết, hoặc tạo mới (`authProvider = GOOGLE`, `passwordHash = NULL`, `emailVerifiedAt = now()`).
4. Cấp access token và `RefreshToken` mới (mỗi phiên đăng nhập một `familyId`), ghi `lastLoginAt`.

**Danh sách event:** `BookingCreated`, `PaymentSuccess`, `PaymentFailed`, `BookingConfirmed`, `BookingExpired`, `ReviewChanged`, `MovieSynced`, `ShowtimeSynced`.

## 10. Ánh xạ API và thực thể theo màn hình

Bảng dưới nối từng màn hình UI với dữ liệu nó đọc và ghi, để kiểm tra schema đủ cho toàn bộ chức năng.

| Màn hình                    | Endpoint                                                                    | Đọc                                                                                         | Ghi                                                                                       | Redis                                                  |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Chatbot AI                  | `POST /api/ai/chat`                                                         | Mongo `movie_embeddings`, `reviews`; SQL `Movie` (dựng card)                                | Mongo `ai_chat_sessions`                                                                  | `rl:ai:*`                                              |
| Đăng nhập / Đăng ký (Local) | `POST /api/auth/login`, `/register`                                         | `User`                                                                                      | `User`, `RefreshToken`, `EmailVerificationToken`                                          | `rl:auth:*`, `auth:blacklist:*`                        |
| Đăng nhập Google            | `GET /auth/google`, `/auth/google/callback`                                 | `User`                                                                                      | `User`, `RefreshToken`                                                                    | `auth:oauth:state:*`                                   |
| Quên mật khẩu               | `POST /auth/forgot`, `/auth/reset`                                          | `User`, `PasswordResetToken`                                                                | `PasswordResetToken`, `User`                                                              | `rl:auth:*`                                            |
| Trang chủ                   | `GET /movies/trending`, `/recommended`, `/now-showing`; khuyến mãi; đối tác | `Movie`, `Genre`, `Promotion`, `CinemaChain`; Mongo `user_taste_profiles`                   | không                                                                                     | `rank:movies:trending`, `cache:movies:*`, `rec:user:*` |
| Chi tiết phim               | `GET /movies/:id`; `GET`, `POST /reviews`; đăng ký thông báo; yêu thích     | `Movie`, `MovieCredit`, `Person`, `Genre`, `MovieSource`; Mongo `movie_metadata`, `reviews` | Mongo `reviews`; `Favorite`; `MovieSubscription`                                          | `cache:movie:*`                                        |
| Danh sách rạp               | `GET /cinemas`                                                              | `Cinema`, `Province`, `Ward`, `CinemaChain`                                                 | không                                                                                     | cache danh sách rạp                                    |
| Lịch chiếu tổng hợp         | `GET /showtimes`                                                            | `Showtime`, `ShowtimePrice` (giá thấp nhất), `Auditorium`, `Cinema`, `CinemaChain`          | không                                                                                     | `cache:showtimes:*`                                    |
| Chọn ghế                    | `GET /seats/:showtimeId`; `POST /booking/lock`                              | `ShowtimeSeat`, `Seat`, `SeatType`                                                          | `ShowtimeSeat`, `Booking`, `BookingSeat`, `OutboxEvent`                                   | `seat:lock:*`, `hold:*`, `showtime:*:seats`            |
| Bắp nước                    | `GET /concessions`; `PUT /booking/:id/concessions`                          | `Concession`                                                                                | `BookingConcession`, tổng tiền của `Booking`                                              | không                                                  |
| Thanh toán                  | `POST /booking/checkout`                                                    | `Booking`, `BookingSeat`, `BookingConcession`, `Showtime`, `Movie`, `Cinema`, `Voucher`     | `Payment`, `VoucherRedemption`                                                            | `idem:pay:*`                                           |
| Kết quả (callback)          | Webhook + `GET /booking/:code/status`                                       | `Booking`, `Payment`                                                                        | `PaymentWebhookEvent`, `Payment`, `Booking`, `Ticket`, `VoucherRedemption`, `OutboxEvent` | `idem:pay:*`                                           |
| Vé của tôi                  | `GET /api/user/tickets`                                                     | `Booking`, `Ticket`, `BookingSeat`, `Showtime`, `Movie`, `Cinema`                           | không (QR sinh lại từ `ticket.id` bằng HMAC)                                              | không                                                  |
| Quét vé (nhân viên)         | `POST /staff/checkin`                                                       | `Ticket`, `BookingSeat`, `Booking`, `Showtime`, `User.cinemaId`                             | `Ticket.status`, `usedAt`, `checkedInById`                                                | không                                                  |
| Thông báo (chuông)          | `GET /api/notifications`; `PATCH /api/notifications/:id/read`               | `Notification`                                                                              | `Notification`                                                                            | không                                                  |

**Ghi chú thiết kế:**

- Tab "Vé sắp tới" lọc `Showtime.startTime >= now()` trên đơn `CONFIRMED`; tab "Lịch sử" lọc ngược lại. Index `(userId, createdAt)` đủ cho cả hai.
- Thanh đặt vé nhanh dùng `Showtime` lọc theo `movieId`, ngày và `cinemaId`, không cần bảng riêng.
- "Nhận thông báo" ghi `MovieSubscription`; khi phim chuyển `NOW_SHOWING`, Worker gửi mail và đặt `notifiedAt`.
- Giá hiển thị ở danh sách giờ chiếu lấy `MIN(ShowtimePrice.price)` theo suất.
- Danh sách giờ chiếu hiển thị nhãn từ `Showtime.formatRaw` (ví dụ "VIP - AQUALIS 2D Phụ Đề") và lọc theo `format`, `captionMode`, `Auditorium.tier`; suất `kind = ENCORE` hoặc `LIVE` gắn nhãn riêng.

- Màn chọn ghế cho phép chọn loại vé (người lớn, HSSV, trẻ em, thành viên) cho từng ghế; giá lấy từ `ShowtimePrice` theo cặp (loại ghế, loại vé) và lưu snapshot vào `BookingSeat`.
- Công thức tổng tiền: vé + bắp nước + `serviceFee` - giảm giá = `totalAmount`; server tính lại, không tin số từ FE.
- `Booking.contactEmail` và `contactPhone` là nơi gửi vé QR, mặc định lấy từ tài khoản và cho phép sửa lúc thanh toán.
- Tài khoản chỉ đăng nhập Google không có mật khẩu: ẩn "đổi mật khẩu" khi `passwordHash = NULL`, thay bằng "đặt mật khẩu".

## 11. Vận hành, bảo mật và lộ trình

**Migration và dữ liệu mẫu**

- Quy trình: `prisma migrate dev` ở local, `prisma migrate deploy` trên môi trường chạy; không bao giờ sửa tay migration đã áp dụng.
- Prisma không phát hiện được collation `ascii_bin` hay `CHECK`: mỗi thay đổi có `CHECK`, collation hoặc index đặc biệt viết thành migration SQL riêng (`--create-only` rồi chỉnh). Mọi migration sau này thêm cột ID/FK mới phải lặp lại `MODIFY ... ascii_bin`. Truy vấn kiểm tra sau migration nằm ở `migration.sql`, Phần 3.
- Seed (`prisma/seed.js`): `SeatType` (STANDARD, VIP, SWEETBOX), `TicketType` (ADULT, STUDENT, CHILD, MEMBER), `Genre` (13 thể loại từ crawl), `Province`, `CinemaChain` (GALAXY), `PriceRule` mặc định, admin mặc định, vài `Voucher` mẫu.
- Quy tắc đổi schema không gián đoạn: thêm cột nullable → backfill → mới ràng buộc NOT NULL.

**Bảo mật**

- Mật khẩu bcrypt (cost 10–12); refresh token và reset token chỉ lưu hash SHA-256. Refresh token xoay vòng theo `familyId`; dùng lại token đã bị thay thế thì thu hồi cả chuỗi.
- Mã QR vé là `ticketId` + HMAC-SHA256; rò database không làm lộ vé hợp lệ. Muốn thu hồi hàng loạt thì tăng `qrVersion`.
- Nhân viên (`STAFF`) chỉ quét được vé của rạp mình: kiểm `ticket → booking → showtime → cinema = User.cinemaId`.
- Xoá tài khoản: anonymize (`deleted+{id}@cinehub.invalid`, xoá `phone`, `fullName`, `googleId`), đặt `status = DELETED` và `deletedAt`.
- `Payment.rawResponse` và `PaymentWebhookEvent.payload` chứa dữ liệu cổng thanh toán: không ghi thẻ hay thông tin nhạy cảm, giới hạn quyền đọc. Khi xử lý IPN luôn so khớp số tiền với `Booking.totalAmount`.
- Tài khoản ứng dụng chỉ có quyền DML (không DDL); migration chạy bằng tài khoản riêng.
- Mọi payload đi vào đều validate bằng Zod trước khi tới Prisma.
- Số tiền luôn tính lại ở server từ `ShowtimePrice` và `Concession`.

**Hiệu năng và dung lượng**

- `showtime_seats` là bảng lớn nhất. Với dữ liệu Galaxy: 3.321 suất, trong đó 3.175 suất nằm trong 7 ngày 05–11/10/2026; sơ đồ mô phỏng 48–207 ghế, trung bình khoảng 130 ghế mỗi suất nên cửa sổ 7 ngày có cỡ 400 nghìn dòng. Chỉ tạo cho suất trong 7 ngày tới, xoá hoặc lưu trữ suất đã chiếu quá 30 ngày.
- Phân trang bằng cursor (`id` UUID v7 sắp xếp được theo thời gian) thay vì `OFFSET`.
- Đặt `connection_limit` của Prisma theo số instance; tránh N+1 bằng `include` hoặc `select` có chủ đích.
- Dọn `outbox_events` đã PROCESSED quá 7 ngày và `inbox_events` quá 14 ngày.
- Backup: `mysqldump`/snapshot hằng ngày, binlog để khôi phục theo thời điểm; MongoDB Atlas bật backup tự động; Redis queue bật AOF.

**Mở rộng sang nhiều cụm rạp:** thêm một dòng `CinemaChain`, viết `cgvAdapter` / `lotteAdapter` ra cùng DTO chuẩn, thêm `MovieSource` cho phim đã có; schema và luồng đặt vé không đổi. Việc cần xử lý riêng là gộp phim trùng giữa các cụm (so khớp theo `titleNormalized` + `releaseYear`, có bước duyệt tay).

**Rủi ro và cách giảm**

| Rủi ro                                                        | Ảnh hưởng                             | Giảm thiểu                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Galaxy đổi API hoặc chặn crawl                                | Mất dữ liệu lịch chiếu                | Lưu `crawl_raw_items`, theo dõi `crawl_runs`, giữ dữ liệu cũ khi crawl lỗi; `lastSeenAt` để biết suất nào còn sống |
| Suất bị dời giờ hoặc biến mất khỏi nguồn                      | Suất "mồ côi", có thể đã có người đặt | Upsert theo `(cinemaId, externalId)` thay vì băm giờ chiếu; suất đã có `Booking` không bị xoá hay ghi đè           |
| Mã rạp/tỉnh không nhất quán giữa các lần crawl                | Sinh trùng rạp, tỉnh                  | `cinema.code` làm `externalId`; `Province.nameNormalized` unique; `Cinema.sourceCityId` để đối chiếu               |
| Adapter gán sai mặc định (ví dụ `ageRating = P` cho mọi phim) | Hiển thị sai độ tuổi                  | Ánh xạ từ `movie.age` của API; test adapter trên dữ liệu thật                                                      |
| Mất Redis giữa lúc giữ ghế                                    | Mất khoá tạm                          | MySQL vẫn giữ `HELD` + `heldUntil`; cron đối soát                                                                  |
| Bảng `showtime_seats` phình to                                | Chậm truy vấn                         | Tạo theo cửa sổ 7 ngày, archive suất cũ                                                                            |
| Lệch điểm đánh giá giữa Mongo và MySQL                        | Sai điểm hiển thị                     | Tính lại từ aggregate khi có `ReviewChanged`, job đối soát hằng đêm                                                |
| Webhook gửi lặp hoặc trễ                                      | Trừ tiền hai lần, đơn sai trạng thái  | Unique `(provider, eventKey)`, `successLock`, chuyển trạng thái có điều kiện `version`                             |
| Event giao nhận hai lần                                       | Gửi hai email, ghi hai redemption     | `InboxEvent` unique `(consumer, eventId)`, `NotificationLog.dedupeKey`                                             |
| Voucher còn một lượt nhưng nhiều người cùng áp                | Hết lượt sau khi đã thu tiền          | Chiếm lượt có điều kiện lúc áp mã (RESERVED), trả lại khi đơn hết hạn                                              |
| Đổi mô hình embedding                                         | Vector cũ vô dụng                     | Lưu tên mô hình và số chiều cùng vector, tính lại hàng loạt khi đổi                                                |

**Câu hỏi còn mở:**

1. ~~Nguồn có hiển thị giá vé theo từng suất không?~~ Đã có câu trả lời với Galaxy: API `sessions2` không có giá và `priceTables` của 14/14 rạp trong file chuẩn hoá đều `null`; dùng bảng giá mặc định `PriceRule`. Còn phải kiểm tra trang `/rap-gia-ve/{slug}/` xem có đọc được bảng giá không (khi đó `ShowtimePrice.source = CRAWLED`).
2. Có cần đặt vé cho khách chưa đăng nhập không (nếu có, bỏ ràng buộc `Booking.userId` hoặc tạo tài khoản khách).
3. Voucher có áp dụng cho bắp nước hay chỉ cho vé.
4. Phí dịch vụ tính cố định mỗi đơn hay theo số vé.
5. Có bán vé cho suất `kind = ENCORE` / `LIVE` (66 suất trong dữ liệu) hay chỉ hiển thị.
6. Địa danh hành chính: dữ liệu Galaxy dùng đơn vị mới (Phường, Tỉnh); cần bảng `Province` và `Ward` khớp danh mục hiện hành khi seed.
