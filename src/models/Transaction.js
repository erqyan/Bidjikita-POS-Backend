const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

const User = require("./User");
const Shift = require("./Shift");

const Transaction = sequelize.define(
  "Transaction",
  {
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    transaction_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    payment_method: {
      type: DataTypes.ENUM(
        "cash",
        "qris",
        "debit",
        "credit"
      ),
      allowNull: false,
    },

    payment_status: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "cancelled"
      ),
      defaultValue: "paid",
    },

    notes: {
      type: DataTypes.TEXT,
    },
  }
);

// RELATION
User.hasMany(Transaction, {
  foreignKey: "user_id",
});

Transaction.belongsTo(User, {
  foreignKey: "user_id",
});

Shift.hasMany(Transaction, {
  foreignKey: "shift_id",
});

Transaction.belongsTo(Shift, {
  foreignKey: "shift_id",
});

module.exports = Transaction;