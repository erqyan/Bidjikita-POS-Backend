const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const OrderDetailVariant = require("../models/OrderDetailVariant");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Bundle = require("../models/Bundle");
const User = require("../models/User");

// reusable include
const transactionInclude = [
  {
    model: User,
    attributes: ["id", "full_name", "username"],
  },

  {
    model: Order,
    attributes: ["id", "order_number", "total_amount", "order_status", "notes", "createdAt"],

    include: [
      {
        model: OrderDetail,
        attributes: ["id", "quantity", "price", "subtotal", "bundle_id", "bundle_name", "bundle_items_json"],

        include: [
          {
            model: Product,
            attributes: ["id", "product_name"],
          },
          {
            model: OrderDetailVariant,
            attributes: ["id"],
            include: [
              {
                model: ProductVariant,
                attributes: ["id", "variant_name", "price"],
              },
            ],
          },
          {
            model: Bundle,
            attributes: ["id", "bundle_name", "bundle_price"],
          },
        ],
      },
    ],
  },
];

// CREATE TRANSACTION
exports.createTransaction =
  async (req, res) => {
    try {

      const {
        order_id,
        payment_method,
        payment_status,
        notes,
      } = req.body;

      // cek order
      const order =
        await Order.findByPk(
          order_id,
          {
            include: [
              OrderDetail,
            ],
          }
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found",
        });
      }

      // cek duplicate transaction
      const existingTransaction =
        await Transaction.findOne({
          where: {
            order_id,
          },
        });

      if (existingTransaction) {
        return res.status(400).json({
          message:
            "Transaction already exists",
        });
      }

      // generate invoice
      const invoice_number =
        "INV-" + Date.now();

      // create transaction
      const transaction =
        await Transaction.create({
          invoice_number,

          transaction_date:
            new Date(),

          total_amount:
            order.total_amount,

          payment_method,

          payment_status,

          notes,

          user_id:
            req.user.id,

          order_id,
        });

      // update order status
      await order.update({
        order_status:
          "completed",
      });

      // get safe result
      const result =
        await Transaction.findByPk(
          transaction.id,
          {
            attributes: [
              "id",
              "invoice_number",
              "transaction_date",
              "total_amount",
              "payment_method",
              "payment_status",
              "notes",
            ],

            include:
              transactionInclude,
          }
        );

      res.status(201).json(
        result
      );

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// GET ALL TRANSACTIONS
exports.getTransactions =
  async (req, res) => {
    try {

      const transactions =
        await Transaction.findAll({
          attributes: [
            "id",
            "invoice_number",
            "transaction_date",
            "total_amount",
            "payment_method",
            "payment_status",
            "notes",
          ],

          include:
            transactionInclude,

          order: [
            ["createdAt", "DESC"],
          ],
        });

      res.json(
        transactions
      );

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// GET TRANSACTION BY ID
exports.getTransactionById =
  async (req, res) => {
    try {

      const transaction =
        await Transaction.findByPk(
          req.params.id,
          {
            attributes: [
              "id",
              "invoice_number",
              "transaction_date",
              "total_amount",
              "payment_method",
              "payment_status",
              "notes",
            ],

            include:
              transactionInclude,
          }
        );

      if (!transaction) {
        return res.status(404).json({
          message:
            "Transaction not found",
        });
      }

      res.json(transaction);

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// UPDATE TRANSACTION
exports.updateTransaction =
  async (req, res) => {
    try {

      const transaction =
        await Transaction.findByPk(
          req.params.id
        );

      if (!transaction) {
        return res.status(404).json({
          message:
            "Transaction not found",
        });
      }

      const {
        payment_method,
        payment_status,
        notes,
      } = req.body;

      await transaction.update({
        payment_method,
        payment_status,
        notes,
      });

      const updatedTransaction =
        await Transaction.findByPk(
          transaction.id,
          {
            attributes: [
              "id",
              "invoice_number",
              "transaction_date",
              "total_amount",
              "payment_method",
              "payment_status",
              "notes",
            ],

            include:
              transactionInclude,
          }
        );

      res.json(
        updatedTransaction
      );

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// DELETE TRANSACTION
exports.deleteTransaction =
  async (req, res) => {
    try {

      const transaction =
        await Transaction.findByPk(
          req.params.id
        );

      if (!transaction) {
        return res.status(404).json({
          message:
            "Transaction not found",
        });
      }

      await transaction.destroy();

      res.json({
        message:
          "Transaction deleted successfully",
      });

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };
