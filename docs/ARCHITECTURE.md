# 🏗️ System Architecture - Bidjikita POS

## Overall Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BIDJIKITA POS SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐         ┌──────────────────────┐
    │   ADMIN WEB APP      │         │  CASHIER MOBILE APP  │
    │   (React.js)         │         │   (Flutter)          │
    │                      │         │                      │
    │ • Ingredients CRUD   │         │ • Browse Products    │
    │ • Recipe Builder     │         │ • Create Orders      │
    │ • Menu Management    │         │ • Process Payment    │
    │ • Bundle Creator     │         │ • Print Receipt      │
    │ • Pricing Dashboard  │         │ • Track Inventory    │
    └──────────┬───────────┘         └──────────┬───────────┘
               │ HTTP/REST                      │ HTTP/REST
               │                                │
               └────────────┬───────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │   BACKEND API       │
                 │  (Node.js/Express)  │
                 │  Port: 5000         │
                 └──────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────────┐   ┌────────────┐   ┌────────────┐
    │   Auth     │   │  Products  │   │  Bundles   │
    │ Endpoints  │   │ Endpoints  │   │ Endpoints  │
    └────────────┘   └────────────┘   └────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │   MySQL Database    │
                 │   (Sequelize ORM)   │
                 └──────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────────┐   ┌────────────┐   ┌────────────┐
    │   Users    │   │  Products  │   │  Bundles   │
    │   Roles    │   │  Categories│   │ BundleItem │
    │  Shifts    │   │ Recipes    │   │ RawMaterial│
    │ Transactions│  │ Variants   │   │ Orders     │
    └────────────┘   └────────────┘   └────────────┘
```

---

## Data Flow: Product Creation → Bundle → Order

```
ADMIN DASHBOARD
     │
     ├─ CREATE INGREDIENT
     │    │
     │    └─► API: POST /raw-materials
     │         │
     │         └─► DB: raw_materials (new record)
     │
     ├─ CREATE RECIPE
     │    │
     │    └─► API: POST /recipes
     │         │
     │         └─► DB: recipes + recipe_details
     │              (links products to raw materials)
     │
     ├─ CREATE PRODUCT
     │    │
     │    └─► API: POST /products
     │         │
     │         ├─► DB: products (new record)
     │         │
     │         └─► SET base_cost = sum(recipe_items)
     │
     ├─ UPDATE PRICING
     │    │
     │    └─► API: PUT /products/:id/pricing
     │         │
     │         ├─ Input: base_cost, profit_margin
     │         │
     │         └─► Auto-calculate:
     │              selling_price = base_cost × (1 + margin/100)
     │              Update DB
     │
     └─ CREATE BUNDLE
          │
          └─► API: POST /bundles
               │
               ├─ Input: 
               │   • bundle_name
               │   • items: [{product_id, quantity}]
               │   • bundle_price
               │
               ├─► Auto-calculate:
               │    • total_bundle_cost = Σ(product.base_cost × qty)
               │    • bundle_profit = bundle_price - total_bundle_cost
               │
               └─► DB: bundles + bundle_items

                              ▼

CASHIER APP
     │
     ├─ FETCH PRODUCTS & BUNDLES
     │    │
     │    ├─► API: GET /products (includes selling_price)
     │    │
     │    └─► API: GET /bundles (includes bundle_price)
     │
     ├─ CREATE ORDER
     │    │
     │    └─► API: POST /orders
     │         │
     │         ├─ Input: items [{product_id or bundle_id, qty}]
     │         │
     │         ├─► DB: Create order + order_details
     │         │
     │         └─► INVENTORY: Auto-deduct from stock
     │              • Fetch recipe for each product
     │              • Reduce raw_materials stock
     │
     ├─ PROCESS PAYMENT
     │    │
     │    └─► API: POST /transactions
     │         │
     │         └─► DB: transactions (payment record)
     │
     └─ PRINT RECEIPT
          │
          └─► Generate PDF with order details
               (Includes products, bundles, prices, total)
