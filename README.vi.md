# Badminton Shop 🏸

[Read in English](./README.md)

Nền tảng thương mại điện tử full-stack cho thiết bị cầu lông, xây dựng với Node.js, Express và MySQL. Bao gồm RESTful API và Server-Side Rendering (Handlebars).

## Công nghệ

- **Backend**: Node.js, Express 5
- **Database**: MySQL 8 (`mysql2`, `express-mysql-session`)
- **Auth**: JWT (API) + Session (Web SSR), token_version force-logout
- **Template**: Handlebars (`express-handlebars`)
- **Email**: Nodemailer + Brevo SMTP
- **Logger**: Morgan

## Tính năng

- **Auth** — Đăng ký, đăng nhập, hồ sơ, đổi mật khẩu, quên/đặt lại mật khẩu (email), đăng xuất (blacklist token)
- **Sản phẩm** — CRUD, biến thể (SKU), hình ảnh, tìm kiếm/lọc, phân trang, sắp xếp theo độ phổ biến
- **Danh mục & Thương hiệu** — CRUD, soft delete/restore
- **Giỏ hàng** — Thêm, sửa số lượng, xóa, xóa tất cả (an toàn với race condition)
- **Đơn hàng** — Tạo, luồng trạng thái (`pending_payment → confirmed → preparing → shipping → completed`), hủy, tracking, lịch sử trạng thái
- **Thanh toán** — Thủ công (tiền mặt/chuyển khoản) + webhook callback
- **Voucher** — CRUD, áp dụng/hủy, giảm theo % hoặc số tiền
- **Đánh giá** — CRUD, soft delete (admin có thể xóa bất kỳ)
- **Yêu thích** — Thêm/xóa, soft delete, phát hiện trùng lặp
- **Banner** — CRUD, tự động sắp xếp `sort_order`, soft delete/restore
- **Kho hàng** — Điều chỉnh tồn kho, lịch sử giao dịch, cảnh báo tồn thấp
- **Dashboard Admin** — Doanh thu, đơn hàng/người dùng, sản phẩm bán chạy, biểu đồ doanh thu theo ngày
- **Quản lý người dùng** — Khóa/mở khóa (force logout qua `token_version++`), đổi vai trò, danh sách/tìm kiếm
- **Email** — Email chào mừng (đăng ký), email đặt lại mật khẩu

## Bắt đầu nhanh

### Yêu cầu

- Node.js 20+
- MySQL 8

### Cài đặt

```bash
git clone https://github.com/your-username/badminton-shop.git
cd badminton-shop
npm install
```

### Môi trường

Sao chép `.env` và cấu hình:

| Biến | Mô tả |
|------|-------|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | Kết nối MySQL |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | SMTP (Brevo hoặc nhà cung cấp khác) |
| `JWT_SECRET` | Chuỗi bí mật cho JWT |
| `APP_URL` | Ví dụ: `http://localhost:3000` |
| `SESSION_SECRET` | Chuỗi bí mật cho session cookie |

### Database

```bash
npm run seed
```

Tạo bảng và dữ liệu mẫu (100 người dùng, danh mục, thương hiệu, sản phẩm, biến thể, hình ảnh).

### Chạy

```bash
npm run dev    # Phát triển (nodemon)
npm start      # Production
```

### Tài khoản dùng thử

| Vai trò   | Email                       | Mật khẩu |
|-----------|-----------------------------|----------|
| Admin     | admin@badmintonshop.com     | 123456   |
| Nhân viên | staff@badmintonshop.com     | 123456   |
| Khách hàng| customer1@gmail.com         | 123456   |

## Tài liệu API

- **Postman** — Import `testapi.json` (file collection trong thư mục gốc)
- **Swagger** — *(sắp ra mắt)*

### Xác thực

Tất cả endpoint cần bảo vệ đều yêu cầu header `Authorization: Bearer <token>`.

### Base URL

```
http://localhost:3000/api
```

### Endpoint chính

| Nhóm       | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/register`, `/auth/login`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/change-password`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Sản phẩm   | `GET /products`, `GET /products/search`, `GET /products/:slug`, `GET /products/newest/:categorySlug`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `PUT /products/:id/restore` |
| Giỏ hàng   | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Đơn hàng   | `POST /orders`, `GET /orders`, `GET /orders/all`, `GET /orders/:code`, `POST /orders/:code/cancel`, `PUT /orders/:code/status`, `PUT /orders/:code/tracking` |
| Banner     | `GET /banners`, `GET /banners/:id`, `POST /banners`, `PUT /banners/:id`, `DELETE /banners/:id`, `PUT /banners/:id/restore` |
| Đánh giá   | `GET /reviews/:productSlug`, `POST /reviews/:productSlug`, `PUT /reviews/:id`, `DELETE /reviews/:id` |
| Yêu thích  | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:productId` |
| Admin      | `GET /dashboard`, `GET /users`, `PUT /users/:id/ban`, `PUT /users/:id/unban`, `PUT /users/:id/role` |
| ...        | Xem `testapi.json` để biết danh sách đầy đủ |

## Cấu trúc thư mục

```
src/
├── config/           # Cấu hình database, mail
├── controllers/      # Xử lý request (API + Web SSR)
├── database/         # SQL schema, seed
├── helpers/          # Hàm trả response (sendSuccess, sendError)
├── middlewares/      # Auth (JWT/session), error handler, validate
├── models/           # Truy vấn database
├── routes/           # Định nghĩa route Express
├── services/         # Logic nghiệp vụ
└── views/            # Template Handlebars (SSR + email)
    ├── layouts/
    ├── partials/
    └── emails/
```

## Triển khai

Tối ưu cho **Render** (Web Service — Node hoặc Docker).

```bash
# Build Docker image
docker build -t badminton-shop .

# Chạy với biến môi trường
docker run -p 3000:3000 --env-file .env badminton-shop
```

**Lưu ý**: Ảnh upload không được lưu vĩnh viễn trên Render. Dùng storage ngoài (Cloudinary, AWS S3) cho production.

## Giấy phép

MIT © 2026 Hoa Vi Khang
