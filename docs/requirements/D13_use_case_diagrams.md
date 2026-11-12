# CINEHUB - BIỂU ĐỒ USE CASE HỆ THỐNG

## D13: Use Case Diagrams (Mục 3.6.1 – 3.6.6)

Tài liệu này bao gồm **6 biểu đồ Use Case** chuẩn UML 2.5 được mô hình hóa bằng cú pháp **Mermaid** (chuẩn tương thích với GitHub, VS Code Mermaid Preview) và kèm mã **PlantUML** tương ứng.

Các quan hệ quan trọng theo yêu cầu đặc tả:

- **`<<include>>` (Bắt buộc bao gồm)**: _Xác thực tài khoản (Authentication)_ được `<<include>>` vào các Use Case quan trọng như Đặt vé, Thanh toán, Đánh giá phim và các chức năng Quản trị.
- **`<<extend>>` (Mở rộng tùy chọn)**: _Áp dụng mã giảm giá / Voucher (Apply Voucher)_ là quan hệ `<<extend>>` mở rộng cho Use Case _Thanh toán đơn hàng (Process Payment)_.

---

### 3.6.1. Biểu đồ Use Case Tổng quan Toàn hệ thống (System Overview)

#### Mô tả các Actor:

- **Khách vãng lai (Guest)**: Khách chưa đăng nhập, có thể tra cứu phim, lịch chiếu, chat hỏi đáp cơ bản với CineBot.
- **Thành viên (Customer)**: Người dùng đã đăng ký, thực hiện đặt vé, giữ ghế, mua bắp nước, áp voucher, thanh toán và quản lý vé.
- **Nhân viên soát vé (Cinema Staff)**: Nhân viên tại rạp thực hiện quét mã QR vé và soát vé vào phòng chiếu.
- **Quản trị viên (System Admin)**: Quản lý toàn bộ danh mục, lịch chiếu, giá vé, voucher, báo cáo doanh thu và crawler.
- **External Systems**: Cổng thanh toán VNPay/ZaloPay, Google OAuth, Galaxy Cinema API, Gemini AI API, SMTP Mail.

```mermaid
flowchart LR
    %% Actors
    subgraph Actors_Group ["TÁC NHÂN (ACTORS)"]
        Guest["Khách vãng lai<br/>(Guest)"]
        Customer["Thành viên<br/>(Customer)"]
        Staff["Nhân viên soát vé<br/>(Cinema Staff)"]
        Admin["Quản trị viên<br/>(Admin)"]
    end

    %% External Systems
    subgraph Ext_Group ["HỆ THỐNG NGOẠI VI"]
        Ext_OAuth["Google OAuth"]
        Ext_Pay["Cổng VNPay / ZaloPay"]
        Ext_AI["Google Gemini AI"]
        Ext_Mail["SMTP Mail Server"]
    end

    %% Subsystems Boundary
    subgraph CineHub_System ["HỆ THỐNG CINEHUB"]
        subgraph Sub_Auth ["1. Phân hệ Tài khoản"]
            UC_Auth["Đăng ký / Đăng nhập / Quản lý hồ sơ"]
        end

        subgraph Sub_Discovery ["2. Phân hệ Khám phá"]
            UC_Disc["Xem phim, tra cứu lịch chiếu & Đánh giá"]
        end

        subgraph Sub_Booking ["3. Phân hệ Đặt vé"]
            UC_Book["Chọn ghế, giữ ghế & mua bắp nước"]
        end

        subgraph Sub_Payment ["4. Phân hệ Thanh toán & Vé"]
            UC_Pay["Thanh toán, áp voucher & nhận vé QR"]
        end

        subgraph Sub_Checkin ["5. Phân hệ Soát vé"]
            UC_Check["Quét QR & Đối soát vé vào rạp"]
        end

        subgraph Sub_Admin ["6. Phân hệ Quản trị"]
            UC_Adm["Quản lý phim, lịch, giá, voucher & báo cáo"]
        end

        subgraph Sub_AI ["7. Phân hệ Trợ lý AI"]
            UC_Bot["Chatbot CineBot tư vấn & gợi ý phim"]
        end
    end

    %% Actor Connections
    Guest --> UC_Auth
    Guest --> UC_Disc
    Guest --> UC_Bot

    Customer -- Kế thừa quyền --> Guest
    Customer --> UC_Booking
    Customer --> UC_Payment
    Customer --> UC_Disc

    Staff --> UC_Check

    Admin --> UC_Admin

    %% External System Connections
    UC_Auth <--> Ext_OAuth
    UC_Payment <--> Ext_Pay
    UC_Payment --> Ext_Mail
    UC_Bot <--> Ext_AI
```

