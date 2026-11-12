# API Đặt vé, Giữ chỗ & Thanh toán CineHub (Booking & Payments API)

## 1. Giữ & Nhả Ghế Theo Suất Chiếu (Seat Holds)

### 1.1 Lấy Sơ đồ Ghế Thời Gian Thực

- **Endpoint:** `GET /api/v1/showtimes/:showtimeId/seats` (alias: `GET /api/v1/booking/showtimes/:showtimeId/seats`)
- **Xác thực:** Tùy chọn (`optionalAuth`)
- **Mô tả:** Trả về toàn bộ danh sách ghế trong phòng chiếu kèm trạng thái thời gian thực (`AVAILABLE`, `HELD`, `SOLD`, `BLOCKED`). Trường `isHeldByMe` là `true` nếu ghế đang được giữ bởi người dùng đang đăng nhập.
- **Response (200 OK):**

```json
{
  "data": [
    {
      "id": "showtime-seat-uuid",
      "seatId": "seat-uuid",
      "label": "F7",
      "rowLabel": "F",
      "colNumber": 7,
      "posX": 140,
      "posY": 100,
      "seatType": { "code": "VIP", "name": "Ghế VIP" },
      "status": "AVAILABLE",
      "isHeldByMe": false
    }
  ]
}
```

### 1.2 Giữ Ghế (Atomic Hold)

- **Endpoint:** `POST /api/v1/showtimes/:showtimeId/seat-holds`
- **Xác thực:** Bắt buộc (`requireAuth`)
- **Body:**

```json
{
  "showtimeId": "showtime-uuid",
  "seatIds": ["seat-uuid-1"]
}
```

- **Response (201 Created):**

```json
{
  "data": {
    "holdToken": "uuid-token",
    "expiresAt": "2026-11-13T12:02:00.000Z",
    "seatIds": ["seat-uuid-1"]
  }
}
```

- **Response (409 Conflict):** Nếu ghế đã bị người khác giữ hoặc đã bán.

```json
{
  "error": {
    "code": "SEAT_TAKEN",
    "message": "Một hoặc nhiều ghế đang được người khác giữ",
    "details": {
      "conflicts": ["seat-uuid-1"]
    }
  }
}
```

### 1.3 Nhả Ghế (Release Hold)

- **Endpoint:** `DELETE /api/v1/showtimes/:showtimeId/seat-holds`
- **Xác thực:** Bắt buộc (`requireAuth`)
- **Body:**

```json
{
  "showtimeId": "showtime-uuid",
  "seatIds": ["seat-uuid-1"]
}
```

- **Response (200 OK):**

```json
{
  "data": {
    "releasedCount": 1
  }
}
```

---

## 2. Tạo Booking & Khởi Tạo Thanh Toán (Checkout & Payments)

### 2.1 Tạo Đơn Đặt Vé (Checkout)

- **Endpoint:** `POST /api/v1/booking/checkout`
- **Xác thực:** Bắt buộc (`requireAuth`)
- **Body:**

```json
{
  "showtimeId": "showtime-uuid",
  "seatIds": ["seat-uuid-1", "seat-uuid-2"],
  "concessions": [{ "concessionId": "concession-uuid", "quantity": 1 }],
  "contactEmail": "khachhang@example.com",
  "contactPhone": "0901234567"
}
```

- **Response (201 Created):**

```json
{
  "data": {
    "id": "booking-uuid",
    "code": "CH261113ABCDEF",
    "status": "PENDING",
    "totalAmount": 270000,
    "contactEmail": "khachhang@example.com"
  }
}
```

### 2.2 Khởi Tạo Thanh Toán Cổng (Initiate Payment)

- **Endpoint:** `POST /api/v1/booking/:id/payments`
- **Xác thực:** Bắt buộc (`requireAuth`)
- **Body:**

```json
{
  "provider": "MOMO" // Hoặc "VNPAY", "ZALOPAY"
}
```

- **Response (200 OK):**

```json
{
  "data": {
    "paymentId": "payment-uuid",
    "provider": "MOMO",
    "txnRef": "CH261113ABCDEF_1700000000",
    "amount": 270000,
    "payUrl": "https://test-payment.momo.vn/v2/gateway/pay?s=...",
    "qrData": "momo://...",
    "qrCodeUrl": "https://test-payment.momo.vn/qr/..."
  }
}
```

### 2.3 Đối Soát Trạng Thái Thanh Toán Chủ Động (Refresh Payment)

- **Endpoint:** `POST /api/v1/booking/:id/payments/refresh`
- **Xác thực:** Bắt buộc (`requireAuth`)
- **Mô tả:** Hệ thống chủ động đối chiếu trạng thái giao dịch với cổng thanh toán (hoặc database), không phụ thuộc tham số từ URL client redirect.
- **Response (200 OK):** Trả về thông tin Booking mới nhất (status `CONFIRMED` nếu đã hoàn tất).

### 2.4 Lấy Thông Tin Chi Tiết Đơn Vé (Polling Status)

- **Endpoint:** `GET /api/v1/booking/:id` (hoặc `GET /api/v1/bookings/:id`)
- **Xác thực:** Bắt buộc (`requireAuth`)
- **Response (200 OK):**

```json
{
  "data": {
    "id": "booking-uuid",
    "code": "CH261113ABCDEF",
    "status": "CONFIRMED", // "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED"
    "totalAmount": 270000,
    "contactEmail": "khachhang@example.com",
    "showtime": {
      "movie": { "title": "Dune 3" },
      "cinema": { "name": "Galaxy Nguyen Du" },
      "auditorium": { "name": "Screen 1" },
      "startTime": "2026-11-13T19:00:00.000Z",
      "format": "2D"
    },
    "seats": [
      { "seatLabel": "F7", "price": 110000 },
      { "seatLabel": "F8", "price": 110000 }
    ],
    "tickets": [
      {
        "id": "ticket-uuid-1",
        "qrCode": "CINEHUB:TICKET:booking-uuid:ticket-uuid-1:hmac...",
        "status": "VALID"
      }
    ]
  }
}
```

### 2.5 Giả Lập Thanh Toán Sandbox (Dev Simulate)

- **Endpoint:** `POST /api/v1/dev/payments/:paymentId/simulate`
- **Điều kiện kích hoạt:** Chỉ mở khi `PAYMENT_ENV=sandbox` và `PAYMENT_SIMULATION=true`.
- **Body:** `{ "status": "SUCCESS" }`
- **Response (200 OK):** `{ "success": true, "message": "Simulated payment successfully" }`

---

## 3. Soát Vé Tại Rạp (Staff QR Scan)

- **Endpoint:** `POST /api/v1/tickets/scan`
- **Xác thực:** Yêu cầu quyền Staff/Admin (`requireAuth` + role check)
- **Body:**

```json
{
  "qrData": "CINEHUB:TICKET:booking-uuid:ticket-uuid:hmac..."
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "ticketId": "ticket-uuid",
    "status": "USED",
    "checkedInAt": "2026-11-13T18:45:00.000Z",
    "movie": "Dune 3",
    "seat": "F7",
    "screen": "Screen 1"
  }
}
```
