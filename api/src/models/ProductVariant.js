const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Product = require("./Product");

const ProductVariant = sequelize.define("ProductVariant", {
  variant_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Selling price for this variant",
  },

  overhead_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Fixed cost per serving: electricity, labor, packaging, etc.",
  },
});

Product.hasMany(ProductVariant, { foreignKey: "product_id", onDelete: "CASCADE" });
ProductVariant.belongsTo(Product, { foreignKey: "product_id" });

module.exports = ProductVariant;
