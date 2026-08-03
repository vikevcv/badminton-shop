# Badminton Shop 🏸

[Xem bản tiếng Việt tại đây](./README.vi.md)

Full-stack e-commerce platform for badminton equipment built with Node.js, Express, and MySQL. Features both a RESTful API and Server-Side Rendering (Handlebars).

## Tech Stack

- **Backend**: Node.js, Express 5
- **Database**: MySQL 8 (via `mysql2`)
- **Auth**: JWT (access + refresh tokens, HttpOnly cookies), token_version force-logout
- **Upload**: Multer (temp storage) + Cloudinary (async via BullMQ + Redis queue)
- **Template**: Handlebars (`express-handlebars`)
- **Email**: Nodemailer + Brevo SMTP
- **Logger**: Morgan

## Features

- **Auth** — Register, login, profile, change password, forgot/reset password (email), logout (token_version force-logout)
- **Products** — CRUD, variants (SKU), images, search/filter, pagination, sort by popularity
- **Categories & Brands** — CRUD, soft delete/restore
- **Cart** — Add, update quantity, remove, clear (race-condition safe)
- **Orders** — Create, status flow (`pending_payment → confirmed → preparing → shipping → completed`), cancel, tracking, status history
- **Payments** — Manual (cash/bank transfer) + VNPay (sandbox) with IPN webhook callback
- **Vouchers** — CRUD, apply/cancel, percent/fixed discount
- **Reviews** — CRUD, soft delete (admin bypass)
- **Wishlist** — Add/remove, soft delete, duplicate detection
- **Banners** — CRUD, auto reorder `sort_order`, soft delete/restore
- **Inventory** — Adjust stock, transaction history, low-stock alerts
- **Admin Dashboard** — Revenue, orders/users count, top products, revenue by day, status distribution
- **User Management** — Ban/unban (force logout via `token_version++`), role change, list/search
- **Email** — Welcome email (register), forgot password email
- **Upload** — Async Cloudinary upload (products, brands, banners) via BullMQ + Redis. File temp → enqueue → worker process uploads → Cloudinary URL. Auto retry + cleanup.

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8

### Installation

```bash
git clone https://github.com/your-username/badminton-shop.git
cd badminton-shop
npm install
```

### Environment

Copy `.env` and configure:

| Variable | Description |
|----------|-------------|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL connection |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | Brevo SMTP (or any provider) |
| `JWT_SECRET` | Random secret for JWT signing |
| `APP_URL` | e.g. `http://localhost:3000` |
| `JWT_ACCESS_EXPIRES` | Access token expiry (default `30m`) |
| `JWT_REFRESH_EXPIRES` | Refresh token expiry (default `7d`) |
| `PAYMENT_CALLBACK_SECRET` | Secret for payment webhook callbacks |
| `REFRESH_COOKIE_SECRET` | Secret for signing HttpOnly auth cookies |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `REDIS_HOST` | Redis host (default `localhost`) |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_PASSWORD` | Redis password (optional) |
| `REDIS_DB` | Redis DB index (default `0`) |
| `UPLOAD_MAX_RETRY` | Max retry for failed uploads (default `3`) |
| `UPLOAD_BACKOFF_DELAY` | Retry backoff delay in ms (default `2000`) |
| `UPLOAD_CONCURRENCY` | Worker concurrency (default `5`) |
| `VNP_TMN_CODE` | VNPay merchant code (sandbox) |
| `VNP_HASH_SECRET` | VNPay hash secret |
| `VNP_PAY_URL` | VNPay payment gateway URL |
| `VNP_QUERY_URL` | VNPay transaction query URL |
| `VNP_RETURN_URL` | VNPay return URL (e.g. `{APP_URL}/payment/return`) |
| `VNP_IPN_URL` | VNPay IPN webhook URL (e.g. `{APP_URL}/api/webhooks/vnpay`) |

### Database

```bash
# Create database (once)
mysql -u root -p < database/1_createDB.sql

# Create tables (once)
mysql -u root -p < database/2_createTable.sql

