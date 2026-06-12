const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Role = sequelize.define("Role", {
  role_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  },
  {
    tableName: "roles",
  });

module.exports = Role;