const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

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
      type: DataTypes.DECIMAL(
        10,
        2
      ),

      allowNull: false,

      defaultValue: 0,
    },

    minimum_stock: {
      type: DataTypes.DECIMAL(
        10,
        2
      ),

      allowNull: false,

      defaultValue: 0,
    },
  },
  {
    tableName:
      "rawmaterials",

    timestamps: true,
  }
);

module.exports =
  RawMaterial;