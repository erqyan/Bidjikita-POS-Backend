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
