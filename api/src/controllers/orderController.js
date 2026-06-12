const { Op } = require("sequelize");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const OrderDetailVariant = require("../models/OrderDetailVariant");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Bundle = require("../models/Bundle");
const BundleItem = require("../models/BundleItem");
const User = require("../models/User");

const { reduceStock } = require("../services/stockService");

// ── Reusable eager-load config ─────────────────────────────────────────────
const orderInclude = [
  {
    model: User,
    attributes: ["id", "full_name", "username"],
  },

  {
    model: OrderDetail,
    attributes: ["id", "quantity", "price", "subtotal", "bundle_id", "bundle_name", "bundle_items_json"],
    include: [
      {
        model: Product,
        attributes: ["id", "product_name", "image_url"],
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
];

// ── CREATE ORDER ───────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items cannot be empty" });
    }

    const order = await Order.create({
      order_number: "ORD-" + Date.now(),
      notes,
      user_id: req.user.id,
      total_amount: 0,
    });

    let total_amount = 0;

    for (const item of items) {
      // ── BUNDLE ITEM ──────────────────────────────────────────────────────
      if (item.bundle_id) {
        // Validate bundle exists
        const bundle = await Bundle.findByPk(item.bundle_id);
        if (!bundle) {
          return res.status(404).json({ message: `Bundle ${item.bundle_id} not found` });
        }

        const bundleItems = Array.isArray(item.bundle_items) ? item.bundle_items : [];
        const bundlePrice = Number(item.bundle_price ?? bundle.bundle_price ?? 0);
        const subtotal = bundlePrice * (item.quantity || 1);
        total_amount += subtotal;

        // Persist ONE order detail for the bundle
        const orderDetail = await OrderDetail.create({
          order_id: order.id,
          product_id: null,
          quantity: item.quantity || 1,
          price: bundlePrice,
          subtotal,
          bundle_id: bundle.id,
          bundle_name: item.bundle_name || bundle.bundle_name,
          bundle_items_json: JSON.stringify(bundleItems),
        });

        // Deduct stock for each product inside the bundle
        for (const bi of bundleItems) {
          const biVariantIds = Array.isArray(bi.variant_ids) ? bi.variant_ids : [];
          if (biVariantIds.length > 0) {
            await reduceStock(bi.product_id, biVariantIds, bi.quantity);
          } else {
            await reduceStock(bi.product_id, [], bi.quantity);
          }
        }

        continue;
      }

      // ── REGULAR ITEM (no bundle) ─────────────────────────────────────────
      // Validate product
      const product = await Product.findByPk(item.product_id);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product_id} not found` });
      }

      // Validate & load selected variants
      let variantIds = Array.isArray(item.variant_ids) ? item.variant_ids : [];
      let selectedVariants = [];

      if (variantIds.length > 0) {
        selectedVariants = await ProductVariant.findAll({
          where: {
            id: { [Op.in]: variantIds },
            product_id: item.product_id,
          },
        });

        if (selectedVariants.length !== variantIds.length) {
          return res.status(404).json({
            message: `One or more variants not found for product ${item.product_id}`,
          });
        }
      }

      // Calculate price from variants
      if (selectedVariants.length === 0 && variantIds.length === 0) {
        const fallback = await ProductVariant.findOne({
          where: { product_id: item.product_id },
          order: [["id", "ASC"]],
        });
        if (fallback) {
          selectedVariants = [fallback];
          variantIds = [fallback.id];
        } else {
          return res.status(400).json({
            message: `Produk "${product.product_name}" tidak memiliki varian. Tambahkan varian terlebih dahulu.`,
          });
        }
      }
      const price = selectedVariants.reduce(
        (sum, v) => sum + Number(v.price || 0),
        0
      );
      const subtotal = price * item.quantity;
      total_amount += subtotal;

      // Persist order detail
      const orderDetail = await OrderDetail.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price,
        subtotal,
      });

      // Persist variant selections
      for (const variantId of variantIds) {
        await OrderDetailVariant.create({
          order_detail_id: orderDetail.id,
          variant_id: variantId,
        });
      }

      // Deduct raw material stock
      await reduceStock(item.product_id, variantIds, item.quantity);
    }

    await order.update({ total_amount });

    const result = await Order.findByPk(order.id, {
      attributes: ["id", "order_number", "total_amount", "order_status", "notes", "createdAt"],
      include: orderInclude,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET ALL ORDERS ─────────────────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      attributes: ["id", "order_number", "total_amount", "order_status", "notes", "createdAt"],
      include: orderInclude,
      order: [["createdAt", "DESC"]],
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET ORDER BY ID ────────────────────────────────────────────────────────
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      attributes: ["id", "order_number", "total_amount", "order_status", "notes", "createdAt"],
      include: orderInclude,
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE ORDER ───────────────────────────────────────────────────────────
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { order_status, notes } = req.body;
    await order.update({ order_status, notes });

    const updatedOrder = await Order.findByPk(order.id, {
      attributes: ["id", "order_number", "total_amount", "order_status", "notes", "createdAt"],
      include: orderInclude,
    });
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE ORDER ───────────────────────────────────────────────────────────
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // OrderDetailVariant rows cascade-delete when OrderDetail is destroyed
    await OrderDetail.destroy({ where: { order_id: order.id } });
    await order.destroy();

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
