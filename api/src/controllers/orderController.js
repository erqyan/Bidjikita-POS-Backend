const Order = require(
  "../models/Order"
);

const OrderDetail = require(
  "../models/OrderDetail"
);

const Product = require(
  "../models/Product"
);

const ProductVariant = require(
  "../models/ProductVariant"
);

const User = require(
  "../models/User"
);

const Shift = require(
  "../models/Shift"
);

const {
  reduceStock,
} = require(
  "../services/stockService"
);

// reusable include
const orderInclude = [
  {
    model: User,

    attributes: [
      "id",
      "full_name",
      "username",
    ],
  },

  {
    model: Shift,

    attributes: [
      "id",
      "shift_name",
      "shift_date",
      "status",
    ],
  },

  {
    model: OrderDetail,

    attributes: [
      "id",
      "quantity",
      "price",
      "subtotal",
    ],

    include: [
      {
        model: Product,

        attributes: [
          "id",
          "product_name",
          "base_price",
          "image_url",
        ],
      },

      {
        model:
          ProductVariant,

        attributes: [
          "id",
          "variant_name",
          "additional_price",
        ],
      },
    ],
  },
];

// CREATE ORDER
exports.createOrder = async (
  req,
  res
) => {
  try {

    const {
      shift_id,
      notes,
      items,
    } = req.body;

    // validation
    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Items cannot be empty",
      });
    }

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

    // generate order number
    const order_number =
      "ORD-" + Date.now();

    // create order
    const order =
      await Order.create({
        order_number,
        notes,
        shift_id,
        user_id: req.user.id,
        total_amount: 0,
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

      // calculate item price
      const price =
        Number(
          product.base_price
        ) + variant_price;

      // subtotal
      const subtotal =
        price * item.quantity;

      total_amount += subtotal;

      // create order detail
      await OrderDetail.create({
        order_id:
          order.id,

        product_id:
          item.product_id,

        variant_id:
          item.variant_id || null,

        quantity:
          item.quantity,

        price,

        subtotal,
      });

      // reduce stock
      await reduceStock(
        item.product_id,
        item.variant_id,
        item.quantity
      );
    }

    // update total amount
    await order.update({
      total_amount,
    });

    // get safe result
    const result =
      await Order.findByPk(
        order.id,
        {
          attributes: [
            "id",
            "order_number",
            "total_amount",
            "order_status",
            "notes",
            "createdAt",
          ],

          include:
            orderInclude,
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

// GET ALL ORDERS
exports.getOrders = async (
  req,
  res
) => {
  try {

    const orders =
      await Order.findAll({
        attributes: [
          "id",
          "order_number",
          "total_amount",
          "order_status",
          "notes",
          "createdAt",
        ],

        include:
          orderInclude,

        order: [
          ["createdAt", "DESC"],
        ],
      });

    res.json(orders);

  } catch (error) {

    res.status(500).json({
      message:
        error.message,
    });

  }
};

// GET ORDER BY ID
exports.getOrderById = async (
  req,
  res
) => {
  try {

    const order =
      await Order.findByPk(
        req.params.id,
        {
          attributes: [
            "id",
            "order_number",
            "total_amount",
            "order_status",
            "notes",
            "createdAt",
          ],

          include:
            orderInclude,
        }
      );

    if (!order) {
      return res.status(404).json({
        message:
          "Order not found",
      });
    }

    res.json(order);

  } catch (error) {

    res.status(500).json({
      message:
        error.message,
    });

  }
};

// UPDATE ORDER
exports.updateOrder = async (
  req,
  res
) => {
  try {

    const order =
      await Order.findByPk(
        req.params.id
      );

    if (!order) {
      return res.status(404).json({
        message:
          "Order not found",
      });
    }

    const {
      order_status,
      notes,
    } = req.body;

    await order.update({
      order_status,
      notes,
    });

    const updatedOrder =
      await Order.findByPk(
        order.id,
        {
          attributes: [
            "id",
            "order_number",
            "total_amount",
            "order_status",
            "notes",
            "createdAt",
          ],

          include:
            orderInclude,
        }
      );

    res.json(updatedOrder);

  } catch (error) {

    res.status(500).json({
      message:
        error.message,
    });

  }
};

// DELETE ORDER
exports.deleteOrder = async (
  req,
  res
) => {
  try {

    const order =
      await Order.findByPk(
        req.params.id
      );

    if (!order) {
      return res.status(404).json({
        message:
          "Order not found",
      });
    }

    // delete order details
    await OrderDetail.destroy({
      where: {
        order_id:
          order.id,
      },
    });

    // delete order
    await order.destroy();

    res.json({
      message:
        "Order deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      message:
        error.message,
    });

  }
};