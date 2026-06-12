const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const RawMaterial = require("./RawMaterial");
const User = require("./User");

const IngredientLog = sequelize.define(
  "IngredientLog",
  {
    raw_material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    material_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Snapshot of the material name at time of change",
    },
    previous_stock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    new_stock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity_change: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Positive = added, negative = subtracted",
    },
    change_type: {
      type: DataTypes.ENUM("manual_adjustment", "order_deduction"),
      allowNull: false,
      defaultValue: "manual_adjustment",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Snapshot of the user who made the change",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "ingredient_logs",
    timestamps: true,
    updatedAt: false,
  }
);

RawMaterial.hasMany(IngredientLog, {
  foreignKey: "raw_material_id",
  onDelete: "CASCADE",
});
IngredientLog.belongsTo(RawMaterial, {
  foreignKey: "raw_material_id",
});

User.hasMany(IngredientLog, {
  foreignKey: "user_id",
  constraints: false,
});
IngredientLog.belongsTo(User, {
  foreignKey: "user_id",
  constraints: false,
});

module.exports = IngredientLog;
