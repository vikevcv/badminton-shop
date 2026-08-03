# Badminton Shop 🏸

[Read in English](./README.md)

Nền tảng thương mại điện tử full-stack cho thiết bị cầu lông, xây dựng với Node.js, Express và MySQL. Bao gồm RESTful API và Server-Side Rendering (Handlebars).

## Công nghệ

- **Backend**: Node.js, Express 5
- **Database**: MySQL 8 (`mysql2`)
- **Auth**: JWT (access + refresh tokens, HttpOnly cookies), token_version force-logout
- **Upload**: Multer (lưu tạm) + Cloudinary (async qua hàng đợi BullMQ + Redis)
- **Template**: Handlebars (`express-handlebars`)
- **Email**: Nodemailer + Brevo SMTP
- **Logger**: Morgan

## Tính năng

- **Auth** — Đăng ký, đăng nhập, hồ sơ, đổi mật khẩu, quên/đặt lại mật khẩu (email), đăng xuất (token_version force-logout)
- **Sản phẩm** — CRUD, biến thể (SKU), hình ảnh, tìm kiếm/lọc, phân trang, sắp xếp theo độ phổ biến
- **Danh mục & Thương hiệu** — CRUD, soft delete/restore
- **Giỏ hàng** — Thêm, sửa số lượng, xóa, xóa tất cả (an toàn với race condition)
- **Đơn hàng** — Tạo, luồng trạng thái (`pending_payment → confirmed → preparing → shipping → completed`), hủy, tracking, lịch sử trạng thái
- **Thanh toán** — Thủ công (tiền mặt/chuyển khoản) + VNPay (sandbox) có IPN webhook callback
- **Voucher** — CRUD, áp dụng/hủy, giảm theo % hoặc số tiền
- **Đánh giá** — CRUD, soft delete (admin có thể xóa bất kỳ)
- **Yêu thích** — Thêm/xóa, soft delete, phát hiện trùng lặp
- **Banner** — CRUD, tự động sắp xếp `sort_order`, soft delete/restore
- **Kho hàng** — Điều chỉnh tồn kho, lịch sử giao dịch, cảnh báo tồn thấp
- **Dashboard Admin** — Doanh thu, đơn hàng/người dùng, sản phẩm bán chạy, biểu đồ doanh thu theo ngày
- **Quản lý người dùng** — Khóa/mở khóa (force logout qua `token_version++`), đổi vai trò, danh sách/tìm kiếm
- **Email** — Email chào mừng (đăng ký), email đặt lại mật khẩu
- **Upload** — Async Cloudinary upload (sản phẩm, thương hiệu, banner) qua BullMQ + Redis. File tạm → enqueue → worker process upload → URL Cloudinary. Tự retry + dọn dẹp.

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
| `JWT_ACCESS_EXPIRES` | Thời gian sống của access token (mặc định `30m`) |
| `JWT_REFRESH_EXPIRES` | Thời gian sống của refresh token (mặc định `7d`) |
| `PAYMENT_CALLBACK_SECRET` | Chuỗi bí mật cho webhook thanh toán |
| `REFRESH_COOKIE_SECRET` | Chuỗi bí mật ký cookie auth HttpOnly |
| `CLOUDINARY_CLOUD_NAME` | Tên cloud Cloudinary |
| `CLOUDINARY_API_KEY` | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary |
| `REDIS_HOST` | Host Redis (mặc định `localhost`) |
| `REDIS_PORT` | Port Redis (mặc định `6379`) |
| `REDIS_PASSWORD` | Mật khẩu Redis (tùy chọn) |
| `REDIS_DB` | Index DB Redis (mặc định `0`) |
| `UPLOAD_MAX_RETRY` | Số lần retry tối đa khi upload lỗi (mặc định `3`) |
| `UPLOAD_BACKOFF_DELAY` | Thời gian chờ giữa các lần retry (ms, mặc định `2000`) |
| `UPLOAD_CONCURRENCY` | Số worker chạy song song (mặc định `5`) |
| `VNP_TMN_CODE` | Mã merchant VNPay (sandbox) |
| `VNP_HASH_SECRET` | Chuỗi bí mật hash VNPay |
| `VNP_PAY_URL` | URL cổng thanh toán VNPay |
| `VNP_QUERY_URL` | URL truy vấn giao dịch VNPay |
| `VNP_RETURN_URL` | URL return VNPay (vd `{APP_URL}/payment/return`) |
| `VNP_IPN_URL` | URL IPN webhook VNPay (vd `{APP_URL}/api/webhooks/vnpay`) |

### Database

```bash
# Tạo database (chạy 1 lần)
mysql -u root -p < database/1_createDB.sql

# Tạo bảng (chạy 1 lần)
mysql -u root -p < database/2_createTable.sql

# Chèn dữ liệu mẫu (100 người dùng, danh mục, thương hiệu, sản phẩm, biến thể, hình ảnh)
npm run seed
```

> **Lưu ý**: `npm run seed` chỉ truncate rồi chèn lại dữ liệu mẫu — nó **không** tạo bảng. Phải chạy các script SQL trong `database/` trước.

### Chạy

```bash
npm run dev      # Phát triển (nodemon)
npm run worker   # Upload worker (BullMQ, process riêng)
npm run dev:all  # Dev + worker chạy song song
npm start        # Production
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
Refresh token được lưu trong HttpOnly signed cookies (`accessToken` + `refreshToken`) cho browser, và trả về trong response body cho mobile/SPA.

### Base URL

```
http://localhost:3000/api
```

### Endpoint chính

| Nhóm       | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/change-password`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Sản phẩm   | `GET /products`, `GET /products/search`, `GET /products/:slug`, `GET /products/newest/:categorySlug`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `PUT /products/:id/restore`, `PUT /products/:id/slug` |
| Biến thể   | `POST /products/:id/variants`, `PUT /products/:id/variants/:vid`, `DELETE /products/:id/variants/:vid`, `PUT /products/:id/variants/:vid/restore` |
| Ảnh SP     | `POST /products/:id/images`, `PUT /products/:id/images/:iid`, `DELETE /products/:id/images/:iid`, `PUT /products/:id/images/:iid/restore` |
| Danh mục   | `GET /categories`, `GET /categories/:id`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`, `PUT /categories/:id/restore` |
| Thương hiệu| `GET /brands`, `GET /brands/:id`, `POST /brands`, `PUT /brands/:id`, `DELETE /brands/:id`, `PUT /brands/:id/restore` |
| Giỏ hàng   | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Đơn hàng   | `POST /orders`, `GET /orders`, `GET /orders/all`, `GET /orders/:code`, `GET /orders/:code/status-history`, `GET /orders/:code/payments`, `POST /orders/:code/cancel`, `PUT /orders/:code/status`, `PUT /orders/:code/tracking` |
| Địa chỉ    | `GET /addresses`, `GET /addresses/:id`, `POST /addresses`, `PUT /addresses/:id`, `DELETE /addresses/:id`, `PUT /addresses/:id/restore` |
| Thanh toán  | `POST /payments`, `GET /payments/:code/status` |
| Voucher     | `GET /vouchers`, `POST /vouchers/validate`, `GET /vouchers/:code`, `POST /vouchers`, `PUT /vouchers/:code`, `DELETE /vouchers/:code` |
| Đánh giá   | `GET /reviews/:productSlug`, `POST /reviews/:productSlug`, `PUT /reviews/:id`, `DELETE /reviews/:id` |
| Yêu thích  | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:productId` |
| Banner     | `GET /banners`, `GET /banners/:id`, `POST /banners`, `PUT /banners/:id`, `DELETE /banners/:id`, `PUT /banners/:id/restore` |
| Kho hàng   | `GET /inventory`, `PUT /inventory/:variantId`, `GET /inventory/transactions` |
| Khách hàng | `GET /customer`, `GET /customer/profile`, `PUT /customer/profile`, `GET /customer/:id/orders` |
| Dashboard  | `GET /dashboard` |
| Users      | `GET /users`, `GET /users/:id`, `PUT /users/:id/ban`, `PUT /users/:id/unban`, `PUT /users/:id/role` |
| Webhooks   | `GET /webhooks/vnpay` |

## Cấu trúc thư mục

```
src/
├── config/           # Cấu hình database, mail, Cloudinary, Redis
├── controllers/      # Xử lý request (API + Web SSR)
├── helpers/          # Hàm trả response (sendSuccess, sendError)
├── middlewares/      # Auth, error handler, validate, upload file (multer)
├── models/           # Truy vấn database
├── queues/           # Định nghĩa hàng đợi BullMQ (upload)
├── routes/           # Định nghĩa route Express
├── services/         # Logic nghiệp vụ, upload service, cloudinary service
├── views/            # Template Handlebars (SSR + email)
│   ├── layouts/
│   ├── partials/
│   └── emails/
└── workers/          # Worker process BullMQ (upload)
```

## Triển khai

Tối ưu cho **Render** (Web Service — Node hoặc Docker).

```bash
# Build Docker image
docker build -t badminton-shop .

# Chạy với biến môi trường
docker run -p 3000:3000 --env-file .env badminton-shop
```

**Lưu ý**: Upload file sử dụng BullMQ + Redis worker chạy riêng process. File upload lên Cloudinary async, worker tự xử lý retry + cleanup file tạm. Chạy `npm run dev:all` để khởi động cả dev server và upload worker.

## Giấy phép

MIT © 2026 Hoa Vi Khang
