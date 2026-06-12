const { DataTypes } = require("sequelize");

const sequelize = require(
  "../config/database"
);

const User = require("./User");


const Order = sequelize.define(
  "Order",
  {
    order_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },

    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    order_status: {
      type: DataTypes.ENUM(
        "pending",
        "completed",
        "cancelled"
      ),
      defaultValue: "pending",
    },

    notes: {
      type: DataTypes.TEXT,
    },
  }
,
  {
    tableName: "orders",
  });

User.hasMany(Order, {
  foreignKey: "user_id",
});

Order.belongsTo(User, {
  foreignKey: "user_id",
});


module.exports = Order;