```

---

## Bundle Profitability Example

```
SCENARIO: Create "Morning Bundle"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin Input:
  Name: "Morning Coffee Bundle"
  Items: 
    • 1× Espresso (Product ID: 1)
    • 1× Croissant (Product ID: 2)
  Bundle Price: Rp 30,000

Product Details (already configured):
  Espresso:
    • base_cost: Rp 5,000
    • profit_margin: 30%
    • selling_price: Rp 6,500

  Croissant:
    • base_cost: Rp 10,000
    • profit_margin: 25%
    • selling_price: Rp 12,500

System Calculations:
  ┌─────────────────────────────────┐
  │ Individual Sale Total           │
  │ (Espresso + Croissant)          │
  │                                 │
  │ Espresso:    Rp  6,500          │
  │ Croissant:   Rp 12,500          │
  │ ─────────────────────           │
  │ Total:       Rp 19,000          │
  └─────────────────────────────────┘
                │
                │ Customer chooses BUNDLE
                │
                ▼
  ┌─────────────────────────────────┐
  │ Bundle Sale                     │
  │ Bundle Price:    Rp 30,000      │
  │                                 │
  │ Calculation:                    │
  │ total_bundle_cost = 5000 + 10000│
  │                  = Rp 15,000    │
  │                                 │
  │ bundle_profit = 30000 - 15000   │
  │               = Rp 15,000       │
  │                                 │
  │ Savings vs buying separately:   │
  │ 19000 - 30000 = LOSS Rp 11,000 │
  │ (or shown as: "Save Rp 11,000") │
  └─────────────────────────────────┘
```

---

## Database Relationships

```
users ◄─────────────────────────┐
│ (admin, cashier)              │
├─ id (PK)                      │
├─ username                     │
├─ password_hash                │
├─ role_id (FK)                 │
└─ is_active                    │
                                │
                        ┌───────┘
                        │
roles                   │
├─ id (PK) ────────────┘
├─ role_name
└─ description


raw_materials ◄────────────────┐
├─ id (PK)                     │
├─ material_name               │
├─ unit                        │
├─ stock                       │
├─ minimum_stock               │
└─ (timestamps)                │
        ▲                      │
        │                      │
recipe_details                 │
├─ id (PK)                     │
├─ recipe_id (FK) ─────────────┼──► recipes
├─ raw_material_id (FK) ───────┘     ├─ id (PK)
├─ quantity                          ├─ product_id (FK)
└─ (timestamps)                      ├─ recipe_name
                                     └─ (timestamps)
                                              │
                                              │
products ◄────────────────────────────────────┘
├─ id (PK)
├─ product_name
├─ category_id (FK)
├─ base_price (legacy)
├─ base_cost (NEW) ◄─── Sum of recipe items
├─ profit_margin (NEW)
├─ selling_price (NEW) ◄─ AUTO-CALC
├─ status
├─ is_active
└─ (timestamps)
        │
        │
        ├─────────────────────────────────┐
        │                                 │
bundle_items                    product_variants
├─ id (PK)                      ├─ id (PK)
├─ bundle_id (FK) ──┐           ├─ product_id (FK)
├─ product_id (FK) ─┼─► products ├─ variant_name
├─ quantity         │           └─ price
└─ (timestamps)     │
        ▲           │
        │           │
bundles ◄───────────┘
├─ id (PK)
├─ bundle_name (NEW)
├─ description (NEW)
├─ bundle_price (NEW)
├─ total_bundle_cost (NEW) ◄─ AUTO-CALC
├─ bundle_profit (NEW) ◄─ AUTO-CALC
├─ is_active (NEW)
└─ (timestamps)


orders ◄────────────────────────┐
├─ id (PK)                     │
├─ user_id (FK) ────┐          │
├─ shift_id (FK)    │          │
├─ notes            │          │
└─ (timestamps)     │          │
        │           │          │
order_details       │    transactions
├─ id (PK)          │    ├─ id (PK)
├─ order_id (FK)    │    ├─ order_id (FK)
├─ product_id (FK)  │    ├─ amount
├─ quantity         │    ├─ payment_method
└─ (timestamps)     │    └─ (timestamps)
                    │
                    └─► users
                        ├─ id (PK)
                        ├─ username
                        ├─ email
                        └─ role_id (FK)
