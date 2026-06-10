# Bundle & Pricing API Extension

## Overview
Extended the Bidjikita POS Backend with:
- Bundle management system (create, read, update, delete bundles)
- Product pricing features (base_cost, profit_margin, auto-calculated selling_price)
- Bundle profitability tracking

---

## New Database Models

### Bundle Model
```javascript
{
  id: INTEGER (PK),
  bundle_name: STRING (UNIQUE),
  description: TEXT,
  bundle_price: DECIMAL - Final selling price for bundle
  total_bundle_cost: DECIMAL - Sum of product costs (auto-calculated)
  bundle_profit: DECIMAL - Profit = bundle_price - total_bundle_cost (auto-calculated)
  is_active: BOOLEAN (default: true),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### BundleItem Model
```javascript
{
  id: INTEGER (PK),
  bundle_id: INTEGER (FK → Bundle),
  product_id: INTEGER (FK → Product),
  quantity: INTEGER,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Updated Product Model
**New Fields:**
- `base_cost`: DECIMAL - Sum of recipe ingredient costs
- `profit_margin`: INTEGER (0-100) - Profit margin percentage
- `selling_price`: DECIMAL - Auto-calculated: `base_cost × (1 + profit_margin/100)`

---

## New API Endpoints

### Bundle Endpoints
Base URL: `http://localhost:5000/api/bundles`

#### 1. Create Bundle (Admin)
```
POST /api/bundles
Authorization: Bearer {token}
Content-Type: application/json

{
  "bundle_name": "Morning Bundle",
  "description": "Espresso + Croissant combo",
  "bundle_price": 45000,
  "items": [
    { "product_id": 1, "quantity": 1 },
    { "product_id": 5, "quantity": 1 }
  ]
}

Response: 201 Created
{
  "id": 1,
  "bundle_name": "Morning Bundle",
  "bundle_price": 45000,
  "total_bundle_cost": 35000,
  "bundle_profit": 10000,
  "is_active": true,
  "BundleItems": [
    {
      "id": 1,
      "quantity": 1,
      "Product": {
        "id": 1,
        "product_name": "Espresso",
        "base_cost": 20000,
        "selling_price": 26000
      }
    },
    ...
  ]
}
```

#### 2. Get All Bundles (Public - Active only)
```
GET /api/bundles

Response: 200 OK
[
  {
    "id": 1,
    "bundle_name": "Morning Bundle",
    "bundle_price": 45000,
    ...
  }
]
```

#### 3. Get All Bundles (Admin - Including inactive)
```
GET /api/bundles/all/admin
Authorization: Bearer {token}

Response: 200 OK
[...]
```

#### 4. Get Bundle by ID
```
GET /api/bundles/:id

Response: 200 OK
{
  "id": 1,
  "bundle_name": "Morning Bundle",
  ...
}
```

#### 5. Update Bundle (Admin)
```
PUT /api/bundles/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "bundle_name": "Morning Coffee Bundle",
  "bundle_price": 50000,
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ]
}

Response: 200 OK
{
  "id": 1,
  "bundle_name": "Morning Coffee Bundle",
  "bundle_price": 50000,
  ...
}
```

#### 6. Delete Bundle (Admin)
```
DELETE /api/bundles/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "message": "Bundle deleted successfully"
}
```

---

## Updated Product Endpoints

### Update Product Pricing (Admin)
```
PUT /api/products/:id/pricing
Authorization: Bearer {token}
Content-Type: application/json

{
  "base_cost": 20000,
  "profit_margin": 30
}

Response: 200 OK
{
  "id": 1,
  "product_name": "Espresso",
  "base_cost": 20000,
  "profit_margin": 30,
  "selling_price": 26000,
  ...
}
```

**Calculation:**
- `selling_price = base_cost × (1 + profit_margin/100)`
- Example: `20000 × (1 + 30/100) = 26000`

---

## Database Relations

```
Products
  ↓
Bundle Items ← Bundles
  ↓
Bundle Items
```

**SQL:**
```sql
-- Bundle to BundleItem (1:N)
ALTER TABLE bundle_items ADD FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE;

-- Product to BundleItem (1:N)
ALTER TABLE bundle_items ADD FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
```

---

## Implementation Flow

### Admin Web App Workflow:
1. **Create Ingredients** → RawMaterial via `/api/raw-materials`
2. **Create Products** → Product via `/api/products` with category
3. **Create Recipes** → Recipe + RecipeDetail via `/api/recipes` (maps ingredients to products)
4. **Calculate Base Cost** → API auto-sums recipe ingredients
5. **Set Profit Margin** → PUT `/api/products/:id/pricing` to set profit % and auto-calculate selling_price
6. **Create Bundles** → POST `/api/bundles` with selected products + quantities and final bundle_price
7. **System Calculates** → Auto-calculates total_bundle_cost and bundle_profit

### Cashier App Workflow:
1. **Fetch Products** → GET `/api/products` (includes selling_price)
2. **Fetch Bundles** → GET `/api/bundles` (includes bundle_price)
3. **Create Order** → POST `/api/orders` with product_ids or bundle_ids
4. **Inventory Reduced** → Auto-deduct recipe items from stock

---

## Error Handling

### Common Errors:

**400 - Bad Request**
```json
{
  "message": "Bundle name already exists"
}
```

**404 - Not Found**
```json
{
  "message": "Product 999 not found"
}
```

**401 - Unauthorized**
```json
{
  "message": "Missing or invalid token"
}
```

**403 - Forbidden**
```json
{
  "message": "Only admins can perform this action"
}
```

---

## Testing with Postman

### 1. Register & Login
```
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@bidjikita.com",
  "password": "password123",
  "role": "admin"
}
```

### 2. Login to get token
```
POST /api/auth/login
{
  "username": "admin",
  "password": "password123"
}

Returns: { "token": "eyJhbGc..." }
```

### 3. Create Bundle
Use token in Authorization header (Bearer {token})

---

## Files Modified/Created

### Created:
- `src/models/Bundle.js` - Bundle model
- `src/models/BundleItem.js` - BundleItem model with relations
- `src/controllers/bundleController.js` - Bundle CRUD logic
- `src/routes/bundleRoutes.js` - Bundle API routes
- `API_EXTENSION.md` - This documentation

### Modified:
- `src/models/Product.js` - Added base_cost, profit_margin, selling_price fields
- `src/controllers/productController.js` - Added updateProductPricing function
- `src/routes/productRoutes.js` - Added PUT /products/:id/pricing endpoint
- `src/app.js` - Added bundleRoutes import
- `server.js` - Added Bundle & BundleItem model imports

---

## Next Steps

1. **Admin Web App**: Build React dashboard to manage ingredients, products, bundles
2. **Flutter Integration**: Update cashier app to fetch products & bundles from API
3. **Order Integration**: Update order creation to support bundle_ids
4. **Analytics**: Add dashboard to track bundle profitability

---

## Security Notes

✅ All admin endpoints require authentication
✅ Admin middleware validates role
✅ Foreign key constraints prevent orphaned data
✅ Products in bundles cannot be deleted (RESTRICT)
✅ Bundle deletion cascades to bundle_items

---

## Questions?

Refer to existing patterns in the codebase for:
- Error handling (see productController.js)
- Authentication (see authMiddleware.js)
- Database relations (see RecipeDetail.js)
