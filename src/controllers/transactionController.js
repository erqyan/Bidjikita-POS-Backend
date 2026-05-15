const Transaction = require(
  "../models/Transaction"
);

const TransactionDetail =
  require(
    "../models/TransactionDetail"
  );

const Product = require(
  "../models/Product"
);

const ProductVariant =
  require(
    "../models/ProductVariant"
  );

const User = require(
  "../models/User"
);

const Shift = require(
  "../models/Shift"
);

// CREATE TRANSACTION
exports.createTransaction =
  async (req, res) => {
    try {

      const {
        shift_id,
        payment_method,
        payment_status,
        notes,
        items,
      } = req.body;

      // cek shift
      const shift =
        await Shift.findByPk(
          shift_id
        );

      if (!shift) {
        return res.status(404).json({
          message:
            "Shift not found",
        });
      }

      // generate invoice
      const invoice_number =
        "INV-" + Date.now();

      // create transaction sementara
      const transaction =
        await Transaction.create({
          invoice_number,
          transaction_date:
            new Date(),
          total_amount: 0,
          payment_method,
          payment_status,
          notes,
          user_id:
            req.user.id,
          shift_id,
        });

      let total_amount = 0;

      // loop items
      for (const item of items) {

        const product =
          await Product.findByPk(
            item.product_id
          );

        if (!product) {
          return res.status(404).json({
            message:
              "Product not found",
          });
        }

        let variant_price = 0;

        let variant = null;

        // cek variant
        if (item.variant_id) {

          variant =
            await ProductVariant.findByPk(
              item.variant_id
            );

          if (!variant) {
            return res.status(404).json({
              message:
                "Variant not found",
            });
          }

          variant_price =
            Number(
              variant.additional_price
            );
        }

        const product_price =
          Number(
            product.base_price
          );

        // subtotal
        const subtotal =
          (
            product_price +
            variant_price
          ) * item.quantity;

        total_amount += subtotal;

        // simpan detail
        await TransactionDetail.create(
          {
            transaction_id:
              transaction.id,

            product_id:
              product.id,

            variant_id:
              variant
                ? variant.id
                : null,

            quantity:
              item.quantity,

            product_price,

            variant_price,

            subtotal,
          }
        );
      }

      // update total
      await transaction.update({
        total_amount,
      });

      // ambil full data
      const result =
        await Transaction.findByPk(
          transaction.id,
          {
            include: [
              User,
              Shift,
              {
                model:
                  TransactionDetail,
                include: [
                  Product,
                  ProductVariant,
                ],
              },
            ],
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
          include: [
            User,
            Shift,
            {
              model:
                TransactionDetail,
              include: [
                Product,
                ProductVariant,
              ],
            },
          ],
        });

      res.json(transactions);

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
            include: [
              User,
              Shift,
              {
                model:
                  TransactionDetail,
                include: [
                  Product,
                  ProductVariant,
                ],
              },
            ],
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

      res.json(transaction);

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