```

---

## API Endpoint Categories

```
┌────────────────────────────────────────────────────┐
│              API ENDPOINTS STRUCTURE                │
└────────────────────────────────────────────────────┘

/api/auth                (🔐 Authentication)
├─ POST   /register      → Create new user
├─ POST   /login         → Get JWT token
└─ POST   /logout        → Invalidate token

/api/products           (📦 Product Management)
├─ GET    /             → List all products
├─ GET    /:id          → Get product details
├─ POST   /             → Create product (Admin)
├─ PUT    /:id          → Update product (Admin)
├─ PUT    /:id/pricing  → Update pricing (Admin) ★NEW★
└─ DELETE /:id          → Delete product (Admin)

/api/bundles            (🎁 Bundle Management) ★NEW★
├─ GET    /             → List active bundles
├─ GET    /all/admin    → List all bundles (Admin)
├─ GET    /:id          → Get bundle details
├─ POST   /             → Create bundle (Admin)
├─ PUT    /:id          → Update bundle (Admin)
└─ DELETE /:id          → Delete bundle (Admin)

/api/categories         (📂 Category Management)
├─ GET    /             → List categories
├─ POST   /             → Create category (Admin)
├─ PUT    /:id          → Update category (Admin)
└─ DELETE /:id          → Delete category (Admin)

/api/raw-materials      (🥘 Raw Materials/Ingredients)
├─ GET    /             → List ingredients
├─ POST   /             → Create ingredient (Admin)
├─ PUT    /:id          → Update ingredient (Admin)
└─ DELETE /:id          → Delete ingredient (Admin)

/api/recipes            (📖 Recipe Management)
├─ GET    /             → List recipes
├─ POST   /             → Create recipe (Admin)
├─ PUT    /:id          → Update recipe (Admin)
└─ DELETE /:id          → Delete recipe (Admin)

/api/orders             (🛒 Order Management)
├─ GET    /             → List orders
├─ POST   /             → Create order
├─ PUT    /:id          → Update order
└─ DELETE /:id          → Delete order

/api/transactions       (💳 Payment Tracking)
├─ GET    /             → List transactions
├─ POST   /             → Create transaction
├─ PUT    /:id          → Update transaction
└─ DELETE /:id          → Delete transaction
```

---

## Security & Auth Flow

```
┌──────────────────────────────────────────────────────┐
│         AUTHENTICATION & AUTHORIZATION               │
└──────────────────────────────────────────────────────┘

CLIENT REQUEST
       │
       ▼
1️⃣ REGISTER / LOGIN
   ├─ Username + Password
   ├─ Hash password with bcryptjs
   ├─ Store in DB with role (admin/cashier)
   └─► Generate JWT Token
           ├─ Payload: {id, username, role}
           ├─ Secret: from .env
           ├─ Expiration: 24h (can be set)
           └─ Send to client


2️⃣ CLIENT STORES TOKEN
   └─► In localStorage (web) or SecureStorage (mobile)


3️⃣ CLIENT MAKES PROTECTED REQUEST
   ├─ Header: Authorization: Bearer {token}
   └─► Send to API


4️⃣ SERVER VALIDATES TOKEN
   ├─ Check if token exists
   ├─ Verify signature with secret
   ├─ Extract payload: {id, username, role}
   └─► Attach to req.user


5️⃣ AUTHORIZATION CHECK
   ├─ authMiddleware: Checks if token valid
   │   └─ Public endpoints: ✓ (no token needed)
   │   └─ Protected endpoints: ✓ (token required)
   │
   └─ adminMiddleware: Checks if role === 'admin'
       ├─ Admin endpoints: ✓ (admin only)
       ├─ Cashier endpoints: ✗ (403 Forbidden)
       └─ Public endpoints: ✓ (no check)


6️⃣ REQUEST PROCESSING
   ├─ If authorized: Execute endpoint
   ├─ If not: Return 401 or 403 error
   └─ Response includes data or error


