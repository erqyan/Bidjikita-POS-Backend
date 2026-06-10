const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RawMaterial = sequelize.define(
  "RawMaterial",
  {
    material_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    minimum_stock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    // Cost per unit of this ingredient (e.g. Rp 500 per gram)
    cost_per_unit: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: "Cost per unit of measure (e.g. cost per gram, per ml)",
    },
  },
  {
    tableName: "rawmaterials",
    timestamps: true,
  },
);

module.exports = RawMaterial;
