import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createRawMaterial = async (req: Request, res: Response) => {
  try {
    const { material_name, unit, stock, minimum_stock, cost_per_unit } = req.body;

    if (!material_name || !unit) {
      return res.status(400).json({ message: 'Material name and unit are required' });
    }

    if (material_name.length > 255) {
      return res.status(400).json({ message: 'Nama bahan baku maksimal 255 karakter' });
    }
    if (unit && unit.length > 255) {
      return res.status(400).json({ message: 'Satuan maksimal 255 karakter' });
    }

    const existing = await prisma.rawMaterial.findUnique({ where: { material_name } });
    if (existing) {
      return res.status(400).json({ message: 'Material already exists' });
    }

    const material = await prisma.rawMaterial.create({
      data: {
        material_name,
        unit,
        stock: stock || 0,
        minimum_stock: minimum_stock || 0,
        cost_per_unit: cost_per_unit || 0,
      },
    });

    res.status(201).json({ message: 'Material created successfully', data: material });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getRawMaterials = async (_req: Request, res: Response) => {
  try {
    const materials = await prisma.rawMaterial.findMany({
      orderBy: { material_name: 'asc' },
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getRawMaterialById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json(material);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateRawMaterial = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) return res.status(404).json({ message: 'Material not found' });

    const { material_name, unit, stock, minimum_stock, cost_per_unit } = req.body;

    if (material_name && material_name.length > 255) {
      return res.status(400).json({ message: 'Nama bahan baku maksimal 255 karakter' });
    }
    if (unit && unit.length > 255) {
      return res.status(400).json({ message: 'Satuan maksimal 255 karakter' });
    }

    // Check duplicate name (excluding self)
    if (material_name && material_name !== material.material_name) {
      const existing = await prisma.rawMaterial.findUnique({ where: { material_name } });
      if (existing) return res.status(400).json({ message: 'Material name already exists' });
    }

    // Capture old stock before update for logging
    const oldStock = Number(material.stock);

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data: {
        material_name: material_name ?? material.material_name,
        unit: unit ?? material.unit,
        stock: stock !== undefined ? Number(stock) : material.stock,
        minimum_stock: minimum_stock !== undefined ? Number(minimum_stock) : material.minimum_stock,
        cost_per_unit: cost_per_unit !== undefined ? Number(cost_per_unit) : material.cost_per_unit,
      },
    });

    // Log stock change
    if (stock !== undefined && Number(stock) !== oldStock) {
      const newStock = Number(stock);
      const qtyChange = newStock - oldStock;

      // Look up user name from DB since JWT only has id + role
      let userName: string | null = null;
      if (req.user?.id) {
        const u = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { full_name: true, username: true },
        });
        userName = u?.full_name || u?.username || null;
      }

      await prisma.ingredientLog.create({
        data: {
          raw_material_id: material.id,
          material_name: material.material_name,
          previous_stock: oldStock,
          new_stock: newStock,
          quantity_change: qtyChange,
          change_type: 'manual_adjustment',
          user_id: req.user?.id || null,
          user_name: userName,
          notes: req.body.notes || null,
        },
      });
    }

    res.json({ message: 'Material updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteRawMaterial = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) return res.status(404).json({ message: 'Material not found' });

    const usage = await prisma.variantIngredient.findFirst({
      where: { raw_material_id: id },
      include: {
        variant: {
          select: { id: true, variant_name: true },
          include: { product: { select: { id: true, product_name: true } } },
        },
      },
    });

    if (usage) {
      return res.status(400).json({
        message: 'Tidak dapat menghapus bahan karena digunakan dalam varian menu',
        variant: usage.variant?.variant_name || null,
        product: usage.variant?.product?.product_name || null,
      });
    }

    await prisma.rawMaterial.delete({ where: { id } });
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getMaterialLogs = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const logs = await prisma.ingredientLog.findMany({
      where: { raw_material_id: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
