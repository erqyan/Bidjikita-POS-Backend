const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Bundle = require("./Bundle");
const Product = require("./Product");

const BundleItem = sequelize.define(
  "BundleItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
      comment: "Quantity of product in bundle"
    },
  },
  {
    tableName: "bundle_items",
    timestamps: true,
  }
);

// ============================================
// BUNDLE RELATION
// ============================================

Bundle.hasMany(BundleItem, {
  foreignKey: "bundle_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

BundleItem.belongsTo(Bundle, {
  foreignKey: "bundle_id",
});

// ============================================
// PRODUCT RELATION
// ============================================

Product.hasMany(BundleItem, {
  foreignKey: "product_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

BundleItem.belongsTo(Product, {
  foreignKey: "product_id",
});

module.exports = BundleItem;