7️⃣ CLIENT HANDLES RESPONSE
   ├─ 200/201: Use response data
   ├─ 401: Redirect to login (token expired)
   ├─ 403: Show "Access Denied"
   └─ 500: Show error message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACCESS LEVELS:

PUBLIC (No token needed)
├─ GET /products
├─ GET /products/:id
├─ GET /bundles
├─ GET /bundles/:id
└─ POST /auth/register, /auth/login

PROTECTED (Token required)
├─ GET /raw-materials
├─ GET /recipes
├─ GET /orders
├─ POST /orders
├─ GET /shifts
└─ POST /transactions

ADMIN ONLY (Token + role=admin)
├─ POST /products
├─ PUT /products/:id
├─ PUT /products/:id/pricing
├─ DELETE /products/:id
├─ POST /bundles
├─ PUT /bundles/:id
├─ DELETE /bundles/:id
├─ POST /categories
├─ POST /raw-materials
├─ POST /recipes
└─ etc (all write operations)
```

---

## Request/Response Flow Example: Create Bundle

```
CLIENT (Admin Dashboard)                API SERVER                 DATABASE
       │                                  │                           │
       │ 1. POST /bundles                │                            │
       │ Header: Authorization: Bearer XXX│                           │
       │ Body: {                         │                           │
       │   bundle_name: "Morning Bundle",│                           │
       │   items: [                      │                           │
       │     {product_id: 1, qty: 1},    │                           │
       │     {product_id: 2, qty: 1}     │                           │
       │   ],                            │                           │
       │   bundle_price: 30000           │                           │
       │ }                               │                           │
       ├──────────────────────────────────→ 2. authMiddleware        │
       │                                  │    Check token ✓          │
       │                                  │ 3. adminMiddleware       │
       │                                  │    Check role = admin ✓  │
       │                                  │ 4. Fetch Product 1      │
       │                                  ├─────────────────────────→│
       │                                  │    Query: product 1     │
       │                                  │                 base_cost│
       │                                  │←─────────────────────────┤
       │                                  │    {base_cost: 5000}    │
       │                                  │ 5. Fetch Product 2      │
       │                                  ├─────────────────────────→│
       │                                  │    Query: product 2     │
       │                                  │                 base_cost│
       │                                  │←─────────────────────────┤
       │                                  │    {base_cost: 10000}   │
       │                                  │ 6. Calculate Bundle     │
       │                                  │    total_cost = 15000   │
       │                                  │    profit = 30000-15000 │
       │                                  │              = 15000    │
       │                                  │ 7. Create Bundle        │
       │                                  ├─────────────────────────→│
       │                                  │ INSERT INTO bundles ... │
       │                                  │                 ✓ Created│
       │                                  │←─────────────────────────┤
       │                                  │    bundle_id: 1         │
       │                                  │ 8. Create BundleItems   │
       │                                  ├─────────────────────────→│
       │                                  │ INSERT INTO bundle_items│
       │                                  │  (1, 1, 1) & (1, 2, 1) │
       │                                  │                 ✓ Created│
       │                                  │←─────────────────────────┤
       │                                  │ 9. Fetch Full Bundle    │
       │                                  ├─────────────────────────→│
       │                                  │ SELECT bundle + items   │
       │                                  │      + products         │
       │                                  │←─────────────────────────┤
       │                                  │    {                   │
       │                                  │      id: 1,            │
       │                                  │      bundle_name: ..., │
       │                                  │      bundle_price: ...,│
       │                                  │      bundle_profit: ...│
       │                                  │      items: [...]      │
       │                                  │    }                   │
       │← 200 OK                          │                        │
       │ Response: {bundle object}        │                        │
       │                                  │                        │
       ▼                                  │                        │
   Display:                              │                        │
   ✓ Bundle created successfully         │                        │
   - Name: Morning Bundle                │                        │
   - Price: Rp 30,000                    │                        │
   - Profit: Rp 15,000                   │                        │
   - Items: 2 products                   │                        │
```

---

This architecture supports:
✅ Multiple concurrent users
✅ Real-time inventory updates
✅ Automatic calculations
✅ Role-based access control
✅ Scalable to 1000+ products/bundles
✅ Integration with Flutter mobile app