# Insert sample data (100 users, categories, brands, products, variants, images)
npm run seed
```

> **Note**: `npm run seed` only truncates and re-inserts sample data — it does **not** create tables. Run the SQL scripts in `database/` first.

### Run

```bash
npm run dev      # Development (nodemon)
npm run worker   # Upload worker (BullMQ, separate process)
npm run dev:all  # Dev + worker concurrently
npm start        # Production
```

### Test Accounts

| Role     | Email                       | Password |
|----------|-----------------------------|----------|
| Admin    | admin@badmintonshop.com     | 123456   |
| Staff    | staff@badmintonshop.com     | 123456   |
| Customer | customer1@gmail.com         | 123456   |

## API Documentation

- **Postman** — Import `testapi.json` (collection in project root) for a complete set of API requests
- **Swagger** — *(coming soon)*

### Auth

All protected endpoints require `Authorization: Bearer <token>` header.
Refresh tokens are stored in HttpOnly signed cookies (`accessToken` + `refreshToken`) for browser clients, and returned in response body for mobile/SPA clients.

### Base URL

```
http://localhost:3000/api
```

### Key Endpoints

| Group      | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/change-password`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Products   | `GET /products`, `GET /products/search`, `GET /products/:slug`, `GET /products/newest/:categorySlug`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `PUT /products/:id/restore`, `PUT /products/:id/slug` |
| Variants   | `POST /products/:id/variants`, `PUT /products/:id/variants/:vid`, `DELETE /products/:id/variants/:vid`, `PUT /products/:id/variants/:vid/restore` |
| Images     | `POST /products/:id/images`, `PUT /products/:id/images/:iid`, `DELETE /products/:id/images/:iid`, `PUT /products/:id/images/:iid/restore` |
| Categories | `GET /categories`, `GET /categories/:id`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`, `PUT /categories/:id/restore` |
| Brands     | `GET /brands`, `GET /brands/:id`, `POST /brands`, `PUT /brands/:id`, `DELETE /brands/:id`, `PUT /brands/:id/restore` |
| Cart       | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Orders     | `POST /orders`, `GET /orders`, `GET /orders/all`, `GET /orders/:code`, `GET /orders/:code/status-history`, `GET /orders/:code/payments`, `POST /orders/:code/cancel`, `PUT /orders/:code/status`, `PUT /orders/:code/tracking` |
| Addresses  | `GET /addresses`, `GET /addresses/:id`, `POST /addresses`, `PUT /addresses/:id`, `DELETE /addresses/:id`, `PUT /addresses/:id/restore` |
| Payments   | `POST /payments`, `GET /payments/:code/status` |
| Vouchers   | `GET /vouchers`, `POST /vouchers/validate`, `GET /vouchers/:code`, `POST /vouchers`, `PUT /vouchers/:code`, `DELETE /vouchers/:code` |
| Reviews    | `GET /reviews/:productSlug`, `POST /reviews/:productSlug`, `PUT /reviews/:id`, `DELETE /reviews/:id` |
| Wishlist   | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:productId` |
| Banners    | `GET /banners`, `GET /banners/:id`, `POST /banners`, `PUT /banners/:id`, `DELETE /banners/:id`, `PUT /banners/:id/restore` |
| Inventory  | `GET /inventory`, `PUT /inventory/:variantId`, `GET /inventory/transactions` |
| Customers  | `GET /customer`, `GET /customer/profile`, `PUT /customer/profile`, `GET /customer/:id/orders` |
| Dashboard  | `GET /dashboard` |
| Users      | `GET /users`, `GET /users/:id`, `PUT /users/:id/ban`, `PUT /users/:id/unban`, `PUT /users/:id/role` |
| Webhooks   | `GET /webhooks/vnpay` |

## Project Structure

```
src/
├── config/           # Database, mail, Cloudinary, Redis
├── controllers/      # Route handlers (API + Web SSR)
├── helpers/          # Response helpers (sendSuccess, sendError)
├── middlewares/      # Auth, error handler, validation, file upload (multer)
├── models/           # Data access layer (MySQL queries)
├── queues/           # BullMQ queue definitions (upload)
├── routes/           # Express route definitions
├── services/         # Business logic, upload service, cloudinary service
├── views/            # Handlebars templates (SSR pages + email templates)
│   ├── layouts/
│   ├── partials/
│   └── emails/
└── workers/          # BullMQ worker processes (upload)
```

## Deployment

Optimized for **Render** (Web Service — Node or Docker).

```bash
# Build the Docker image
docker build -t badminton-shop .

# Run with environment variables
docker run -p 3000:3000 --env-file .env badminton-shop
```

**Note**: File uploads use BullMQ + Redis. The upload worker runs as a separate process (`npm run worker`). Configure `REDIS_*` and `CLOUDINARY_*` env variables for production.

## License

MIT © 2026 Hoa Vi Khang
