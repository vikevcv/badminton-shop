# Badminton Shop 🏸

[Xem bản tiếng Việt tại đây](./README.vi.md)

Full-stack e-commerce platform for badminton equipment built with Node.js, Express, and MySQL. Features both a RESTful API and Server-Side Rendering (Handlebars).

## Tech Stack

- **Backend**: Node.js, Express 5
- **Database**: MySQL 8 (via `mysql2`)
- **Auth**: JWT (access + refresh tokens, HttpOnly cookies), token_version force-logout
- **Upload**: Multer (temp storage) + Cloudinary (async background worker)
- **Template**: Handlebars (`express-handlebars`)
- **Email**: Nodemailer + Brevo SMTP
- **Logger**: Morgan

## Features

- **Auth** — Register, login, profile, change password, forgot/reset password (email), logout (token_version force-logout)
- **Products** — CRUD, variants (SKU), images, search/filter, pagination, sort by popularity
- **Categories & Brands** — CRUD, soft delete/restore
- **Cart** — Add, update quantity, remove, clear (race-condition safe)
- **Orders** — Create, status flow (`pending_payment → confirmed → preparing → shipping → completed`), cancel, tracking, status history
- **Payments** — Manual (cash/bank transfer) + webhook callback
- **Vouchers** — CRUD, apply/cancel, percent/fixed discount
- **Reviews** — CRUD, soft delete (admin bypass)
- **Wishlist** — Add/remove, soft delete, duplicate detection
- **Banners** — CRUD, auto reorder `sort_order`, soft delete/restore
- **Inventory** — Adjust stock, transaction history, low-stock alerts
- **Admin Dashboard** — Revenue, orders/users count, top products, revenue by day, status distribution
- **User Management** — Ban/unban (force logout via `token_version++`), role change, list/search
- **Email** — Welcome email (register), forgot password email
- **Upload** — Async Cloudinary upload (products, brands, banners). File temp → background worker uploads → Cloudinary URL. Supports retry on failure.

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
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `UPLOAD_WORKER_INTERVAL_MS` | Worker polling interval (default `5000`) |
| `UPLOAD_MAX_RETRY` | Max retry for failed uploads (default `3`) |

### Database

```bash
npm run seed
```

Creates tables and inserts sample data (100 users, categories, brands, products, variants, images).

### Run

```bash
npm run dev    # Development (nodemon)
npm start      # Production
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
| Products   | `GET /products`, `GET /products/search`, `GET /products/:slug`, `GET /products/newest/:categorySlug`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `PUT /products/:id/restore` |
| Variants   | `POST /products/:id/variants`, `PUT /products/:id/variants/:vid`, `DELETE /products/:id/variants/:vid`, `PUT /products/:id/variants/:vid/restore` |
| Images     | `POST /products/:id/images`, `PUT /products/:id/images/:iid`, `DELETE /products/:id/images/:iid`, `PUT /products/:id/images/:iid/restore` |
| Categories | `GET /categories`, `GET /categories/:id`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`, `PUT /categories/:id/restore` |
| Brands     | `GET /brands`, `GET /brands/:id`, `POST /brands`, `PUT /brands/:id`, `DELETE /brands/:id`, `PUT /brands/:id/restore` |
| Cart       | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Orders     | `POST /orders`, `GET /orders`, `GET /orders/all`, `GET /orders/:code`, `GET /orders/:code/status-history`, `GET /orders/:code/payments`, `PUT /orders/:code/status`, `PUT /orders/:code/tracking` |
| Addresses  | `GET /addresses`, `GET /addresses/:id`, `POST /addresses`, `PUT /addresses/:id`, `DELETE /addresses/:id`, `PUT /addresses/:id/restore` |
| Payments   | `POST /payments/manual`, `POST /payments/webhook` |
| Vouchers   | `GET /vouchers`, `GET /vouchers/:id`, `POST /vouchers`, `PUT /vouchers/:id`, `DELETE /vouchers/:id`, `PUT /vouchers/:id/restore` |
| Reviews    | `GET /reviews/:productSlug`, `POST /reviews/:productSlug`, `PUT /reviews/:id`, `DELETE /reviews/:id` |
| Wishlist   | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:productId` |
| Banners    | `GET /banners`, `GET /banners/:id`, `POST /banners`, `PUT /banners/:id`, `DELETE /banners/:id`, `PUT /banners/:id/restore` |
| Inventory  | `GET /inventory`, `POST /inventory/adjust`, `GET /inventory/transactions` |
| Customers  | `GET /customers`, `GET /customers/:id`, `PUT /customers/:id/ban`, `PUT /customers/:id/unban` |
| Dashboard  | `GET /dashboard` |
| Users      | `GET /users`, `PUT /users/:id/ban`, `PUT /users/:id/unban`, `PUT /users/:id/role` |
| Webhooks   | `POST /webhooks/payment` |

## Project Structure

```
src/
├── config/           # Database, mail, Cloudinary
├── controllers/      # Route handlers (API + Web SSR)
├── helpers/          # Response helpers (sendSuccess, sendError)
├── middlewares/      # Auth, error handler, validation, file upload (multer)
├── models/           # Data access layer (MySQL queries)
├── routes/           # Express route definitions
├── services/         # Business logic + background upload worker
└── views/            # Handlebars templates (SSR pages + email templates)
    ├── layouts/
    ├── partials/
    └── emails/
```

## Deployment

Optimized for **Render** (Web Service — Node or Docker).

```bash
# Build the Docker image
docker build -t badminton-shop .

# Run with environment variables
docker run -p 3000:3000 --env-file .env badminton-shop
```

**Note**: File uploads use async Cloudinary upload. The background worker polls the database every 5 seconds, uploads pending files to Cloudinary, then cleans up local temp files. Configure `CLOUDINARY_*` env variables for production.

## License

MIT © 2026 Hoa Vi Khang
