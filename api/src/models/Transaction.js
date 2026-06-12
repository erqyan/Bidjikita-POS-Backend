const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

const User = require("./User");

const Order = require("./Order");

const Transaction = sequelize.define(
  "Transaction",
  {
    invoice_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },

    transaction_date: {
      type: DataTypes.DATE,
      defaultValue:
        DataTypes.NOW,
    },

    total_amount: {
      type: DataTypes.DECIMAL(
        10,
        2
      ),
      allowNull: false,
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
        "failed"
      ),
      defaultValue:
        "paid",
    },

    notes: {
      type: DataTypes.TEXT,
    },
  }
);

// USER
User.hasMany(Transaction, {
  foreignKey: "user_id",
});

Transaction.belongsTo(User, {
  foreignKey: "user_id",
});


// ORDER
Order.hasOne(Transaction, {
  foreignKey: "order_id",
});

Transaction.belongsTo(Order, {
  foreignKey: "order_id",
});

module.exports = Transaction;
