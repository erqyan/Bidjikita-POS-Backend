const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const variantRoutes = require("./routes/variantRoutes");

const transactionRoutes = require("./routes/transactionRoutes");
const rawMaterialRoutes = require("./routes/rawMaterialRoutes");
const orderRoutes = require("./routes/orderRoutes");
const bundleRoutes = require("./routes/bundleRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Security
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Body parsing with size limit
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/variants", variantRoutes);

app.use("/api/transactions", transactionRoutes);
app.use("/api/raw-materials", rawMaterialRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "POS Bidjikita API Running" });
});

// Global error handler — returns JSON instead of HTML
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Terjadi kesalahan server"
        : err.message,
  });
});

module.exports = app;
