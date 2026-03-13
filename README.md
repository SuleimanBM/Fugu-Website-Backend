# Fugu Threads — Backend

NestJS + MikroORM + PostgreSQL backend built to serve the Fugu Threads React frontend.

## Stack

| Layer       | Technology                           |
|-------------|--------------------------------------|
| Framework   | NestJS 11                            |
| ORM         | MikroORM 6 (PostgreSQL driver)       |
| Auth        | JWT (access + refresh), Google OAuth |
| Payments    | Paystack                             |
| Storage     | AWS S3 (optional in dev)             |
| Email       | Nodemailer + MJML templates          |
| API Docs    | Swagger — `/api/docs`                |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Create the database
createdb fugu_threads

# 4. Push schema
npm run db:schema:update

# 5. Seed sample data
npm run db:seeder:run

# 6. Start dev server
npm run start:dev
```

The server starts on **http://localhost:5000**.  
Swagger docs are at **http://localhost:5000/api/docs**.

---

## API Endpoints

All routes are prefixed with `/api`.

### Auth
| Method | Path                        | Auth     | Description                                 |
|--------|-----------------------------|----------|---------------------------------------------|
| POST   | /auth/signup                | —        | Register. Returns `{ user, token }`         |
| POST   | /auth/login                 | —        | Login. Returns `{ user, token }`            |
| GET    | /auth/me                    | cookie   | Restore session from refresh token          |
| POST   | /auth/logout                | Bearer   | Revoke refresh token                        |
| POST   | /auth/forgot-password       | —        | Send password reset email                   |
| POST   | /auth/reset-password        | —        | Reset password with token                   |
| GET    | /auth/google                | —        | Redirect to Google consent screen           |
| POST   | /auth/google/callback       | —        | Exchange code for `{ user, token }`         |

### Products
| Method | Path                  | Auth | Description                              |
|--------|-----------------------|------|------------------------------------------|
| GET    | /products             | —    | List with filters (q, category, size…)   |
| GET    | /products/featured    | —    | Featured products                        |
| GET    | /products/categories  | —    | All category names                       |
| GET    | /products/:slug       | —    | Single product with variants             |

### Cart _(all require Bearer token)_
| Method | Path                    | Description                         |
|--------|-------------------------|-------------------------------------|
| GET    | /cart                   | `{ items: CartItem[] }`             |
| POST   | /cart/items             | Add item `{ product_id, variant_id, quantity }` |
| PATCH  | /cart/items/:itemId     | Update quantity `{ quantity }`      |
| DELETE | /cart/items/:itemId     | Remove item                         |
| DELETE | /cart                   | Clear cart                          |

### Checkout & Payments _(require Bearer token)_
| Method | Path                    | Description                                     |
|--------|-------------------------|-------------------------------------------------|
| GET    | /orders/me              | Current user's order history                    |
| GET    | /orders/:id             | Single order                                    |
| POST   | /checkout/transaction   | Create order from cart `{ shipping_address }`   |
| POST   | /checkout/initiate      | Get Paystack `authorization_url` `{ order_id }` |
| POST   | /paystack/verify        | Confirm payment `{ reference }`                 |

### Uploads _(require Bearer + admin role)_
| Method | Path                         | Description                             |
|--------|------------------------------|-----------------------------------------|
| POST   | /uploads/product-images      | multipart upload → `{ urls: string[] }` |

### Admin _(require Bearer + admin role)_
| Method | Path                               | Description                     |
|--------|------------------------------------|---------------------------------|
| GET    | /admin/analytics                   | Dashboard stats                 |
| GET    | /admin/analytics/sales-over-time   | Revenue by day                  |
| GET    | /admin/analytics/top-products      | Top selling products            |
| GET    | /admin/analytics/low-stock         | Low stock variants              |
| POST   | /admin/products                    | Create product                  |
| PATCH  | /admin/products/:id                | Update product                  |
| DELETE | /admin/products/:id                | Soft-delete product             |
| POST   | /admin/products/:id/variants       | Add variant                     |
| PATCH  | /admin/variants/:id                | Update variant                  |
| DELETE | /admin/variants/:id                | Delete variant                  |
| PATCH  | /admin/variants/:id/stock          | Adjust stock `{ delta }`        |
| GET    | /admin/categories                  | List categories                 |
| POST   | /admin/categories                  | Create category                 |
| GET    | /admin/orders                      | Paginated order list            |
| GET    | /admin/orders/:id                  | Single order                    |
| PATCH  | /admin/orders/:id                  | Update payment/fulfillment status |
| PATCH  | /admin/orders/:id/fulfillment      | Update fulfillment status only  |

---

## Frontend ↔ Backend Type Mapping

| Frontend type  | Backend entity / response shape                          |
|----------------|----------------------------------------------------------|
| `User`         | `user.toDto()` → `{ id, name, email, is_admin }`        |
| `Product`      | `product.toDto()` → flat with `images[]`, `categories[]`, `variants[]` |
| `Variant`      | `variant.toDto()` → `{ id, name, size, color, stock, priceDiff }` |
| `CartItem`     | `cartItem.toDto()` → `{ id, product_id, variant_id, quantity, priceAtAdd }` |
| `Order`        | `order.toDto()` → `{ id, items, shipping_address, subtotal, tax, shipping, total, payment_status, fulfillment_status }` |

---

## Google OAuth Flow

1. Frontend calls `GET /api/auth/google` → redirects to Google.
2. Google redirects to `${FRONTEND_URL}/auth/google/callback?code=...`
3. Frontend `GoogleCallbackPage` reads `code` from URL, calls `POST /api/auth/google/callback` with `{ code }`.
4. Backend exchanges code, finds/creates user, returns `{ user, token }`.

Set the authorised redirect URI in the Google Console to your `FRONTEND_URL/auth/google/callback`.

---

## Paystack Flow

1. Frontend: `POST /api/checkout/transaction` → creates Order, gets back `{ id, total, ... }`.
2. Frontend: `POST /api/checkout/initiate` with `{ order_id }` → gets `{ authorization_url }`.
3. Frontend: `window.location.href = authorization_url` → user pays on Paystack.
4. Paystack redirects to `${FRONTEND_URL}/checkout/callback?reference=...`
5. Frontend `PaystackCallbackPage`: calls `POST /api/paystack/verify` with `{ reference }`.
6. Backend verifies with Paystack, marks order `payment_status = paid`, fires confirmation email.

---

## Making a User an Admin

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```
