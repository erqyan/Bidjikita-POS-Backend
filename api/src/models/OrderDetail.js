const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("./Order");
const Product = require("./Product");
const Bundle = require("./Bundle");

/**
 * One row per product line in an order.
 * Variant selections (size, sugar level, etc.) are stored in OrderDetailVariant.
 *
 * For regular items: `product_id` references the Product and variants are tracked.
 * For bundle items: `product_id` is NULL, `bundle_id`/`bundle_name` hold the bundle
 * info, and `bundle_items_json` stores the expanded contents for stock deduction.
 */
const OrderDetail = sequelize.define("OrderDetail", {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // Final unit price after applying the chosen size price_override + any topping add-ons
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  // ── Bundle tracking ──────────────────────────────────────────────────────
  // When the customer purchased a bundle, this item references the Bundle
  // and stores the expanded contents so stock can still be deducted.
  bundle_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "References the Bundle table",
  },
  bundle_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Snapshot of the bundle name at time of purchase",
  },
  bundle_items_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "JSON array of {product_id, quantity, variant_ids} for stock deduction and display",
  },
  },
  {
    tableName: "order_details",
  });

Order.hasMany(OrderDetail, { foreignKey: "order_id" });
OrderDetail.belongsTo(Order, { foreignKey: "order_id" });

Product.hasMany(OrderDetail, { foreignKey: "product_id" });
OrderDetail.belongsTo(Product, { foreignKey: { name: "product_id", allowNull: true } });

Bundle.hasMany(OrderDetail, { foreignKey: "bundle_id", constraints: false });
OrderDetail.belongsTo(Bundle, { foreignKey: "bundle_id", constraints: false });

module.exports = OrderDetail;
