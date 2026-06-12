const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Bundle = require("./Bundle");
const Product = require("./Product");
const ProductVariant = require("./ProductVariant");

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
      comment: "Quantity of product in bundle",
    },
  },
  {
    tableName: "bundle_items",
    timestamps: true,
  }
);

// Bundle → BundleItem
Bundle.hasMany(BundleItem, {
  foreignKey: "bundle_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
BundleItem.belongsTo(Bundle, {
  foreignKey: "bundle_id",
});

// Product → BundleItem
Product.hasMany(BundleItem, {
  foreignKey: "product_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
BundleItem.belongsTo(Product, {
  foreignKey: "product_id",
});

// ProductVariant → BundleItem (optional — if null, use first variant)
ProductVariant.hasMany(BundleItem, {
  foreignKey: "variant_id",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
BundleItem.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
});

module.exports = BundleItem;
