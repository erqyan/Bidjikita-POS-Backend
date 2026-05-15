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
✅ Transaction System  
✅ Multi-item Transaction  
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
│   │   ├── Transaction.js
│   │   └── TransactionDetail.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── productRoutes.js
│   │   ├── variantRoutes.js
│   │   ├── shiftRoutes.js
│   │   └── transactionRoutes.js
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
| Cashier | Transaction Access |

---

# 📚 API Documentation

Base URL:

```http
http://localhost:5000/api
```

---

# 📮 Postman Collection

API documentation dan testing endpoint tersedia melalui Postman Collection berikut:

🔗 Postman Collection:

[Bidjikita POS Postman Collection](https://material-architect-13385944-9945002.postman.co/workspace/REGIANA-HERMAWAN's-Workspace~c4c86998-0917-4a17-834d-92736501cdf9/collection/50411160-d7ab077d-9bcf-409a-8a9b-561d05fcea3b?action=share&creator=50411160&utm_source=chatgpt.com)

---

## Collection Includes

✅ Authentication Endpoints  
✅ Category CRUD  
✅ Product CRUD  
✅ Variant CRUD  
✅ Shift CRUD  
✅ Transaction CRUD  
✅ JWT Authorization Example  
✅ Example Request Body  
✅ Protected Route Testing  

---

## How to Use

### 1. Open Collection Link

Klik link Postman Collection di atas.

---

### 2. Import Collection

Klik:

```text
Run in Postman
```

atau:

```text
Fork Collection
```

---

### 3. Set Environment Variables

Gunakan:

| Variable | Value |
|---|---|
| base_url | http://localhost:5000/api |
| token | JWT_TOKEN |

---

### 4. Login First

Gunakan endpoint:

```http
POST /auth/login
```

Copy token JWT dari response login.

---

### 5. Paste JWT Token

Masukkan ke variable:

```text
token
```

---

### 6. Test All Endpoints

Sekarang semua endpoint siap digunakan.

---

# 🔑 Auth Endpoints

## Register

```http
POST /auth/register
```

### Body

```json
{
  "full_name": "Admin",
  "username": "admin",
  "password": "123456",
  "phone_number": "08123456789",
  "role_id": 1
}
```

---

## Login

```http
POST /auth/login
```

### Body

```json
{
  "username": "admin",
  "password": "123456"
}
```

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

# 💳 Transaction Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | /transactions | Login User |
| GET | /transactions/:id | Login User |
| POST | /transactions | Admin & Cashier |
| PUT | /transactions/:id | Admin & Cashier |
| DELETE | /transactions/:id | Admin & Cashier |

---

# 🧾 Example Transaction Request

```json
{
  "shift_id": 1,
  "payment_method": "cash",
  "payment_status": "paid",
  "notes": "Customer dine in",

  "items": [
    {
      "product_id": 1,
      "variant_id": 1,
      "quantity": 2
    },
    {
      "product_id": 2,
      "variant_id": 3,
      "quantity": 1
    }
  ]
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

shifts
   ↓
shift_users
   ↓
users

users
   ↓
transactions
   ↓
transaction_details
   ↓
products
   ↓
product_variants
```

---

# 🔒 Security Features

✅ Password Hashing using bcryptjs  
✅ JWT Authentication  
✅ Admin Authorization Middleware  
✅ Input Validation  
✅ Duplicate Data Prevention  
✅ Foreign Key Validation  

---

# 🚀 Development

Run development server:

```bash
npm run dev
```

---

# 📌 Future Improvements

- Payment Table
- Receipt Printing
- Dashboard Analytics
- Stock Management
- Sales Reports
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