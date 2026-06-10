# Backend Testing Guide

## ⚠️ Current Status

Backend successfully extended and ready to test. However, **MySQL database server must be running** first.

---

## Prerequisites

### 1. Install MySQL / MariaDB

#### Windows:
```bash
# Option A: Using Chocolatey
choco install mysql

# Option B: Download from https://dev.mysql.com/downloads/mysql/
```

#### Check if installed:
```bash
mysql --version
```

### 2. Start MySQL Service

#### Windows (Command Prompt as Admin):
```bash
# Start MySQL
net start MySQL80

# Or if using MariaDB
net start MariaDB

# Stop MySQL
net stop MySQL80
```

#### Or use MySQL Workbench GUI
- Open MySQL Workbench → Server → Start Server

---

## Setup & Configuration

### 1. Create Database
```sql
CREATE DATABASE bidjikita_pos;
```

### 2. Verify .env File
File: `D:\Project\Bidjikita-POS-Backend\.env`

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bidjikita_pos
DB_USER=root
DB_PASSWORD=                    # Leave empty if no password
JWT_SECRET=bidjikita_secret_key_for_development
```

### 3. Install Dependencies (Already Done ✓)
```bash
npm install
```

---

## Running Backend Server

### Start Development Server
```bash
cd D:\Project\Bidjikita-POS-Backend
npm run dev
```

**Expected Output:**
```
[nodemon] 3.1.14
[nodemon] watching path(s): *.*
[nodemon] starting `node server.js`
Database connected
Server running on port 5000
```

Server will auto-restart on file changes.

---

## Testing API Endpoints

### Tools Needed:
- **Postman** (Recommended) → https://www.postman.com/
- **cURL** (Command line)
- **REST Client** (VS Code extension)

### Base URL:
```
http://localhost:5000/api
```

---

## Test Workflow

### 1. Health Check
```bash
GET http://localhost:5000/
```

**Expected Response:**
```json
{
  "message": "POS Bidjikita API Running"
}
```

---

### 2. Register Admin User
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@bidjikita.com",
  "password": "Admin@123",
  "role": "admin"
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@bidjikita.com",
  "role": "admin",
  "is_active": true,
  "createdAt": "2024-06-10T18:00:00.000Z"
}
```

---

### 3. Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123"
}
```

**Expected Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Save this token for next requests!**

---

### 4. Create Category
```bash
POST http://localhost:5000/api/categories
Authorization: Bearer {token_from_login}
Content-Type: application/json

{
  "category_name": "Kopi"
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "category_name": "Kopi",
  "createdAt": "2024-06-10T18:00:00.000Z"
}
```

---

### 5. Create Raw Material (Ingredient)
```bash
POST http://localhost:5000/api/raw-materials
Authorization: Bearer {token}
Content-Type: application/json

{
  "material_name": "Kopi Robusta",
  "unit": "gram",
  "stock": 5000,
  "minimum_stock": 500
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "material_name": "Kopi Robusta",
  "unit": "gram",
  "stock": 5000,
  "minimum_stock": 500
}
```

---

### 6. Create Product
```bash
POST http://localhost:5000/api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "category_id": 1,
  "product_name": "Espresso",
  "description": "Single shot espresso",
  "base_price": 15000,
  "base_cost": 5000,
  "profit_margin": 30,
  "image_url": "https://example.com/espresso.jpg"
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "product_name": "Espresso",
  "base_cost": 5000,
  "profit_margin": 30,
  "selling_price": 6500,
  "status": "available",
  "is_active": true
}
```

---

### 7. Create Another Product for Bundle
```bash
POST http://localhost:5000/api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "category_id": 1,
  "product_name": "Croissant",
  "description": "Buttery croissant",
  "base_price": 25000,
  "base_cost": 10000,
  "profit_margin": 25,
  "image_url": "https://example.com/croissant.jpg"
}
```

---

### 8. ✨ Create Bundle (NEW FEATURE!)
```bash
POST http://localhost:5000/api/bundles
Authorization: Bearer {token}
Content-Type: application/json

