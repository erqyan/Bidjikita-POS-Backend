const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define("Category", {
    category_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    },

    description: {
        type: DataTypes.TEXT,
    },
});

module.exports = Category;  