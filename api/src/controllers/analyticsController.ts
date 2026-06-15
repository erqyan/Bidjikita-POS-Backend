import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Helper: convert period string to integer days
const periodToDays = (period: string): number => {
  switch (period) {
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
};

export const getSummary = async (_req: Request, res: Response) => {
  try {
    const [todayRevenue] = await prisma.$queryRawUnsafe<{ value: number }[]>(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM transactions
       WHERE payment_status = 'paid'
         AND DATE(transaction_date) = CURDATE()`,
    );

    const [todayOrders] = await prisma.$queryRawUnsafe<{ value: bigint }[]>(
      `SELECT COUNT(id) AS value
       FROM orders
       WHERE DATE(createdAt) = CURDATE()`,
    );

    const [totalProducts] = await prisma.$queryRawUnsafe<{ value: bigint }[]>(
      `SELECT COUNT(id) AS value
       FROM products
       WHERE is_active = true`,
    );

    const [lowStock] = await prisma.$queryRawUnsafe<{ value: bigint }[]>(
      `SELECT COUNT(id) AS value
       FROM rawmaterials
       WHERE stock <= minimum_stock`,
    );

    const [weeklyRevenue] = await prisma.$queryRawUnsafe<{ value: number }[]>(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    );

    const [monthlyRevenue] = await prisma.$queryRawUnsafe<{ value: number }[]>(
      `SELECT COALESCE(SUM(total_amount), 0) AS value
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    );

    res.json({
      today_revenue: parseFloat(String(todayRevenue?.value ?? 0)) || 0,
      today_orders: parseInt(String(todayOrders?.value ?? 0)) || 0,
      total_products: parseInt(String(totalProducts?.value ?? 0)) || 0,
      low_stock_count: parseInt(String(lowStock?.value ?? 0)) || 0,
      weekly_revenue: parseFloat(String(weeklyRevenue?.value ?? 0)) || 0,
      monthly_revenue: parseFloat(String(monthlyRevenue?.value ?? 0)) || 0,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getRevenueTrend = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const days = periodToDays(period);

    const rows = await prisma.$queryRawUnsafe<{ date: string; revenue: number; orders: bigint }[]>(
      `SELECT DATE(transaction_date) AS date,
              COALESCE(SUM(total_amount), 0) AS revenue,
              COUNT(id) AS orders
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       GROUP BY DATE(transaction_date)
       ORDER BY date ASC`,
    );

    // Build a map of date string → data for O(1) lookup
    const dateMap: Record<string, { revenue: number; orders: number }> = {};
    rows.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      dateMap[dateStr] = {
        revenue: parseFloat(String(row.revenue)) || 0,
        orders: parseInt(String(row.orders)) || 0,
      };
    });

    // Fill every date in the range, including days with no transactions
    const result: { date: string; revenue: number; orders: number }[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const today = new Date();

    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        revenue: dateMap[dateStr]?.revenue || 0,
        orders: dateMap[dateStr]?.orders || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const rows = await prisma.$queryRawUnsafe<{ product_name: string; total_quantity: bigint; total_revenue: number }[]>(
      `SELECT p.product_name,
              CAST(SUM(od.quantity) AS UNSIGNED) AS total_quantity,
              COALESCE(SUM(od.subtotal), 0) AS total_revenue
       FROM order_details od
       INNER JOIN products p ON od.product_id = p.id
       GROUP BY p.id, p.product_name
       ORDER BY total_quantity DESC
       LIMIT ${limit}`,
    );

    res.json(
      rows.map((r) => ({
        product_name: r.product_name,
        total_quantity: parseInt(String(r.total_quantity)) || 0,
        total_revenue: parseFloat(String(r.total_revenue)) || 0,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getPaymentMethodStats = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    const days = periodToDays(period);

    const rows = await prisma.$queryRawUnsafe<{ payment_method: string; count: bigint; total: number }[]>(
      `SELECT payment_method,
              COUNT(id) AS count,
              COALESCE(SUM(total_amount), 0) AS total
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       GROUP BY payment_method`,
    );

    res.json(
      rows.map((r) => ({
        payment_method: r.payment_method,
        count: parseInt(String(r.count)) || 0,
        total: parseFloat(String(r.total)) || 0,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getLowStockMaterials = async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM rawmaterials WHERE stock <= minimum_stock ORDER BY stock ASC`,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getProfitTrend = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const days = periodToDays(period);

    // Get all order details (including bundle items) with their transaction date
    const rows = await prisma.$queryRawUnsafe<
      { date: string; revenue: number; od_qty: number; bundle_items_json: string | null; od_id: number }[]
    >(
      `SELECT DATE(t.transaction_date) AS date,
              t.total_amount AS revenue,
              od.quantity AS od_qty,
              od.bundle_items_json,
              od.id AS od_id
       FROM transactions t
       JOIN orders o ON o.id = t.order_id
       JOIN order_details od ON od.order_id = o.id
       WHERE t.payment_status = 'paid'
         AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       ORDER BY t.transaction_date ASC`,
    );

    // Helper: get the production cost for a list of variant IDs
    async function getVariantsCost(variantIds: number[]): Promise<number> {
      if (!variantIds || variantIds.length === 0) return 0;
      const ings = await prisma.variantIngredient.findMany({
        where: { variant_id: { in: variantIds } },
        include: { rawMaterial: true },
      });
      let cost = 0;
      for (const ing of ings) {
        cost += Number(ing.quantity) * Number(ing.rawMaterial.cost_per_unit || 0);
      }
      // Add overhead for each variant (use first variant's overhead as representative)
      const firstVar = await prisma.productVariant.findUnique({
        where: { id: variantIds[0] },
        select: { overhead_cost: true },
      });
      cost += Number(firstVar?.overhead_cost || 0);
      return cost;
    }

    // Aggregate by date
    const dateMap: Record<string, { revenue: number; cost: number }> = {};

    for (const row of rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { revenue: 0, cost: 0 };
    }

    // Revenue: sum of transaction totals per day (deduplicated by transaction)
    const revRows = await prisma.$queryRawUnsafe<{ date: string; revenue: number }[]>(
      `SELECT DATE(transaction_date) AS date,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM transactions
       WHERE payment_status = 'paid'
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       GROUP BY DATE(transaction_date)`,
    );

    for (const r of revRows) {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { revenue: 0, cost: 0 };
      dateMap[dateStr].revenue = parseFloat(String(r.revenue)) || 0;
    }

    // Cost: calculate per OrderDetail
    for (const row of rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];

      if (row.bundle_items_json) {
        // Bundle item — parse JSON and calculate cost for each product inside
        let bundleItems: any[] = [];
        try { bundleItems = JSON.parse(row.bundle_items_json); } catch { bundleItems = []; }

        let bundleCost = 0;
        for (const bi of bundleItems) {
          const biVariantIds: number[] = Array.isArray(bi.variant_ids) ? bi.variant_ids : [];
          if (biVariantIds.length > 0) {
            bundleCost += (await getVariantsCost(biVariantIds)) * (bi.quantity || 1);
          } else {
            // No variant — find the default variant
            const defaultVariant = await prisma.productVariant.findFirst({
              where: { product_id: bi.product_id },
              orderBy: { id: 'asc' },
            });
            if (defaultVariant) {
              bundleCost += (await getVariantsCost([defaultVariant.id])) * (bi.quantity || 1);
            }
          }
        }
        dateMap[dateStr].cost += bundleCost;
      } else {
        // Regular item — calculate cost via OrderDetailVariants
        const odVariants = await prisma.$queryRawUnsafe<{ variant_id: number }[]>(
          `SELECT odv.variant_id
           FROM orderdetailvariants odv
           WHERE odv.order_detail_id = ${row.od_id}`,
        );
        const variantIds = odVariants.map((v) => v.variant_id).filter(Boolean);
        if (variantIds.length > 0) {
          const itemCost = await getVariantsCost(variantIds);
          dateMap[dateStr].cost += itemCost * (row.od_qty || 1);
        }
      }
    }

    // Fill missing days
    const result: { date: string; revenue: number; cost: number; profit: number }[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const today = new Date();

    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
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
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── FINANCIAL REPORT ───────────────────────────────────────────────────────
export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) return res.status(400).json({ message: 'from and to (YYYY-MM-DD) are required' });
    const fromDate = from + ' 00:00:00';
    const toDate = to + ' 23:59:59';

    // Summary
    const sumRows = await prisma.$queryRawUnsafe<{ revenue: number; tx_count: bigint }[]>(
      `SELECT COALESCE(SUM(total_amount),0) AS revenue, COUNT(id) AS tx_count
       FROM transactions WHERE payment_status='paid' AND transaction_date BETWEEN '${fromDate}' AND '${toDate}'`,
    );
    const revenue = parseFloat(String(sumRows[0]?.revenue ?? 0)) || 0;
    const txCount = parseInt(String(sumRows[0]?.tx_count ?? 0)) || 0;

    // Cost from regular items
    const costRows = await prisma.$queryRawUnsafe<{ regular_cost: number }[]>(
      `SELECT COALESCE(SUM(od.quantity * COALESCE((
        SELECT SUM(vi.quantity*rm.cost_per_unit) + COALESCE(MAX(pv_first.overhead_cost),0)
        FROM orderdetailvariants odv
        JOIN product_variants pv_first ON pv_first.id=odv.variant_id
        JOIN variantingredients vi ON vi.variant_id=pv_first.id
        JOIN rawmaterials rm ON rm.id=vi.raw_material_id
        WHERE odv.order_detail_id=od.id
      ),0)),0) AS regular_cost
       FROM transactions t JOIN orders o ON o.id=t.order_id
       JOIN order_details od ON od.order_id=o.id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN '${fromDate}' AND '${toDate}'
         AND od.bundle_items_json IS NULL`,
    );

    // Bundle cost
    const bundleRows = await prisma.$queryRawUnsafe<{ bundle_items_json: string; quantity: number }[]>(
      `SELECT od.bundle_items_json, od.quantity FROM transactions t
       JOIN orders o ON o.id=t.order_id JOIN order_details od ON od.order_id=o.id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN '${fromDate}' AND '${toDate}'
         AND od.bundle_items_json IS NOT NULL`,
    );

    let bundleCost = 0;
    for (const br of bundleRows) {
      let items: any[] = [];
      try { items = JSON.parse(br.bundle_items_json); } catch { items = []; }
      for (const bi of items) {
        const vIds: number[] | null = Array.isArray(bi.variant_ids) && bi.variant_ids.length > 0 ? bi.variant_ids : null;
        if (vIds) {
          const icRows = await prisma.$queryRawUnsafe<{ c: number }[]>(
            `SELECT SUM(vi.quantity*rm.cost_per_unit)+COALESCE((SELECT overhead_cost FROM product_variants WHERE id=${vIds[0]} LIMIT 1),0) AS c
             FROM variantingredients vi JOIN rawmaterials rm ON rm.id=vi.raw_material_id WHERE vi.variant_id IN (${vIds.join(',')})`,
          );
          bundleCost += (parseFloat(String(icRows[0]?.c ?? 0)) || 0) * (bi.quantity || 1);
        } else {
          const defRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
            `SELECT id FROM product_variants WHERE product_id=${bi.product_id} ORDER BY id ASC LIMIT 1`,
          );
          if (defRows[0]) {
            const dcRows = await prisma.$queryRawUnsafe<{ c: number }[]>(
              `SELECT SUM(vi.quantity*rm.cost_per_unit) + COALESCE(MIN(pv.overhead_cost),0) AS c
               FROM variantingredients vi JOIN rawmaterials rm ON rm.id=vi.raw_material_id
               JOIN product_variants pv ON pv.id=vi.variant_id WHERE vi.variant_id=${defRows[0].id}`,
            );
            bundleCost += (parseFloat(String(dcRows[0]?.c ?? 0)) || 0) * (bi.quantity || 1);
          }
        }
      }
    }

    const cost = parseFloat(String(costRows[0]?.regular_cost ?? 0)) + bundleCost;
    const profit = revenue - cost;

    // Daily
    const dailyRows = await prisma.$queryRawUnsafe<{ date: string; orders: bigint; revenue: number }[]>(
      `SELECT DATE(transaction_date) AS date, COUNT(id) AS orders, COALESCE(SUM(total_amount),0) AS revenue
       FROM transactions WHERE payment_status='paid' AND transaction_date BETWEEN '${fromDate}' AND '${toDate}'
       GROUP BY DATE(transaction_date) ORDER BY date ASC`,
    );

    // Payment methods
    const pmRows = await prisma.$queryRawUnsafe<{ payment_method: string; count: bigint; total: number }[]>(
      `SELECT payment_method, COUNT(id) AS count, COALESCE(SUM(total_amount),0) AS total
       FROM transactions WHERE payment_status='paid' AND transaction_date BETWEEN '${fromDate}' AND '${toDate}'
       GROUP BY payment_method`,
    );

    // Top products
    const topRows = await prisma.$queryRawUnsafe<{ product_name: string; qty: bigint; revenue: number }[]>(
      `SELECT p.product_name, CAST(SUM(od.quantity) AS UNSIGNED) AS qty, COALESCE(SUM(od.subtotal),0) AS revenue
       FROM order_details od JOIN products p ON od.product_id=p.id
       JOIN orders o ON o.id=od.order_id JOIN transactions t ON t.order_id=o.id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN '${fromDate}' AND '${toDate}'
       GROUP BY p.id, p.product_name ORDER BY qty DESC LIMIT 20`,
    );

    // All transactions
    const txRows = await prisma.$queryRawUnsafe<
      { id: number; invoice_number: string; transaction_date: string; total_amount: number; payment_method: string; cashier: string | null }[]
    >(
      `SELECT t.id, t.invoice_number, t.transaction_date, t.total_amount, t.payment_method, u.full_name AS cashier
       FROM transactions t LEFT JOIN users u ON u.id=t.user_id
       WHERE t.payment_status='paid' AND t.transaction_date BETWEEN '${fromDate}' AND '${toDate}'
       ORDER BY t.transaction_date DESC`,
    );

    const cashierMap: Record<string, { count: number; revenue: number }> = {};
    for (const tx of txRows) {
      const n = tx.cashier || '-';
      if (!cashierMap[n]) cashierMap[n] = { count: 0, revenue: 0 };
      cashierMap[n].count++;
      cashierMap[n].revenue += parseFloat(String(tx.total_amount)) || 0;
    }

    res.json({
      period: { from, to },
      summary: {
        revenue,
        cost,
        profit,
        profitPct: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
        txCount,
        avgTx: txCount > 0 ? Math.round(revenue / txCount) : 0,
      },
      daily: dailyRows.map((d) => ({
        date: d.date,
        orders: parseInt(String(d.orders)),
        revenue: parseFloat(String(d.revenue)),
      })),
      paymentMethods: pmRows.map((p) => ({
        method: p.payment_method,
        count: parseInt(String(p.count)),
        total: parseFloat(String(p.total)),
      })),
      topProducts: topRows.map((p) => ({
        name: p.product_name,
        qty: parseInt(String(p.qty)),
        revenue: parseFloat(String(p.revenue)),
      })),
      cashiers: Object.entries(cashierMap).map(([name, d]) => ({
        name,
        txCount: d.count,
        revenue: d.revenue,
      })),
      transactions: txRows.map((tx) => ({
        id: tx.id,
        invoice: tx.invoice_number,
        date: tx.transaction_date,
        amount: parseFloat(String(tx.total_amount)),
        method: tx.payment_method,
        cashier: tx.cashier || '-',
      })),
    });
  } catch (error) {
    console.error('[FinancialReport]', error);
    res.status(500).json({ message: (error as Error).message });
  }
};
