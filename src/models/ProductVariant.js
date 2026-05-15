const { DataTypes } = require("sequelize");

const sequelize = require("../config/database");

const Product = require("./Product");

const ProductVariant = sequelize.define(
  "ProductVariant",
  {
    variant_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    variant_type: {
      type: DataTypes.ENUM(
        "size",
        "topping"
      ),
      allowNull: false,
    },

    additional_price: {
      type: DataTypes.DECIMAL,
      defaultValue: 0,
    },
  }
);

Product.hasMany(ProductVariant, {
  foreignKey: "product_id",
});

ProductVariant.belongsTo(Product, {
  foreignKey: "product_id",
});

module.exports = ProductVariant;