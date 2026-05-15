const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const variantRoutes = require("./routes/variantRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/shifts", shiftRoutes); 
app.use("/api/transactions",transactionRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "POS Bidjikita API Running",
  });
});

module.exports = app;