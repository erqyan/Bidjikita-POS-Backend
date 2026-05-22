const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Order = require("./Order");
const Product = require("./Product");
const ProductVariant = require(
  "./ProductVariant"
);

const OrderDetail = sequelize.define(
  "OrderDetail",
  {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  }
);

Order.hasMany(OrderDetail, {
  foreignKey: "order_id",
});

OrderDetail.belongsTo(Order, {
  foreignKey: "order_id",
});

Product.hasMany(OrderDetail, {
  foreignKey: "product_id",
});

OrderDetail.belongsTo(Product, {
  foreignKey: "product_id",
});

ProductVariant.hasMany(OrderDetail, {
  foreignKey: "variant_id",
});

OrderDetail.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
});

module.exports = OrderDetail;