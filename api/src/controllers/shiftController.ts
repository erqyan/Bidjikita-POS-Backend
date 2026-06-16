import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Get active shift for current user
export const getActiveShift = async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { user_id: req.user!.id, status: 'active' },
      include: {
        orders: {
          include: {
            transaction: { select: { payment_method: true, total_amount: true } },
          },
        },
      },
    });

    if (!shift) return res.json(null);

    // Calculate expected totals
    let expectedCash = 0;
    let expectedQris = 0;
    let orderCount = 0;
    for (const o of shift.orders) {
      if (o.transaction) {
        orderCount++;
        if (o.transaction.payment_method === 'cash') expectedCash += Number(o.transaction.total_amount);
        else expectedQris += Number(o.transaction.total_amount);
      }
    }

    res.json({
      id: shift.id,
      start_time: shift.start_time,
      starting_cash: Number(shift.starting_cash),
      order_count: orderCount,
      expected_cash: Number(shift.starting_cash) + expectedCash,
      expected_qris: expectedQris,
      status: shift.status,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get active shift' });
  }
};

// Clock in � start a new shift
export const clockIn = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.shift.findFirst({
      where: { user_id: req.user!.id, status: 'active' },
    });
    if (existing) return res.status(400).json({ message: 'Anda sudah memiliki shift aktif' });

    const { starting_cash } = req.body;
    const shift = await prisma.shift.create({
      data: {
        user_id: req.user!.id,
        starting_cash: Number(starting_cash) || 0,
        status: 'active',
      },
    });

    res.status(201).json({
      id: shift.id,
      start_time: shift.start_time,
      starting_cash: Number(shift.starting_cash),
      order_count: 0,
      expected_cash: Number(shift.starting_cash),
      expected_qris: 0,
      status: shift.status,
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memulai shift' });
  }
};

// Clock out � end the current shift
export const clockOut = async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { user_id: req.user!.id, status: 'active' },
      include: {
        orders: {
          include: {
            transaction: { select: { payment_method: true, total_amount: true } },
          },
        },
      },
    });

    if (!shift) return res.status(400).json({ message: 'Tidak ada shift aktif' });

    const { actual_cash, actual_qris } = req.body;

    // Calculate expected totals
    let expectedCash = 0;
    let expectedQris = 0;
    for (const o of shift.orders) {
      if (o.transaction) {
        if (o.transaction.payment_method === 'cash') expectedCash += Number(o.transaction.total_amount);
        else expectedQris += Number(o.transaction.total_amount);
      }
    }

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        end_time: new Date(),
        expected_cash: Number(shift.starting_cash) + expectedCash,
        expected_qris: expectedQris,
        actual_cash: actual_cash !== undefined ? Number(actual_cash) : undefined,
        actual_qris: actual_qris !== undefined ? Number(actual_qris) : undefined,
        status: 'closed',
      },
    });

    res.json({
      ...updated,
      expected_cash: Number(updated.expected_cash || 0),
      expected_qris: Number(updated.expected_qris || 0),
      actual_cash: updated.actual_cash ? Number(updated.actual_cash) : null,
      actual_qris: updated.actual_qris ? Number(updated.actual_qris) : null,
      starting_cash: Number(updated.starting_cash),
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengakhiri shift' });
  }
};


// Get all shifts (admin panel)
export const getAllShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        user: { select: { id: true, full_name: true, username: true } },
      },
      orderBy: { start_time: 'desc' },
    });

    const result = shifts.map((s) => ({
      id: s.id,
      user_id: s.user_id,
      user_name: s.user?.full_name || s.user?.username || '-',
      start_time: s.start_time,
      end_time: s.end_time,
      starting_cash: Number(s.starting_cash),
      expected_cash: s.expected_cash ? Number(s.expected_cash) : null,
      expected_qris: s.expected_qris ? Number(s.expected_qris) : null,
      actual_cash: s.actual_cash ? Number(s.actual_cash) : null,
      actual_qris: s.actual_qris ? Number(s.actual_qris) : null,
      status: s.status,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shifts' });
  }
};

// Get shift detail with orders (admin panel)
export const getShiftById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, full_name: true, username: true } },
        orders: {
          include: {
            transaction: { select: { id: true, invoice_number: true, payment_method: true, total_amount: true } },
            details: {
              select: { id: true, product_id: true, quantity: true, price: true, subtotal: true, bundle_name: true },
            },
          },
        },
      },
    });

    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    res.json({
      id: shift.id,
      user_name: shift.user?.full_name || shift.user?.username || '-',
      start_time: shift.start_time,
      end_time: shift.end_time,
      starting_cash: Number(shift.starting_cash),
      expected_cash: shift.expected_cash ? Number(shift.expected_cash) : null,
      expected_qris: shift.expected_qris ? Number(shift.expected_qris) : null,
      actual_cash: shift.actual_cash ? Number(shift.actual_cash) : null,
      actual_qris: shift.actual_qris ? Number(shift.actual_qris) : null,
      status: shift.status,
      orders: shift.orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        invoice: o.transaction?.invoice_number || '-',
        payment_method: o.transaction?.payment_method || '-',
        total_amount: Number(o.transaction?.total_amount || 0),
        items: o.details.map((d) => ({
          product_id: d.product_id,
          quantity: d.quantity,
          price: Number(d.price),
          subtotal: Number(d.subtotal),
          bundle_name: d.bundle_name,
        })),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shift detail' });
  }
};