{
  "bundle_name": "Morning Coffee Bundle",
  "description": "Espresso + Croissant combo",
  "bundle_price": 30000,
  "items": [
    { "product_id": 1, "quantity": 1 },
    { "product_id": 2, "quantity": 1 }
  ]
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "bundle_name": "Morning Coffee Bundle",
  "bundle_price": 30000,
  "total_bundle_cost": 15000,
  "bundle_profit": 15000,
  "is_active": true,
  "BundleItems": [
    {
      "id": 1,
      "quantity": 1,
      "Product": {
        "id": 1,
        "product_name": "Espresso",
        "base_cost": 5000,
        "selling_price": 6500
      }
    },
    {
      "id": 2,
      "quantity": 1,
      "Product": {
        "id": 2,
        "product_name": "Croissant",
        "base_cost": 10000,
        "selling_price": 12500
      }
    }
  ]
}
```

---

### 9. Get All Bundles
```bash
GET http://localhost:5000/api/bundles
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "bundle_name": "Morning Coffee Bundle",
    "bundle_price": 30000,
    "total_bundle_cost": 15000,
    "bundle_profit": 15000,
    ...
  }
]
```

---

### 10. Update Product Pricing (NEW FEATURE!)
```bash
PUT http://localhost:5000/api/products/1/pricing
Authorization: Bearer {token}
Content-Type: application/json

{
  "base_cost": 6000,
  "profit_margin": 35
}
```

**Expected Response (200):**
```json
{
  "id": 1,
  "product_name": "Espresso",
  "base_cost": 6000,
  "profit_margin": 35,
  "selling_price": 8100,
  ...
}
```

---

## Postman Collection

### Quick Setup:
1. Open Postman
2. Create new collection "Bidjikita POS"
3. Set base URL: `{{base_url}}/api`
4. In collection variables, set: `base_url = http://localhost:5000`
5. Add requests as per examples above

### Authorization:
- Select request → Authorization tab
- Type: Bearer Token
- Token: `{{auth_token}}`
- Add new collection variable: `auth_token = {paste_token_from_login}`

---

## Expected Results

### ✅ Success Indicators:

1. ✅ Health check returns message
2. ✅ Register user succeeds (201)
3. ✅ Login returns JWT token (200)
4. ✅ Can create category (201)
5. ✅ Can create product with pricing (201)
6. ✅ Can create bundle with items (201)
7. ✅ Bundles calculate profit correctly
8. ✅ Updating product pricing recalculates selling_price

### ❌ Common Issues:

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | Start MySQL service |
| `Access Denied` | Check .env DB_USER & DB_PASSWORD |
| `database not exist` | Run `CREATE DATABASE bidjikita_pos;` |
| `Cannot find module` | Run `npm install` |
| `Duplicate entry` | Product/Bundle name already exists |

---

## Database Verification

### Check Tables Created:
```sql
USE bidjikita_pos;
SHOW TABLES;
```

**Expected tables:**
- `roles`
- `users`
- `categories`
- `products`
- `product_variants`
- `raw_materials`
- `recipes`
- `recipe_details`
- `bundles` ← NEW
- `bundle_items` ← NEW
- `orders`
- `order_details`
- `transactions`
- `shifts`
- `shift_users`

---

## What to Test

Priority order:

1. **Authentication** ✓
   - Register
   - Login
   - Token-based requests

2. **Products** ✓
   - Create product with pricing
   - Get all products
   - Update product pricing
   - Verify selling_price calculates correctly

3. **Bundles** ✓ (NEW)
   - Create bundle with items
   - Get bundles
   - Update bundle
   - Verify profit calculates correctly
   - Delete bundle

4. **Inventory** 
   - Raw materials
   - Recipes
   - Stock reduction

---

## Troubleshooting

### Server won't start:
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process using port 5000 (Windows)
taskkill /PID {process_id} /F
```

### Database connection fails:
```bash
# Test MySQL connection
mysql -u root -p -h localhost

# If prompted for password and you set none, just press Enter
```

### Models not syncing:
- Delete `node_modules` and reinstall
- Check all model imports in `server.js`
- Clear browser cache

---

## Next Steps

Once backend is tested and working:
1. ✅ Build Admin Web UI (React dashboard)
2. ✅ Connect Flutter cashier app to API
3. ✅ Set up production deployment

---

## Files Reference

| File | Purpose |
|------|---------|
| `.env` | Database & JWT config |
| `server.js` | Entry point, model loading |
| `src/app.js` | Express app setup |
| `src/models/Bundle.js` | Bundle model |
| `src/models/BundleItem.js` | Bundle-Product relation |
| `src/controllers/bundleController.js` | Bundle CRUD logic |
| `src/routes/bundleRoutes.js` | Bundle API routes |
| `API_EXTENSION.md` | Full API documentation |

