import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Reusable include for transaction queries
const transactionInclude = {
  user: { select: { id: true, full_name: true, username: true } },
  order: {
    select: {
      id: true,
      order_number: true,
      total_amount: true,
      order_status: true,
      notes: true,
      createdAt: true,
      details: {
        select: {
          id: true,
          quantity: true,
          price: true,
          subtotal: true,
          bundle_id: true,
          bundle_name: true,
          bundle_items_json: true,
          product: { select: { id: true, product_name: true } },
          variantSelections: {
            select: {
              id: true,
              variant: { select: { id: true, variant_name: true, price: true } },
            },
          },
          bundle: { select: { id: true, bundle_name: true, bundle_price: true } },
        },
      },
    },
  },
};

// Select only safe transaction fields for listing
const transactionSelect = {
  id: true,
  invoice_number: true,
  transaction_date: true,
  total_amount: true,
  payment_method: true,
  payment_status: true,
  notes: true,
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { order_id, payment_method, payment_status, notes, transaction_date } = req.body;

    // Check order exists
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { details: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check duplicate transaction
    const existingTransaction = await prisma.transaction.findUnique({ where: { order_id } });
    if (existingTransaction) {
      return res.status(400).json({ message: 'Transaction already exists' });
    }

    // Use order number as invoice number for consistency
    const invoice_number = order.order_number;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        invoice_number,
        transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
        total_amount: order.total_amount,
        payment_method,
        payment_status,
        notes,
        user_id: req.user!.id,
        order_id,
        createdAt: transaction_date ? new Date(transaction_date) : undefined,
        updatedAt: transaction_date ? new Date(transaction_date) : undefined,
      },
    });

    // Update order status to completed
    await prisma.order.update({
      where: { id: order_id },
      data: { order_status: 'completed' },
    });

    // Get result with includes
    const result = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      select: {
        ...transactionSelect,
        ...transactionInclude,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTransactions = async (_req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      select: {
        ...transactionSelect,
        ...transactionInclude,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: {
        ...transactionSelect,
        ...transactionInclude,
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const { payment_method, payment_status, notes } = req.body;

    await prisma.transaction.update({
      where: { id },
      data: { payment_method, payment_status, notes },
    });

    const updated = await prisma.transaction.findUnique({
      where: { id },
      select: {
        ...transactionSelect,
        ...transactionInclude,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await prisma.transaction.delete({ where: { id } });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
