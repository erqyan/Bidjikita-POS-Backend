const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Category = require("./Category");

const Product = sequelize.define("Product", {
  product_name: {type: DataTypes.STRING, allowNull: false, unique: true,},
  description: DataTypes.TEXT,
  base_price: DataTypes.DECIMAL,
  image_url: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM("available", "out_of_stock"),
    defaultValue: "available",
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

Category.hasMany(Product, {
  foreignKey: "category_id",
});

Product.belongsTo(Category, {
  foreignKey: "category_id",
});

module.exports = Product;
