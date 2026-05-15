const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

const Shift = require("./Shift");
const User = require("./User");

const ShiftUser = sequelize.define(
  "ShiftUser",
  {},
  {
    tableName: "shift_users",
  }
);

// MANY TO MANY
Shift.belongsToMany(User, {
  through: ShiftUser,
  foreignKey: "shift_id",
});

User.belongsToMany(Shift, {
  through: ShiftUser,
  foreignKey: "user_id",
});

module.exports = ShiftUser;