---

### 3.6.2. Phân hệ Xác thực & Quản lý tài khoản (Auth & Profile - 3.6.2)

```mermaid
flowchart LR
    %% Actors
    Actor_User["Người dùng<br/>(User / Guest)"]
    Actor_OAuth["Google Identity<br/>(OAuth 2.0)"]
    Actor_Mail["Mail Server<br/>(Nodemailer)"]

    subgraph Boundary_Auth ["PHÂN HỆ XÁC THỰC & TÀI KHOẢN (AUTH & PROFILE)"]
        UC_Register(["Đăng ký tài khoản"])
        UC_Login(["Đăng nhập hệ thống"])
        UC_Login_Local(["Đăng nhập bằng Email/Password"])
        UC_Login_Google(["Đăng nhập bằng Google"])
        UC_Forgot(["Quên / Đặt lại mật khẩu"])
        UC_SendOTP(["Gửi mã OTP qua Email"])
        UC_Profile(["Cập nhật hồ sơ cá nhân"])
        UC_ChangePass(["Đổi mật khẩu"])
        UC_Logout(["Đăng xuất"])
        UC_Validate(["Xác thực tính hợp lệ biểu mẫu"])
    end

    %% Connections
    Actor_User --> UC_Register
    Actor_User --> UC_Login
    Actor_User --> UC_Forgot
    Actor_User --> UC_Profile
    Actor_User --> UC_ChangePass
    Actor_User --> UC_Logout

    %% Generalizations
    UC_Login_Local -.->|is-a| UC_Login
    UC_Login_Google -.->|is-a| UC_Login

    %% Includes & Extends
    UC_Register -.->|<<include>>| UC_Validate
    UC_Forgot -.->|<<include>>| UC_SendOTP
    UC_ChangePass -.->|<<include>>| UC_Login

    %% External Connections
    UC_Login_Google <--> Actor_OAuth
    UC_SendOTP --> Actor_Mail
```

---

### 3.6.3. Phân hệ Khám phá phim & Lịch chiếu (Discovery & Showtimes - 3.6.3)

```mermaid
flowchart LR
    %% Actors
    Actor_Guest["Khách xem phim<br/>(Guest)"]
    Actor_Cust["Thành viên<br/>(Customer)"]
    Actor_Gemini["Gemini AI<br/>(Embeddings & RAG)"]

    subgraph Boundary_Discovery ["PHÂN HỆ KHÁM PHÁ & LỊCH CHIẾU (DISCOVERY)"]
        UC_ViewList(["Xem danh sách phim<br/>(Đang chiếu / Sắp chiếu)"])
        UC_ViewDetail(["Xem chi tiết phim & Trailer"])
        UC_SearchFilter(["Tìm kiếm & Lọc phim nâng cao"])
        UC_Showtimes(["Tra cứu lịch chiếu theo ngày & rạp"])
        UC_WriteReview(["Đánh giá & Bình luận phim"])
        UC_ChatAI(["Trò chuyện với CineBot gợi ý phim"])
        UC_Auth(["Xác thực tài khoản"])
    end

    %% Inheritance
    Actor_Cust -- Generalizes --> Actor_Guest

    %% Connections
    Actor_Guest --> UC_ViewList
    Actor_Guest --> UC_ViewDetail
    Actor_Guest --> UC_SearchFilter
    Actor_Guest --> UC_Showtimes
    Actor_Guest --> UC_ChatAI

    Actor_Cust --> UC_WriteReview

    %% Include Relationship
    UC_WriteReview -.->|<<include>>| UC_Auth

    %% AI External
    UC_ChatAI <--> Actor_Gemini
```

