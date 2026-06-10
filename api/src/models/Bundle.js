const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Bundle = sequelize.define(
  "Bundle",
  {
    bundle_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bundle_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      comment: "Final bundle selling price (lower than sum of items)"
    },
    total_bundle_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Sum of product costs in bundle (auto-calculated)"
    },
    bundle_profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Profit: bundle_price - total_bundle_cost (auto-calculated)"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "bundles",
    timestamps: true,
  }
);

module.exports = Bundle;
