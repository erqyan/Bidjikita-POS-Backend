import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { category_name, description } = req.body;

    // Check duplicate category
    const existingCategory = await prisma.category.findFirst({ where: { category_name } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await prisma.category.create({
      data: { category_name, description },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { category_name, description } = req.body;

    // Check duplicate category name (excluding self)
    const existingCategory = await prisma.category.findFirst({ where: { category_name } });
    if (existingCategory && existingCategory.id !== category.id) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { category_name, description },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category is used by any product
    const productExists = await prisma.product.findFirst({ where: { category_id: id } });
    if (productExists) {
      return res.status(400).json({
        message: 'Category is used by products and cannot be deleted',
      });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json(error);
  }
};