---

### 3.6.4. Phân hệ Chọn ghế & Đặt vé (Seat Selection & Booking - 3.6.4)

> **Trọng tâm**: Sử dụng quan hệ `<<include>>` Xác thực tài khoản khi tiến hành xác nhận đặt vé và giữ ghế 15 phút.

```mermaid
flowchart LR
    %% Actors
    Actor_Cust["Thành viên<br/>(Customer)"]
    Actor_Redis["Redis Cache<br/>(Lock Leases 15m)"]

    subgraph Boundary_Booking ["PHÂN HỆ CHỌN GHẾ & ĐẶT VÉ (BOOKING ENGINE)"]
        UC_SelectShowtime(["Chọn suất chiếu"])
        UC_ViewSeatMap(["Xem sơ đồ ghế thời gian thực"])
        UC_SelectSeats(["Chọn vị trí ghế ngồi"])
        UC_LockSeats(["Khóa giữ ghế 15 phút<br/>(SET NX EX)"])
        UC_CheckSeatRule(["Kiểm tra luật không bỏ ghế trống"])
        UC_SelectConcession(["Chọn Combo bắp nước"])
        UC_Preview3D(["Xem mô phỏng góc nhìn 3D"])
        UC_ProceedBooking(["Xác nhận đặt vé & Tiếp tục"])
        UC_Authenticate(["Xác thực tài khoản<br/>(Authentication)"])
    end

    %% Connections
    Actor_Cust --> UC_SelectShowtime
    Actor_Cust --> UC_ViewSeatMap
    Actor_Cust --> UC_SelectSeats
    Actor_Cust --> UC_SelectConcession
    Actor_Cust --> UC_ProceedBooking

    %% <<include>> Relationships
    UC_SelectSeats -.->|<<include>>| UC_LockSeats
    UC_SelectSeats -.->|<<include>>| UC_CheckSeatRule
    UC_ProceedBooking -.->|<<include>>| UC_Authenticate

    %% <<extend>> Relationship
    UC_Preview3D -.->|<<extend>>| UC_SelectSeats

    %% Cache Lock
    UC_LockSeats <--> Actor_Redis
```

---

### 3.6.5. Phân hệ Thanh toán, Vé điện tử & Soát vé (Payment, Ticket & Check-in - 3.6.5)

> **Trọng tâm**: Sử dụng quan hệ `<<extend>>` Áp dụng mã giảm giá (Voucher) và `<<include>>` Xác thực giao dịch / Cổng thanh toán.

