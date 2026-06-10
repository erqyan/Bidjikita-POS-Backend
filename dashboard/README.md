# ☕ Bidjikita Admin Dashboard

Web dashboard untuk pemilik/admin POS Bidjikita Coffee Shop.

## Tech Stack

- **React 18** + TypeScript
- **Vite 5** (bundler)
- **Tailwind CSS 3** (styling)
- **React Router v6** (routing)
- **@tanstack/react-query v5** (server state)
- **Zustand v4** (client state)
- **React Hook Form v7** + **Zod** (forms & validation)
- **Axios** (HTTP client)
- **Recharts** (charts)
- **Radix UI** (accessible components)
- **Lucide React** (icons)

## Fitur

| Halaman | Fitur |
|---------|-------|
| Dashboard | KPI cards, revenue chart 7 hari, produk terlaris, transaksi terbaru |
| Menu | CRUD Kategori, Produk (dengan harga/margin/biaya), Varian |
| Bahan Baku | CRUD bahan baku, indikator stok rendah, alert stok |
| Resep | CRUD resep dengan bahan dinamis, kaitkan ke produk/varian |
| Bundling | CRUD bundle produk, kalkulasi profit, aktif/nonaktif |
| Transaksi | Riwayat + filter + detail order |
| Analitik | Grafik pendapatan, pie chart metode bayar, top produk, performa shift |
| Shift | CRUD shift kasir |
| Pengguna | CRUD kasir, toggle aktif, ganti password |

## Setup

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

### 2. Konfigurasi Environment

Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Jalankan Development Server

Pastikan backend sudah berjalan di port 5000, lalu:

```bash
npm run dev
```

Buka: http://localhost:3000

### 4. Build Production

```bash
npm run build
```

## Struktur Folder

```
src/
├── api/          # Axios API functions per resource
├── components/
│   ├── layout/   # AppLayout, Sidebar, Header
│   └── ui/       # Button, Input, Card, Table, Dialog, dll
├── hooks/        # useDebounce
├── lib/          # axios instance, utility functions
├── pages/        # Halaman-halaman dashboard
├── store/        # Zustand stores (auth, toast)
└── types/        # TypeScript interfaces
```

## Login

Gunakan akun Admin yang telah dibuat di backend. Role harus `admin` untuk mengakses dashboard ini.
