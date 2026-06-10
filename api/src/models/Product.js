const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Category = require("./Category");

const Product = sequelize.define("Product", {
  product_name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: DataTypes.TEXT,
  base_price: {
    type: DataTypes.DECIMAL(10, 2),
    comment: "Legacy field – prefer selling_price",
  },
  image_url: DataTypes.TEXT,

  // ── Cost tracking ────────────────────────────────────────────────────
  base_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Ingredient cost – auto-calculated from recipe",
  },
  overhead_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Fixed cost per serving: electricity, labor, packaging, etc.",
  },

  // ── Pricing ─────────────────────────────────────────────────────────
  selling_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Price charged to customers – set directly by admin",
  },

  // profit_margin kept as a stored/derived field for backward compat
  profit_margin: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Derived: (selling_price - total_cost) / selling_price * 100",
  },

  status: {
    type: DataTypes.ENUM("available", "out_of_stock"),
    defaultValue: "available",
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Category.hasMany(Product, { foreignKey: "category_id" });
Product.belongsTo(Category, { foreignKey: "category_id" });

module.exports = Product;
