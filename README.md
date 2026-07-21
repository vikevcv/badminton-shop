# Badminton Shop 🏸

[Xem bản tiếng Việt tại đây](./README.vi.md)

Full-stack e-commerce platform for badminton equipment built with Node.js, Express, and MySQL. Features both a RESTful API and Server-Side Rendering (Handlebars).

## Tech Stack

- **Backend**: Node.js, Express 5
- **Database**: MySQL 8 (via `mysql2`, `express-mysql-session`)
- **Auth**: JWT (API) + Session (Web SSR), token_version force-logout
- **Template**: Handlebars (`express-handlebars`)
- **Email**: Nodemailer + Brevo SMTP
- **Logger**: Morgan

## Features

- **Auth** — Register, login, profile, change password, forgot/reset password (email), logout (token blacklist)
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
| `SESSION_SECRET` | Random secret for session cookie |

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

### Base URL

```
http://localhost:3000/api
```

### Key Endpoints

| Group      | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/register`, `/auth/login`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/change-password`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Products   | `GET /products`, `GET /products/search`, `GET /products/:slug`, `GET /products/newest/:categorySlug`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `PUT /products/:id/restore` |
| Cart       | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Orders     | `POST /orders`, `GET /orders`, `GET /orders/all`, `GET /orders/:code`, `POST /orders/:code/cancel`, `PUT /orders/:code/status`, `PUT /orders/:code/tracking` |
| Banners    | `GET /banners`, `GET /banners/:id`, `POST /banners`, `PUT /banners/:id`, `DELETE /banners/:id`, `PUT /banners/:id/restore` |
| Reviews    | `GET /reviews/:productSlug`, `POST /reviews/:productSlug`, `PUT /reviews/:id`, `DELETE /reviews/:id` |
| Wishlist   | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:productId` |
| Admin      | `GET /dashboard`, `GET /users`, `PUT /users/:id/ban`, `PUT /users/:id/unban`, `PUT /users/:id/role` |
| ...        | See `testapi.json` for full list |

## Project Structure

```
src/
├── config/           # Database, mail transporter
├── controllers/      # Route handlers (API + Web SSR)
├── database/         # SQL schema, seed scripts
├── helpers/          # Response helpers (sendSuccess, sendError)
├── middlewares/      # Auth (JWT/session), error handler, validation
├── models/           # Data access layer (MySQL queries)
├── routes/           # Express route definitions
├── services/         # Business logic layer
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

**Note**: Uploaded images are not persisted on Render's ephemeral disk. Use external storage (Cloudinary, AWS S3) for production.

## License

MIT © 2026 Hoa Vi Khang
