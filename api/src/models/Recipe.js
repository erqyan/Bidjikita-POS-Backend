const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const Product = require("./Product");
const ProductVariant = require(
  "./ProductVariant"
);

const Recipe = sequelize.define(
  "Recipe",
  {
    recipe_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }
);

Product.hasMany(Recipe, {
  foreignKey: "product_id",
});

Recipe.belongsTo(Product, {
  foreignKey: "product_id",
});

ProductVariant.hasMany(Recipe, {
  foreignKey: "variant_id",
});

Recipe.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
});

module.exports = Recipe;