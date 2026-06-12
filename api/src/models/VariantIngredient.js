const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const ProductVariant = require("./ProductVariant");
const RawMaterial = require("./RawMaterial");

/**
 * Direct bridge: a variant requires a specific quantity of a raw material.
 * Replaces the old Recipe → RecipeDetail indirection.
 *
 * Example:
 *   Variant "Regular Iced" → Arabica 15 g
 *   Variant "Regular Iced" → Milk 150 ml
 *   Variant "Large Iced"   → Arabica 20 g
 *   Variant "Large Iced"   → Milk 200 ml
 */
const VariantIngredient = sequelize.define(
  "VariantIngredient",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.1 },
    },
  },
  {
    tableName: "variantingredients",
    timestamps: true,
  }
);

ProductVariant.hasMany(VariantIngredient, {
  foreignKey: "variant_id",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
VariantIngredient.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
});

RawMaterial.hasMany(VariantIngredient, {
  foreignKey: "raw_material_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
VariantIngredient.belongsTo(RawMaterial, {
  foreignKey: "raw_material_id",
});

module.exports = VariantIngredient;
