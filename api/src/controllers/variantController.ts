import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const variantInclude = {
  product: { select: { id: true, product_name: true } },
  ingredients: {
    include: {
      rawMaterial: { select: { id: true, material_name: true, unit: true, cost_per_unit: true } },
    },
  },
};

export const createVariant = async (req: Request, res: Response) => {
  try {
    const { product_id, variant_name, price, overhead_cost, ingredients } = req.body;

    const product = await prisma.product.findUnique({ where: { id: product_id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = await prisma.productVariant.create({
      data: {
        product_id,
        variant_name,
        price: parseFloat(price || 0),
        overhead_cost: parseFloat(overhead_cost || 0),
      },
    });

    // Create ingredients if provided
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const material = await prisma.rawMaterial.findUnique({ where: { id: ing.ingredient_id } });
        if (!material) {
          return res.status(404).json({ message: `Ingredient ${ing.ingredient_id} not found` });
        }
        await prisma.variantIngredient.create({
          data: {
            variant_id: variant.id,
            raw_material_id: ing.ingredient_id,
            quantity: parseFloat(ing.qty || 0),
          },
        });
      }
    }

    // Re-fetch with includes
    const result = await prisma.productVariant.findUnique({
      where: { id: variant.id },
      include: variantInclude,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getVariants = async (_req: Request, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: variantInclude,
    });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getVariantById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: variantInclude,
    });

    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    res.json(variant);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateVariant = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const variant = await prisma.productVariant.findUnique({ where: { id } });

    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    const { variant_name, price, overhead_cost, ingredients } = req.body;

    await prisma.productVariant.update({
      where: { id },
      data: {
        variant_name: variant_name ?? variant.variant_name,
        price: price !== undefined ? parseFloat(price) : variant.price,
        overhead_cost: overhead_cost !== undefined ? parseFloat(overhead_cost) : variant.overhead_cost,
      },
    });

    // Replace ingredients if provided
    if (Array.isArray(ingredients)) {
      await prisma.variantIngredient.deleteMany({ where: { variant_id: id } });
      for (const ing of ingredients) {
        const material = await prisma.rawMaterial.findUnique({ where: { id: ing.ingredient_id } });
        if (!material) {
          return res.status(404).json({ message: `Ingredient ${ing.ingredient_id} not found` });
        }
        await prisma.variantIngredient.create({
          data: {
            variant_id: id,
            raw_material_id: ing.ingredient_id,
            quantity: parseFloat(ing.qty || 0),
          },
        });
      }
    }

    const result = await prisma.productVariant.findUnique({
      where: { id },
      include: variantInclude,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteVariant = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const variant = await prisma.productVariant.findUnique({ where: { id } });

    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    await prisma.productVariant.delete({ where: { id } }); // cascade deletes ingredients

    res.json({ message: 'Variant deleted' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
