# ☕ Bidjikita POS Backend

Backend REST API untuk aplikasi Point of Sale (POS) coffee shop menggunakan:

- Node.js
- Express.js
- Sequelize ORM
- MySQL / MariaDB
- JWT Authentication

Project ini mendukung:

✅ Authentication & Authorization  
✅ Role Management (Admin / Cashier)  
✅ Category Management  
✅ Product & Variant Management  
✅ Shift Management  
✅ Raw Material Management  
✅ Recipe Management  
✅ Order Management  
✅ Transaction System  
✅ Automatic Inventory Reduction  
✅ JWT Security  
✅ Professional Relational Database Structure  

---

# 📦 Tech Stack

| Technology | Description |
|---|---|
| Node.js | JavaScript Runtime |
| Express.js | Backend Framework |
| Sequelize | ORM for MySQL |
| MySQL / MariaDB | Database |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| dotenv | Environment Variables |
| nodemon | Development Server |

---

# 📁 Project Structure

```bash
bidjikita-pos-backend/
│
├── src/
│   ├── config/
│   │   └── database.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── productController.js
│   │   ├── variantController.js
│   │   ├── shiftController.js
│   │   ├── rawMaterialController.js
│   │   ├── recipeController.js
│   │   ├── orderController.js
│   │   └── transactionController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── adminMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── ProductVariant.js
│   │   ├── Shift.js
│   │   ├── ShiftUser.js
│   │   ├── RawMaterial.js
│   │   ├── Recipe.js
│   │   ├── RecipeDetail.js
│   │   ├── Order.js
│   │   ├── OrderDetail.js
│   │   └── Transaction.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── productRoutes.js
│   │   ├── variantRoutes.js
│   │   ├── shiftRoutes.js
│   │   ├── rawMaterialRoutes.js
│   │   ├── recipeRoutes.js
│   │   ├── orderRoutes.js
│   │   └── transactionRoutes.js
│   │
│   ├── services/
│   │   └── stockService.js
│   │
│   └── app.js
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone https://github.com/erqyan/Bidjikita-POS-Backend.git
```

---

## 2. Masuk ke Folder Project

```bash
cd Bidjikita-POS-Backend
```

---

## 3. Install Dependencies

```bash
npm install
```

---

# 🛠️ Environment Configuration

Buat file:

```bash
.env
```

Lalu isi:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bidjikita_pos

JWT_SECRET=your_secret_key
```

---

# 🗄️ Database Setup

## 1. Buat Database

Masuk MySQL:

```sql
CREATE DATABASE bidjikita_pos;
```

---

## 2. Jalankan Backend

```bash
npm run dev
```

Jika berhasil:

```bash
Database connected
Server running on port 5000
```

---

# 🔐 Authentication

Project menggunakan:

- JWT Authentication
- Role Based Authorization

## Roles

| Role | Access |
|---|---|
| Admin | Full Access |
| Cashier | Order & Transaction |

---

# 📮 Postman Collection

API Collection tersedia di:

🔗
https://material-architect-13385944-9945002.postman.co/workspace/REGIANA-HERMAWAN's-Workspace~c4c86998-0917-4a17-834d-92736501cdf9/collection/50411160-d7ab077d-9bcf-409a-8a9b-561d05fcea3b?action=share&creator=50411160

---

# 📚 API Documentation

Base URL:

```http
http://localhost:5000/api
```

---

# 🔑 Auth Endpoints

| Method | Endpoint |
|---|---|
| POST | /auth/register |
| POST | /auth/login |

---

# 📂 Category Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /categories | Public |
| POST | /categories | Admin |
| PUT | /categories/:id | Admin |
| DELETE | /categories/:id | Admin |

---

# ☕ Product Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /products | Public |
| GET | /products/:id | Public |
| POST | /products | Admin |
| PUT | /products/:id | Admin |
| DELETE | /products/:id | Admin |

---

# 🧩 Variant Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /variants | Public |
| GET | /variants/:id | Public |
| POST | /variants | Admin |
| PUT | /variants/:id | Admin |
| DELETE | /variants/:id | Admin |

---

# 👥 Shift Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /shifts | Login User |
| GET | /shifts/:id | Login User |
| POST | /shifts | Admin |
| PUT | /shifts/:id | Admin |
| DELETE | /shifts/:id | Admin |

---

# 🧱 Raw Material Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /raw-materials | Login User |
| GET | /raw-materials/:id | Login User |
| POST | /raw-materials | Admin |
| PUT | /raw-materials/:id | Admin |
| DELETE | /raw-materials/:id | Admin |

---

# 📖 Recipe Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /recipes | Login User |
| GET | /recipes/:id | Login User |
| POST | /recipes | Admin |
| PUT | /recipes/:id | Admin |
| DELETE | /recipes/:id | Admin |

---

# 🧾 Order Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /orders | Admin & Cashier |
| GET | /orders/:id | Admin & Cashier |
| POST | /orders | Admin & Cashier |
| PUT | /orders/:id | Admin & Cashier |
| DELETE | /orders/:id | Admin & Cashier |

---

# 💳 Transaction Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /transactions | Admin & Cashier |
| GET | /transactions/:id | Admin & Cashier |
| POST | /transactions | Admin & Cashier |
| PUT | /transactions/:id | Admin & Cashier |
| DELETE | /transactions/:id | Admin & Cashier |

---

# ☕ Inventory Flow

```text
Raw Material
      ↓
Recipe
      ↓
Order
      ↓
Stock Automatically Reduced
      ↓
Transaction
```

---

# 🧾 Example Order Request

```json
{
  "shift_id": 5,
  "notes": "Customer dine in",

  "items": [
    {
      "product_id": 6,
      "variant_id": 4,
      "quantity": 3
    }
  ]
}
```

---

# 📖 Example Recipe Request

```json
{
  "recipe_name": "Americano Medium",
  "product_id": 6,
  "variant_id": 4,

  "materials": [
    {
      "raw_material_id": 6,
      "quantity": 20
    },
    {
      "raw_material_id": 5,
      "quantity": 200
    },
    {
      "raw_material_id": 4,
      "quantity": 1
    }
  ]
}
```

---

# 🧱 Example Raw Material Request

```json
{
  "material_name": "Robusta",
  "unit": "gram",
  "stock": 5000,
  "minimum_stock": 500
}
```

---

# 🗃️ Database Relations

```text
roles
   ↓
users

categories
   ↓
products
   ↓
product_variants

products
   ↓
recipes
   ↓
recipedetails
   ↓
raw_materials

shifts
   ↓
shift_users
   ↓
users

users
   ↓
orders
   ↓
order_details
   ↓
products
   ↓
product_variants

orders
   ↓
transactions
```

---

# 🔒 Security Features

✅ Password Hashing using bcryptjs  
✅ JWT Authentication  
✅ Role Based Authorization  
✅ Duplicate Validation  
✅ Foreign Key Validation  
✅ Inventory Protection  
✅ Recipe Protection  
✅ Protected Raw Material Deletion  

---

# 🚀 Development

Run development server:

```bash
npm run dev
```

---

# 📌 Future Improvements

- Payment Gateway
- Receipt Printing
- Dashboard Analytics
- Sales Reports
- Stock Notifications
- Sequelize Migration
- Refresh Token Authentication
- Soft Delete
- Audit Logs

---

# 👨‍💻 Author

**Regiana Hermawan**

GitHub:
https://github.com/erqyan

---

# 📄 License

This project is for educational and learning purposes.