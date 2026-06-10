# 🚀 Backend Testing - Quick Setup Checklist

## ✅ Completed:
- [x] Backend code extended with Bundle & pricing features
- [x] All dependencies installed (`npm install`)
- [x] `.env` file created with default config
- [x] Comprehensive testing guide created

## ⏳ Next Steps (What YOU Need To Do):

### Step 1: Install MySQL
Choose one:

**Option A: Using Chocolatey (Fast)**
```powershell
choco install mysql
```

**Option B: Download Installer**
- Visit: https://dev.mysql.com/downloads/mysql/
- Download latest MySQL (8.0.x)
- Run installer, accept defaults
- Set root password (or leave blank for no password)

**Option C: Using MariaDB (Alternative)**
```powershell
choco install mariadb
```

---

### Step 2: Start MySQL Service

**Windows Command Prompt (Admin):**
```cmd
net start MySQL80
```

Or:

**Using Services App:**
- Press `Win + R` → `services.msc`
- Find "MySQL80" or "MariaDB"
- Right-click → Start

---

### Step 3: Create Database

**Command Prompt or MySQL Workbench:**
```sql
CREATE DATABASE bidjikita_pos;
```

---

### Step 4: Start Backend Server

**PowerShell:**
```powershell
cd "D:\Project\Bidjikita-POS-Backend"
npm run dev
```

**Expected output:**
```
Database connected
Server running on port 5000
```

---

### Step 5: Test API

**Open Postman or use cURL:**

```bash
# Test health check
curl http://localhost:5000/

# Should return:
# {"message": "POS Bidjikita API Running"}
```

---

## 📋 Test Endpoints (In Order)

1. **Register Admin**
   ```bash
   POST http://localhost:5000/api/auth/register
   ```

2. **Login**
   ```bash
   POST http://localhost:5000/api/auth/login
   ```

3. **Create Bundle** ✨ (NEW FEATURE)
   ```bash
   POST http://localhost:5000/api/bundles
   ```

4. **Get Bundles**
   ```bash
   GET http://localhost:5000/api/bundles
   ```

5. **Update Product Pricing** ✨ (NEW FEATURE)
   ```bash
   PUT http://localhost:5000/api/products/1/pricing
   ```

See `TESTING_GUIDE.md` for detailed request/response examples.

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` | MySQL not running. Run: `net start MySQL80` |
| `Access Denied` | Wrong DB credentials in `.env` |
| `Database not exist` | Run: `CREATE DATABASE bidjikita_pos;` |
| `Port 5000 in use` | Kill process: `taskkill /PID {id} /F` |
| `Cannot find module` | Run: `npm install` again |

---

## 📁 Key Files

- `TESTING_GUIDE.md` - Detailed testing instructions
- `API_EXTENSION.md` - Complete API documentation
- `src/models/Bundle.js` - New Bundle model
- `src/models/BundleItem.js` - New BundleItem model
- `src/controllers/bundleController.js` - Bundle CRUD logic
- `src/routes/bundleRoutes.js` - Bundle API routes

---

## ✨ What's New

### Bundle Features:
- Create bundles with multiple products
- Auto-calculate bundle costs and profit
- Track profitability per bundle
- API fully integrated with existing auth

### Pricing Features:
- Set base_cost per product
- Configure profit_margin (%)
- Auto-calculate selling_price
- New endpoint: `PUT /products/:id/pricing`

---

## 🎯 Expected Test Results

✅ Create product with pricing
✅ Create bundle with items
✅ Bundle automatically calculates profit
✅ Update pricing recalculates selling_price
✅ All responses include proper timestamps
✅ Admin endpoints require authentication
✅ Pagination works correctly

---

## 📞 Need Help?

Refer to:
1. `TESTING_GUIDE.md` - Step-by-step instructions
2. `API_EXTENSION.md` - Full API reference
3. See postman collection in docs

---

## 🚀 After Testing

Once everything works:
1. **Build Admin Web UI** - React dashboard
2. **Connect Flutter app** - Use API instead of hardcoded data
3. **Deploy** - Production setup

---

**Ready to test? Start with Step 1 above!** 🎉
