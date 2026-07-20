import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { reduceStock } from '../services/stockService';

// ── Reusable eager-load config ─────────────────────────────────────────────
const orderInclude = {
  user: { select: { id: true, full_name: true, username: true } },
  details: {
    select: {
      id: true,
      quantity: true,
      price: true,
      subtotal: true,
      bundle_id: true,
      bundle_name: true,
      bundle_items_json: true,
      product: { select: { id: true, product_name: true, image_url: true } },
      variantSelections: {
        select: {
          id: true,
          variant: { select: { id: true, variant_name: true, price: true } },
        },
      },
      bundle: { select: { id: true, bundle_name: true, bundle_price: true } },
    },
  },
};

const orderSelect = {
  id: true,
  order_number: true,
  total_amount: true,
  order_status: true,
  notes: true,
  createdAt: true,
};

// ── CREATE ORDER ───────────────────────────────────────────────────────────
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { notes, items, created_at } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items cannot be empty' });
    }

    // Use provided date for seeding, or current time
    const orderDate = created_at ? new Date(created_at) : new Date();
    const startOfDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const todayCount = await prisma.order.count({
      where: { createdAt: { gte: startOfDay } },
    });
    const pad = String(todayCount + 1).padStart(4, '0');
    const dateStr = orderDate.toISOString().split('T')[0].replace(/-/g, '');
    const order_number = dateStr + '-' + pad;

    // Attach to active shift if one exists
    const activeShift = await prisma.shift.findFirst({
      where: { user_id: req.user!.id, status: 'active' },
      select: { id: true },
    });

    const order = await prisma.order.create({
      data: {
        order_number,
        notes,
        user_id: req.user!.id,
        shift_id: activeShift?.id || null,
        total_amount: 0,
        createdAt: created_at ? new Date(created_at) : undefined,
        updatedAt: created_at ? new Date(created_at) : undefined,
      },
    });

    let total_amount = 0;

    for (const item of items) {
      // ── BUNDLE ITEM ──────────────────────────────────────────────────────
      if (item.bundle_id) {
        const bundle = await prisma.bundle.findUnique({ where: { id: item.bundle_id } });
        if (!bundle) {
          return res.status(404).json({ message: `Bundle ${item.bundle_id} not found` });
        }

        const bundleItems = Array.isArray(item.bundle_items) ? item.bundle_items : [];
        const bundlePrice = Number(item.bundle_price ?? bundle.bundle_price ?? 0);
        const subtotal = bundlePrice * (item.quantity || 1);
        total_amount += subtotal;

        // Persist ONE order detail for the bundle
        await prisma.orderDetail.create({
          data: {
            order_id: order.id,
            product_id: null,
            quantity: item.quantity || 1,
            price: bundlePrice,
            subtotal,
            bundle_id: bundle.id,
            bundle_name: item.bundle_name || bundle.bundle_name,
            bundle_items_json: JSON.stringify(bundleItems),
          },
        });

        // Deduct stock for each product inside the bundle
        for (const bi of bundleItems) {
          const biVariantIds: number[] = Array.isArray(bi.variant_ids) ? bi.variant_ids : [];
          if (biVariantIds.length > 0) {
            await reduceStock(bi.product_id, biVariantIds, bi.quantity);
          } else {
            await reduceStock(bi.product_id, [], bi.quantity);
          }
        }

        continue;
      }

      // ── REGULAR ITEM (no bundle) ─────────────────────────────────────────
      const product = await prisma.product.findUnique({ where: { id: item.product_id } });
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product_id} not found` });
      }

      // Validate & load selected variants
      let variantIds: number[] = Array.isArray(item.variant_ids) ? item.variant_ids : [];
      let selectedVariants: { id: number; price: number | { toNumber: () => number } }[] = [];

      if (variantIds.length > 0) {
        selectedVariants = await prisma.productVariant.findMany({
          where: {
            id: { in: variantIds },
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
        const fallback = await prisma.productVariant.findFirst({
          where: { product_id: item.product_id },
          orderBy: { id: 'asc' },
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

      const price = selectedVariants.reduce((sum, v) => {
        const p = typeof v.price === 'object' && 'toNumber' in v.price
          ? (v.price as unknown as { toNumber: () => number }).toNumber()
          : Number(v.price);
        return sum + (p || 0);
      }, 0);

      const subtotal = price * item.quantity;
      total_amount += subtotal;

      // Persist order detail
      const orderDetail = await prisma.orderDetail.create({
        data: {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price,
          subtotal,
        },
      });

      // Persist variant selections
      for (const variantId of variantIds) {
        await prisma.orderDetailVariant.create({
          data: {
            order_detail_id: orderDetail.id,
            variant_id: variantId,
          },
        });
      }

      // Deduct raw material stock
      await reduceStock(item.product_id, variantIds, item.quantity);
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { total_amount },
    });

    const result = await prisma.order.findUnique({
      where: { id: order.id },
      select: { ...orderSelect, ...orderInclude },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET ALL ORDERS ─────────────────────────────────────────────────────────
export const getOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      select: { ...orderSelect, ...orderInclude },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET ORDER BY ID ────────────────────────────────────────────────────────
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const order = await prisma.order.findUnique({
      where: { id },
      select: { ...orderSelect, ...orderInclude },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── UPDATE ORDER ───────────────────────────────────────────────────────────
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { order_status, notes } = req.body;
    await prisma.order.update({
      where: { id },
      data: { order_status, notes },
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      select: { ...orderSelect, ...orderInclude },
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── DELETE ORDER ───────────────────────────────────────────────────────────
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // OrderDetailVariant rows cascade-delete when OrderDetail is destroyed
    await prisma.orderDetail.deleteMany({ where: { order_id: order.id } });
    await prisma.order.delete({ where: { id } });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
