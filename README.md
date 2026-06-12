# Bidjikita POS

Point of Sale system for Bidjikita Coffee Roastery. Three components:

- **Backend API** — Node.js, Express, Sequelize, MySQL
- **Admin Dashboard** — React, Vite, TypeScript, TailwindCSS
- **Cashier App** — Flutter (separate project)

---

## Project Structure

```
Bidjikita-POS-Backend/
├── api/                          # Backend REST API
│   ├── src/
│   │   ├── config/database.js
│   │   ├── controllers/          # Request handlers
│   │   ├── middleware/            # Auth, admin, upload
│   │   ├── models/               # Sequelize models
│   │   ├── routes/               # Express routes
│   │   └── services/             # Stock deduction
│   ├── server.js
│   └── .env
│
├── dashboard/                    # Admin web dashboard
│   └── src/
│       ├── api/                  # API client functions
│       ├── components/ui/        # Reusable UI components
│       ├── lib/                  # Utils, API client config
│       ├── pages/                # Page components
│       ├── store/                # Zustand stores
│       └── types/                # TypeScript interfaces
│
└── (kasir_bidjikita)             # Flutter cashier — separate repo
```

---

## Features

### Admin Dashboard

- **Dashboard** — Revenue summary, stock alerts, top products chart
- **Menu Management** — Products with multi-variant support, each variant has its own price, overhead cost, and ingredient list. Target profit margin with automatic price calculation.
- **Bahan Baku** — Raw material inventory with sortable columns, stock status indicators, and per-ingredient audit log tracking all additions and deductions.
- **Bundling** — Product bundles with price comparison against individual items, profit/cost calculation, and image collage from constituent products.
- **Transaksi** — Transaction history with date range filter, cashier filter, payment method filter, and invoice search. Detail view groups bundle purchases and shows bundle price.
- **Laporan Keuangan** — Financial report with date range selection, summary cards (revenue, cost, profit), payment method breakdown, top products, full transaction list. Export to Excel (xlsx) or PDF (print).
- **Analitik** — Revenue trend chart, net profit chart (revenue vs cost vs profit), payment method distribution pie chart, top products bar chart with value labels.
- **Users** — User management with role assignment.

### Backend API

- JWT authentication with admin/cashier roles
- Product variants with nested ingredient creation/update
- Bundle CRUD with automatic cost calculation from variant ingredients
- Order creation with automatic variant resolution and stock deduction
- Transaction processing with invoice generation
- Ingredient audit log tracking every stock change (manual adjustments and order deductions)
- Financial report endpoint aggregating revenue, cost, and profit across date ranges
- Analytics endpoints for dashboard charts and summaries
- Product update preserves variant IDs to prevent bundle references from breaking

### Cashier App (Flutter)

- Product catalog with category filter, search, and bundle support
- Variant selection dialog with quantity stepper
- Cart with order type (dine-in / takeaway)
- Cash and QRIS payment flow with change calculation
- Bundle items sent as single order lines with expanded contents for stock tracking
- Order and transaction creation via API

---

## Installation

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd Bidjikita-POS-Backend

# Install root dependencies
npm install

# Install API dependencies
cd api && npm install

# Install dashboard dependencies
cd ../dashboard && npm install
```

### 2. Environment configuration

Create `api/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bidjikita_pos
JWT_SECRET=your_secret_key
```

Create `dashboard/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Database

```sql
CREATE DATABASE bidjikita_pos;
```

The backend uses `sequelize.sync()` to create tables on startup.

### 4. Run

```bash
# API server
cd api && npm run dev

# Dashboard (separate terminal)
cd dashboard && npm run dev
```

---

## API Endpoints

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/auth/register` | Admin |
| POST | `/auth/login` | Public |

### Products

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/products` | Public |
| GET | `/products/:id` | Public |
| POST | `/products` | Admin |
| PUT | `/products/:id` | Admin |
| DELETE | `/products/:id` | Admin |

### Categories

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/categories` | Public |
| POST | `/categories` | Admin |
| PUT | `/categories/:id` | Admin |
| DELETE | `/categories/:id` | Admin |

### Raw Materials

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/raw-materials` | Authenticated |
| GET | `/raw-materials/:id` | Authenticated |
| GET | `/raw-materials/:id/logs` | Authenticated |
| POST | `/raw-materials` | Admin |
| PUT | `/raw-materials/:id` | Admin |
| DELETE | `/raw-materials/:id` | Admin |

### Bundles

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/bundles` | Public (active only) |
| GET | `/bundles/all/admin` | Admin (all) |
| GET | `/bundles/:id` | Public |
| POST | `/bundles` | Admin |
| PUT | `/bundles/:id` | Admin |
| DELETE | `/bundles/:id` | Admin |

### Orders

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/orders` | Authenticated |
| GET | `/orders/:id` | Authenticated |
| POST | `/orders` | Authenticated |
| PUT | `/orders/:id` | Authenticated |
| DELETE | `/orders/:id` | Authenticated |

### Transactions

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/transactions` | Authenticated |
| GET | `/transactions/:id` | Authenticated |
| POST | `/transactions` | Authenticated |
| PUT | `/transactions/:id` | Admin |
| DELETE | `/transactions/:id` | Admin |

### Analytics

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/analytics/summary` | Admin |
| GET | `/analytics/revenue` | Admin |
| GET | `/analytics/profit` | Admin |
| GET | `/analytics/top-products` | Admin |
| GET | `/analytics/payment-methods` | Admin |
| GET | `/analytics/financial-report` | Admin |

### Users

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/users` | Admin |
| POST | `/users` | Admin |
| PUT | `/users/:id` | Admin |
| DELETE | `/users/:id` | Admin |

---

## Example API Payloads

### Create order

```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "variant_ids": [1]
    },
    {
      "bundle_id": 5,
      "bundle_name": "Paket Hemat",
      "bundle_price": 32000,
      "quantity": 1,
      "bundle_items": [
        { "product_id": 4, "quantity": 1, "variant_ids": [], "product_name": "Gula Aren" },
        { "product_id": 5, "quantity": 1, "variant_ids": [], "product_name": "Donat" }
      ]
    }
  ]
}
```

### Create raw material

```json
{
  "material_name": "Arabica Beans",
  "unit": "gram",
  "stock": 5000,
  "minimum_stock": 500,
  "cost_per_unit": 0.15
}
```

### Create bundle

FormData with fields: `bundle_name`, `description`, `bundle_price`, `items` (JSON), optional `image` file.

```json
{
  "items": [
    { "product_id": 1, "variant_id": 2, "quantity": 1 },
    { "product_id": 3, "quantity": 2 }
  ]
}
```

---

## Key Design Decisions

- **Variants own pricing and ingredients** — Each product variant has its own price, overhead cost, and ingredient list. Recipes are defined per variant, not per product.
- **Bundle cost is auto-calculated** — When creating or updating a bundle, the system resolves each item's variant cost from ingredient usage and overhead.
- **Stock deduction happens per product variant** — When an order is placed, raw material stock is reduced based on the variant's ingredient quantities.
- **Product edits preserve variant IDs** — Variants are matched by name on update, avoiding orphaned references in bundles.
- **Bundle orders store expanded contents** — The bundle line item in an order stores the constituent products as JSON for stock tracking and display.
- **Ingredient audit log** — Every stock change (manual adjustment or order deduction) is recorded with before/after values, user, and timestamps.

---

## Development

**Regiana Hermawan** — Backend API

**Muhammad Abiyyu Nizar** — Dashboard, Flutter Cashier App
