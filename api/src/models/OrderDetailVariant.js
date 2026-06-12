const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const OrderDetail = require("./OrderDetail");
const ProductVariant = require("./ProductVariant");

/**
 * Join table that stores every variant selection for a single order line.
 * One OrderDetail can have many variants (e.g. Small (Hot) + Less Sugar).
 */
const OrderDetailVariant = sequelize.define(
  "OrderDetailVariant",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  },
  {
    tableName: "orderdetailvariants",
    timestamps: false,
  }
);

OrderDetail.hasMany(OrderDetailVariant, {
  foreignKey: "order_detail_id",
  onDelete: "CASCADE",
});
OrderDetailVariant.belongsTo(OrderDetail, {
  foreignKey: "order_detail_id",
});

ProductVariant.hasMany(OrderDetailVariant, {
  foreignKey: "variant_id",
});
OrderDetailVariant.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
});

module.exports = OrderDetailVariant;
