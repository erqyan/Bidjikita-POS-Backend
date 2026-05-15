const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

const Transaction = require(
  "./Transaction"
);

const Product = require(
  "./Product"
);

const ProductVariant = require(
  "./ProductVariant"
);

const TransactionDetail =
  sequelize.define(
    "TransactionDetail",
    {
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      product_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      variant_price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },

      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    }
  );

// RELATION
Transaction.hasMany(
  TransactionDetail,
  {
    foreignKey:
      "transaction_id",
  }
);

TransactionDetail.belongsTo(
  Transaction,
  {
    foreignKey:
      "transaction_id",
  }
);

Product.hasMany(
  TransactionDetail,
  {
    foreignKey: "product_id",
  }
);

TransactionDetail.belongsTo(
  Product,
  {
    foreignKey: "product_id",
  }
);

ProductVariant.hasMany(
  TransactionDetail,
  {
    foreignKey: "variant_id",
  }
);

TransactionDetail.belongsTo(
  ProductVariant,
  {
    foreignKey: "variant_id",
  }
);

module.exports =
  TransactionDetail;