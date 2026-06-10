const { Op, fn, col, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const Product = require("../models/Product");
const RawMaterial = require("../models/RawMaterial");
const Shift = require("../models/Shift");

// Helper: convert period string to integer days
const periodToDays = (period) => {
  switch (period) {
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 7;
  }
};

exports.getSummary = async (req, res) => {
  try {
    const [todayRevenueRows] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM Transactions
       WHERE payment_status = 'paid'
         AND DATE(transaction_date) = CURDATE()`,
      { type: QueryTypes.SELECT }
    );

    const [todayOrdersRows] = await sequelize.query(
      `SELECT COUNT(id) AS value
       FROM Orders
       WHERE DATE(createdAt) = CURDATE()`,
      { type: QueryTypes.SELECT }
    );

    const [totalProductsRows] = await sequelize.query(
      `SELECT COUNT(id) AS value
       FROM Products
       WHERE is_active = true`,
      { type: QueryTypes.SELECT }
    );

    const [lowStockRows] = await sequelize.query(
      `SELECT COUNT(id) AS value
       FROM rawmaterials
       WHERE stock <= minimum_stock`,
      { type: QueryTypes.SELECT }
    );

    const [weeklyRevenueRows] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM Transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      { type: QueryTypes.SELECT }
    );

    const [monthlyRevenueRows] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM Transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      today_revenue: parseFloat(todayRevenueRows.value) || 0,
      today_orders: parseInt(todayOrdersRows.value) || 0,
      total_products: parseInt(totalProductsRows.value) || 0,
      low_stock_count: parseInt(lowStockRows.value) || 0,
      weekly_revenue: parseFloat(weeklyRevenueRows.value) || 0,
      monthly_revenue: parseFloat(monthlyRevenueRows.value) || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRevenueTrend = async (req, res) => {
  try {
    const period = req.query.period || "7d";
    const days = periodToDays(period);

    const rows = await sequelize.query(
      `SELECT DATE(transaction_date) AS date,
              COALESCE(SUM(total_amount), 0) AS revenue,
              COUNT(id) AS orders
       FROM Transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL :days DAY)
       GROUP BY DATE(transaction_date)
       ORDER BY date ASC`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    // Build a map of date string → data for O(1) lookup
    const dateMap = {};
    rows.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      dateMap[dateStr] = {
        revenue: parseFloat(row.revenue) || 0,
        orders: parseInt(row.orders) || 0,
      };
    });

    // Fill every date in the range, including days with no transactions
    const result = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const today = new Date();

    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        revenue: dateMap[dateStr]?.revenue || 0,
        orders: dateMap[dateStr]?.orders || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const rows = await sequelize.query(
      `SELECT p.product_name,
              CAST(SUM(od.quantity) AS UNSIGNED) AS total_quantity,
              COALESCE(SUM(od.subtotal), 0) AS total_revenue
       FROM OrderDetails od
       INNER JOIN Products p ON od.product_id = p.id
       GROUP BY p.id, p.product_name
       ORDER BY total_quantity DESC
       LIMIT :limit`,
      { replacements: { limit }, type: QueryTypes.SELECT }
    );

    res.json(
      rows.map((r) => ({
        product_name: r.product_name,
        total_quantity: parseInt(r.total_quantity) || 0,
        total_revenue: parseFloat(r.total_revenue) || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPaymentMethodStats = async (req, res) => {
  try {
    const period = req.query.period || "30d";
    const days = periodToDays(period);

    const rows = await sequelize.query(
      `SELECT payment_method,
              COUNT(id) AS count,
              COALESCE(SUM(total_amount), 0) AS total
       FROM Transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL :days DAY)
       GROUP BY payment_method`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    res.json(
      rows.map((r) => ({
        payment_method: r.payment_method,
        count: parseInt(r.count) || 0,
        total: parseFloat(r.total) || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLowStockMaterials = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM rawmaterials WHERE stock <= minimum_stock ORDER BY stock ASC`,
      { type: QueryTypes.SELECT }
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShiftPerformance = async (req, res) => {
  try {
    const period = req.query.period || "30d";
    const days = periodToDays(period);

    const rows = await sequelize.query(
      `SELECT s.shift_name,
              COALESCE(SUM(t.total_amount), 0) AS total_revenue,
              COUNT(t.id) AS total_orders
       FROM Transactions t
       INNER JOIN Shifts s ON t.shift_id = s.id
       WHERE t.payment_status = 'paid'
         AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL :days DAY)
       GROUP BY s.id, s.shift_name
       ORDER BY total_revenue DESC`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    res.json(
      rows.map((r) => ({
        shift_name: r.shift_name,
        total_revenue: parseFloat(r.total_revenue) || 0,
        total_orders: parseInt(r.total_orders) || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
