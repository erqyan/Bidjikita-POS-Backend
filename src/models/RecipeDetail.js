const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

const Recipe = require(
  "./Recipe"
);

const RawMaterial = require(
  "./RawMaterial"
);

const RecipeDetail = sequelize.define(
  "RecipeDetail",
  {
    id: {
      type: DataTypes.INTEGER,

      autoIncrement: true,

      primaryKey: true,
    },

    quantity: {
      type: DataTypes.DECIMAL(
        10,
        2
      ),

      allowNull: false,

      validate: {
        min: 0,
      },
    },
  },
  {
    tableName:
      "recipedetails",

    timestamps: true,
  }
);

// ======================
// RECIPE RELATION
// ======================

Recipe.hasMany(
  RecipeDetail,
  {
    foreignKey:
      "recipe_id",

    onDelete:
      "CASCADE",

    onUpdate:
      "CASCADE",
  }
);

RecipeDetail.belongsTo(
  Recipe,
  {
    foreignKey:
      "recipe_id",
  }
);

// ======================
// RAW MATERIAL RELATION
// ======================

RawMaterial.hasMany(
  RecipeDetail,
  {
    foreignKey:
      "raw_material_id",

    onDelete:
      "RESTRICT",

    onUpdate:
      "CASCADE",
  }
);

RecipeDetail.belongsTo(
  RawMaterial,
  {
    foreignKey:
      "raw_material_id",

    onDelete:
      "RESTRICT",

    onUpdate:
      "CASCADE",
  }
);

module.exports =
  RecipeDetail;