const express = require("express");
const cors = require("cors");
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

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded product images as static files
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
  res.json({
    message: "POS Bidjikita API Running",
  });
});

module.exports = app;
