const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Role = require("./Role");

const User = sequelize.define("User", {
  full_name: DataTypes.STRING,
  username: {type: DataTypes.STRING, allowNull: false, unique: true, },
  password_hash: DataTypes.STRING,
  phone_number: DataTypes.STRING,
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login: DataTypes.DATE,
});

Role.hasMany(User, {
  foreignKey: "role_id",
});

User.belongsTo(Role, {
  foreignKey: "role_id",
});

module.exports = User;