```mermaid
flowchart LR
    %% Actors
    Actor_Cust["Khách hàng<br/>(Customer)"]
    Actor_Staff["Nhân viên soát vé<br/>(Cinema Staff)"]
    Actor_Gateway["Cổng thanh toán<br/>(VNPay / ZaloPay)"]
    Actor_Mail["Dịch vụ Email<br/>(Nodemailer)"]

    subgraph Boundary_Payment_Checkin ["PHÂN HỆ THANH TOÁN, VÉ & SOÁT VÉ"]
        %% Payment Group
        UC_ProcessPayment(["Thanh toán đơn hàng<br/>(Process Payment)"])
        UC_ApplyVoucher(["Áp dụng mã giảm giá<br/>(Apply Voucher)"])
        UC_VerifyGateway(["Xác thực cổng thanh toán<br/>(Verify IPN Signature)"])
        UC_GenerateTicket(["Sinh vé điện tử QR Code<br/>(HMAC Token)"])
        UC_SendTicketMail(["Gửi vé qua Email"])
        UC_ViewMyTickets(["Xem lịch sử vé đã mua"])

        %% Check-in Group
        UC_ScanQR(["Quét mã QR vé tại rạp"])
        UC_VerifyTicket(["Xác thực vé & Chống quay vòng<br/>(Anti-Passback)"])
        UC_ManualCheckin(["Check-in thủ công qua Mã/SĐT"])
    end

    %% Customer Connections
    Actor_Cust --> UC_ProcessPayment
    Actor_Cust --> UC_ViewMyTickets

    %% Staff Connections
    Actor_Staff --> UC_ScanQR
    Actor_Staff --> UC_ManualCheckin

    %% <<extend>> Quan hệ Áp Voucher mở rộng cho Thanh toán
    UC_ApplyVoucher -.->|<<extend>>| UC_ProcessPayment

    %% <<include>> Quan hệ bắt buộc Xác thực cổng thanh toán & Sinh vé
    UC_ProcessPayment -.->|<<include>>| UC_VerifyGateway
    UC_ProcessPayment -.->|<<include>>| UC_GenerateTicket
    UC_GenerateTicket -.->|<<include>>| UC_SendTicketMail
    UC_ScanQR -.->|<<include>>| UC_VerifyTicket

    %% External Systems
    UC_VerifyGateway <--> Actor_Gateway
    UC_SendTicketMail --> Actor_Mail
```

---

### 3.6.6. Phân hệ Quản trị hệ thống (System & Cinema Administration - 3.6.6)

> **Trọng tâm**: Toàn bộ chức năng quản trị bắt buộc `<<include>>` Xác thực quyền Quản trị viên (Admin Authentication / RBAC).

```mermaid
flowchart LR
    %% Actors
    Actor_Admin["Quản trị viên<br/>(System Admin)"]
    Actor_Crawler["Galaxy API Service<br/>(External Aggregator)"]

    subgraph Boundary_Admin ["PHÂN HỆ QUẢN TRỊ HỆ THỐNG (ADMINISTRATION)"]
        UC_AdminAuth(["Xác thực Quản trị viên<br/>(Admin Auth / RBAC)"])
        UC_ManageMovies(["Quản lý danh mục phim<br/>(CRUD, Ẩn/Hiện)"])
        UC_ManageShowtimes(["Quản lý lịch chiếu<br/>(Lập lịch, Xếp phòng)"])
        UC_ManagePriceRules(["Cấu hình quy tắc giá vé<br/>(2D/3D, VIP, Cuối tuần)"])
        UC_ManageVouchers(["Quản lý chiến dịch Voucher<br/>(Tạo mã, Hạn mức)"])
        UC_ViewRevenue(["Báo cáo thống kê doanh thu<br/>(Biểu đồ, Xuất CSV/Excel)"])
        UC_TriggerCrawler(["Giám sát & Kích hoạt Crawler<br/>(Manual Crawl Sync)"])
    end

    %% Actor Connections
    Actor_Admin --> UC_ManageMovies
    Actor_Admin --> UC_ManageShowtimes
    Actor_Admin --> UC_ManagePriceRules
    Actor_Admin --> UC_ManageVouchers
    Actor_Admin --> UC_ViewRevenue
    Actor_Admin --> UC_TriggerCrawler

    %% <<include>> Admin Auth
    UC_ManageMovies -.->|<<include>>| UC_AdminAuth
    UC_ManageShowtimes -.->|<<include>>| UC_AdminAuth
    UC_ManagePriceRules -.->|<<include>>| UC_AdminAuth
    UC_ManageVouchers -.->|<<include>>| UC_AdminAuth
    UC_ViewRevenue -.->|<<include>>| UC_AdminAuth
    UC_TriggerCrawler -.->|<<include>>| UC_AdminAuth

    %% Crawler External
    UC_TriggerCrawler <--> Actor_Crawler
```

---

