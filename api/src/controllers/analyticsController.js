const { Op, fn, col, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const VariantIngredient = require("../models/VariantIngredient");
const RawMaterial = require("../models/RawMaterial");


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
       FROM transactions
       WHERE payment_status = 'paid'
         AND DATE(transaction_date) = CURDATE()`,
      { type: QueryTypes.SELECT }
    );

    const [todayOrdersRows] = await sequelize.query(
      `SELECT COUNT(id) AS value
       FROM orders
       WHERE DATE(createdAt) = CURDATE()`,
      { type: QueryTypes.SELECT }
    );

    const [totalProductsRows] = await sequelize.query(
      `SELECT COUNT(id) AS value
       FROM products
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
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      { type: QueryTypes.SELECT }
    );

    const [monthlyRevenueRows] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM transactions
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
       FROM transactions
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
       FROM orderdetails od
       INNER JOIN products p ON od.product_id = p.id
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
       FROM transactions
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

exports.getProfitTrend = async (req, res) => {
  try {
    const period = req.query.period || "7d";
    const days = periodToDays(period);

    // Get all order details (including bundle items) with their transaction date
    const rows = await sequelize.query(
      `SELECT DATE(t.transaction_date) AS date,
              t.total_amount AS revenue,
              od.quantity AS od_qty,
              od.bundle_items_json,
              od.id AS od_id
       FROM transactions t
       JOIN orders o ON o.id = t.order_id
       JOIN orderdetails od ON od.order_id = o.id
       WHERE t.payment_status = 'paid'
         AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL :days DAY)
       ORDER BY t.transaction_date ASC`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    // Helper: get the production cost for a list of variant IDs
    async function getVariantsCost(variantIds) {
      if (!variantIds || variantIds.length === 0) return 0;
      const ings = await VariantIngredient.findAll({
        where: { variant_id: variantIds },
        include: [{ model: RawMaterial }],
      });
      let cost = 0;
      for (const ing of ings) {
        cost += Number(ing.quantity) * Number(ing.RawMaterial?.cost_per_unit || 0);
      }
      // Add overhead for each variant (use first variant's overhead as representative)
      const firstVar = await ProductVariant.findByPk(variantIds[0], { attributes: ["overhead_cost"] });
      cost += Number(firstVar?.overhead_cost || 0);
      return cost;
    }

    // Aggregate by date
    const dateMap = {};

    for (const row of rows) {
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { revenue: 0, cost: 0 };

      // Revenue (total_amount is per-transaction, not per-detail — deduplicate)
      // Actually total_amount is the transaction total, so we use it per-order
      // We'll handle revenue separately
    }

    // Revenue: sum of transaction totals per day (deduplicated by transaction)
    const revRows = await sequelize.query(
      `SELECT DATE(transaction_date) AS date,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL :days DAY)
       GROUP BY DATE(transaction_date)`,
      { replacements: { days }, type: QueryTypes.SELECT }
    );

    for (const r of revRows) {
      const dateStr = new Date(r.date).toISOString().split("T")[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { revenue: 0, cost: 0 };
      dateMap[dateStr].revenue = parseFloat(r.revenue) || 0;
    }

    // Cost: calculate per OrderDetail
    for (const row of rows) {
      const dateStr = new Date(row.date).toISOString().split("T")[0];

      if (row.bundle_items_json) {
        // Bundle item — parse JSON and calculate cost for each product inside
        let bundleItems = [];
        try { bundleItems = JSON.parse(row.bundle_items_json); } catch { bundleItems = []; }

        let bundleCost = 0;
        for (const bi of bundleItems) {
          const biVariantIds = Array.isArray(bi.variant_ids) ? bi.variant_ids : [];
          if (biVariantIds.length > 0) {
            bundleCost += (await getVariantsCost(biVariantIds)) * (bi.quantity || 1);
          } else {
            // No variant — find the default variant
            const defaultVariant = await ProductVariant.findOne({
              where: { product_id: bi.product_id },
              order: [["id", "ASC"]],
            });
            if (defaultVariant) {
              bundleCost += (await getVariantsCost([defaultVariant.id])) * (bi.quantity || 1);
            }
          }
        }
        dateMap[dateStr].cost += bundleCost;
      } else {
        // Regular item — calculate cost via OrderDetailVariants
        const odVariants = await sequelize.query(
          `SELECT odv.variant_id
           FROM orderdetailvariants odv
           WHERE odv.order_detail_id = :odId`,
          { replacements: { odId: row.od_id }, type: QueryTypes.SELECT }
        );
        const variantIds = odVariants.map((v) => v.variant_id).filter(Boolean);
        if (variantIds.length > 0) {
          const itemCost = await getVariantsCost(variantIds);
          dateMap[dateStr].cost += itemCost * (row.od_qty || 1);
        }
      }
    }

    // Fill missing days
    const result = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const today = new Date();

    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0];
      const dayData = dateMap[dateStr] || { revenue: 0, cost: 0 };
      result.push({
        date: dateStr,
        revenue: dayData.revenue,
        cost: dayData.cost,
        profit: dayData.revenue - dayData.cost,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =============================================
// FINANCIAL REPORT
// =============================================
exports.getFinancialReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to (YYYY-MM-DD) are required' });
    const fromDate = from + ' 00:00:00';
    const toDate = to + ' 23:59:59';

    // Summary
    const [sum] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount),0) AS revenue, COUNT(id) AS tx_count
       FROM transactions WHERE payment_status='paid' AND transaction_date BETWEEN :from AND :to`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );
    const revenue = parseFloat(sum.revenue) || 0;
    const txCount = parseInt(sum.tx_count) || 0;

    // Cost from regular items
    const [costRows] = await sequelize.query(
      `SELECT COALESCE(SUM(od.quantity * COALESCE((
        SELECT SUM(vi.quantity*rm.cost_per_unit) + COALESCE(MAX(pv_first.overhead_cost),0)
        FROM orderdetailvariants odv
        JOIN productvariants pv_first ON pv_first.id=odv.variant_id
        JOIN variantingredients vi ON vi.variant_id=pv_first.id
        JOIN rawmaterials rm ON rm.id=vi.raw_material_id
        WHERE odv.order_detail_id=od.id
      ),0)),0) AS regular_cost
       FROM transactions t JOIN orders o ON o.id=t.order_id
       JOIN orderdetails od ON od.order_id=o.id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN :from AND :to
         AND od.bundle_items_json IS NULL`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );

    // Bundle cost
    const bundleRows = await sequelize.query(
      `SELECT od.bundle_items_json, od.quantity FROM transactions t
       JOIN orders o ON o.id=t.order_id JOIN orderdetails od ON od.order_id=o.id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN :from AND :to
         AND od.bundle_items_json IS NOT NULL`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );

    let bundleCost = 0;
    for (const br of bundleRows) {
      let items = [];
      try { items = JSON.parse(br.bundle_items_json); } catch { items = []; }
      for (const bi of items) {
        const vIds = Array.isArray(bi.variant_ids) && bi.variant_ids.length > 0 ? bi.variant_ids : null;
        if (vIds) {
          const [ic] = await sequelize.query(
            `SELECT SUM(vi.quantity*rm.cost_per_unit)+COALESCE((SELECT overhead_cost FROM productvariants WHERE id=:vid LIMIT 1),0) AS c
             FROM variantingredients vi JOIN rawmaterials rm ON rm.id=vi.raw_material_id WHERE vi.variant_id IN (:vids)`,
            { replacements: { vid: vIds[0], vids: vIds }, type: QueryTypes.SELECT }
          );
          bundleCost += (parseFloat(ic?.c)||0) * (bi.quantity||1);
        } else {
          const [def] = await sequelize.query(
            `SELECT id FROM productvariants WHERE product_id=:pid ORDER BY id ASC LIMIT 1`,
            { replacements: { pid: bi.product_id }, type: QueryTypes.SELECT }
          );
          if (def) {
            const [dc] = await sequelize.query(
              `SELECT SUM(vi.quantity*rm.cost_per_unit) + COALESCE(MIN(pv.overhead_cost),0) AS c
               FROM variantingredients vi JOIN rawmaterials rm ON rm.id=vi.raw_material_id
               JOIN productvariants pv ON pv.id=vi.variant_id WHERE vi.variant_id=:vid`,
              { replacements: { vid: def.id }, type: QueryTypes.SELECT }
            );
            bundleCost += (parseFloat(dc?.c)||0) * (bi.quantity||1);
          }
        }
      }
    }
    const cost = parseFloat(costRows?.regular_cost||0) + bundleCost;
    const profit = revenue - cost;

    // Daily
    const dailyRows = await sequelize.query(
      `SELECT DATE(transaction_date) AS date, COUNT(id) AS orders, COALESCE(SUM(total_amount),0) AS revenue
       FROM transactions WHERE payment_status='paid' AND transaction_date BETWEEN :from AND :to
       GROUP BY DATE(transaction_date) ORDER BY date ASC`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );

    // Payment methods
    const pmRows = await sequelize.query(
      `SELECT payment_method, COUNT(id) AS count, COALESCE(SUM(total_amount),0) AS total
       FROM transactions WHERE payment_status='paid' AND transaction_date BETWEEN :from AND :to
       GROUP BY payment_method`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );

    // Top products
    const topRows = await sequelize.query(
      `SELECT p.product_name, CAST(SUM(od.quantity) AS UNSIGNED) AS qty, COALESCE(SUM(od.subtotal),0) AS revenue
       FROM orderdetails od JOIN products p ON od.product_id=p.id
       JOIN orders o ON o.id=od.order_id JOIN transactions t ON t.order_id=o.id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN :from AND :to
       GROUP BY p.id, p.product_name ORDER BY qty DESC LIMIT 20`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );

    // All transactions
    const txRows = await sequelize.query(
      `SELECT t.id, t.invoice_number, t.transaction_date, t.total_amount, t.payment_method, u.full_name AS cashier
       FROM transactions t LEFT JOIN users u ON u.id=t.user_id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN :from AND :to
       ORDER BY t.transaction_date DESC`,
      { replacements: { from: fromDate, to: toDate }, type: QueryTypes.SELECT }
    );

    const cashierMap = {};
    for (const tx of txRows) { const n = tx.cashier||'-'; if(!cashierMap[n]) cashierMap[n]={count:0,revenue:0}; cashierMap[n].count++; cashierMap[n].revenue += parseFloat(tx.total_amount)||0; }

    res.json({
      period: { from, to },
      summary: { revenue, cost, profit, profitPct: revenue>0?Math.round((profit/revenue)*100):0, txCount, avgTx: txCount>0?Math.round(revenue/txCount):0 },
      daily: dailyRows.map(d=>({ date: d.date, orders: parseInt(d.orders), revenue: parseFloat(d.revenue) })),
      paymentMethods: pmRows.map(p=>({ method: p.payment_method, count: parseInt(p.count), total: parseFloat(p.total) })),
      topProducts: topRows.map(p=>({ name: p.product_name, qty: parseInt(p.qty), revenue: parseFloat(p.revenue) })),
      cashiers: Object.entries(cashierMap).map(([name,d])=>({ name, txCount: d.count, revenue: d.revenue })),
      transactions: txRows.map(tx=>({ id: tx.id, invoice: tx.invoice_number, date: tx.transaction_date, amount: parseFloat(tx.total_amount), method: tx.payment_method, cashier: tx.cashier||'-' })),
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