### PHẦN BỔ SUNG: MÃ NGUỒN PLANTUML DÀNH CHO BÁO CÁO WORD / LATEX

Nếu bạn cần xuất ảnh vector chuẩn UML qua PlantUML (PlantText / VS Code PlantUML Extension), dưới đây là mã nguồn tương ứng:

<details>
<summary><b>Click để xem mã nguồn PlantUML cho cả 6 biểu đồ</b></summary>

```plantuml
@startuml CineHub_UseCases_Complete
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "Khách vãng lai\n(Guest)" as Guest
actor "Thành viên\n(Customer)" as Customer
actor "Nhân viên rạp\n(Staff)" as Staff
actor "Quản trị viên\n(Admin)" as Admin
actor "VNPay / ZaloPay" as PaymentGateway <<External>>
actor "Google OAuth" as GoogleOAuth <<External>>

Customer -up-|> Guest

rectangle "CineHub Platform" {
  ' Auth & Profile
  usecase "Đăng nhập / Đăng ký" as UC_Auth
  usecase "Xác thực tài khoản" as UC_Auth_Check
  usecase "Quản lý hồ sơ cá nhân" as UC_Profile

  ' Discovery
  usecase "Khám phá phim & Lịch chiếu" as UC_Discovery
  usecase "Đánh giá & Bình luận phim" as UC_Review
  usecase "Chat tư vấn phim (CineBot)" as UC_ChatAI

  ' Booking
  usecase "Chọn suất chiếu & Ghế ngồi" as UC_SelectSeats
  usecase "Khóa giữ ghế 15 phút" as UC_LockSeats
  usecase "Chọn combo bắp nước" as UC_Concessions
  usecase "Xem mô phỏng 3D phòng chiếu" as UC_3DView
  usecase "Xác nhận đặt vé" as UC_Booking

  ' Payment & Tickets
  usecase "Thanh toán đơn hàng" as UC_Payment
  usecase "Áp dụng mã giảm giá (Voucher)" as UC_Voucher
  usecase "Nhận vé điện tử QR Code" as UC_Ticket

  ' Check-in
  usecase "Quét QR & Đối soát vé tại rạp" as UC_ScanQR

  ' Admin
  usecase "Quản trị danh mục phim & Lịch" as UC_Admin_Catalog
  usecase "Cấu hình bảng giá (Price Rules)" as UC_Admin_Price
  usecase "Quản trị mã khuyến mãi (Voucher)" as UC_Admin_Voucher
  usecase "Báo cáo thống kê & Doanh thu" as UC_Admin_Report
}

' Guest connections
Guest --> UC_Auth
Guest --> UC_Discovery
Guest --> UC_ChatAI

' Customer connections
Customer --> UC_Profile
Customer --> UC_SelectSeats
Customer --> UC_Concessions
Customer --> UC_Booking
Customer --> UC_Payment
Customer --> UC_Review

' Staff connections
Staff --> UC_ScanQR

' Admin connections
Admin --> UC_Admin_Catalog
Admin --> UC_Admin_Price
Admin --> UC_Admin_Voucher
Admin --> UC_Admin_Report

' Include relationships
UC_Booking .> UC_Auth_Check : <<include>>
UC_Review .> UC_Auth_Check : <<include>>
UC_SelectSeats .> UC_LockSeats : <<include>>
UC_Payment .> UC_Ticket : <<include>>

UC_Admin_Catalog .> UC_Auth_Check : <<include>>
UC_Admin_Price .> UC_Auth_Check : <<include>>
UC_Admin_Voucher .> UC_Auth_Check : <<include>>
UC_Admin_Report .> UC_Auth_Check : <<include>>

' Extend relationships
UC_3DView .> UC_SelectSeats : <<extend>>
UC_Voucher .> UC_Payment : <<extend>>

' External connections
UC_Auth <--> GoogleOAuth
UC_Payment <--> PaymentGateway

@enduml
```

</details>
