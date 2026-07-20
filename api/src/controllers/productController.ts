import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';

// ── Helpers ────────────────────────────────────────────────────────────────

function deleteUploadedFile(imageUrl: string | null | undefined): void {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filePath = path.join(__dirname, '../../', imageUrl);
  fs.unlink(filePath, (err) => {
    if (err) console.warn('Could not delete image file:', err.message);
  });
}

function parseVariants(raw: unknown): unknown {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return undefined; }
  }
  return raw;
}

// Reusable include for products with variants and ingredients
const productInclude = {
  category: true,
  variants: {
    include: {
      ingredients: {
        include: {
          rawMaterial: {
            select: { id: true, material_name: true, unit: true, cost_per_unit: true, stock: true, minimum_stock: true },
          },
        },
      },
    },
  },
};

// ── CREATE PRODUCT ─────────────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      product_name,
      description,
      image_url: bodyImageUrl,
      status,
      variants: variantsRaw,
    } = req.body;

    const variants = parseVariants(variantsRaw);

    const image_url = req.file
      ? `/uploads/products/${req.file.filename}`
      : (bodyImageUrl || null);

    // Validate category
    const category = await prisma.category.findUnique({ where: { id: Number(category_id) } });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check duplicate name
    const existing = await prisma.product.findUnique({ where: { product_name } });
    if (existing) {
      return res.status(400).json({ message: 'Product already exists' });
    }

    // Use Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          category_id: Number(category_id),
          product_name,
          description: description || null,
          image_url,
          status: status || 'available',
        },
      });

      // Create variants if provided, otherwise create a default variant
      const variantList = Array.isArray(variants) && variants.length > 0
        ? variants
        : [{ variant_name: product_name, price: 0, overhead_cost: 0, ingredients: [] }];

      for (const v of variantList) {
        const variant = await tx.productVariant.create({
          data: {
            product_id: product.id,
            variant_name: v.variant_name,
            price: parseFloat(v.price || 0),
            overhead_cost: parseFloat(v.overhead_cost || 0),
          },
        });

        if (Array.isArray(v.ingredients)) {
          for (const ing of v.ingredients) {
            const material = await tx.rawMaterial.findUnique({ where: { id: ing.ingredient_id } });
            if (!material) {
              throw new Error(`Ingredient ${ing.ingredient_id} not found`);
            }
            await tx.variantIngredient.create({
              data: {
                variant_id: variant.id,
                raw_material_id: ing.ingredient_id,
                quantity: parseFloat(ing.qty || 0),
              },
            });
          }
        }
      }

      return product;
    });

    // Re-fetch with associations
    const createdProduct = await prisma.product.findUnique({
      where: { id: result.id },
      include: productInclude,
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET ALL PRODUCTS ───────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const simple = req.query.simple === 'true';
    const include = simple
      ? { category: true, variants: true }
      : productInclude;

    const products = await prisma.product.findMany({
      include,
      orderBy: { product_name: 'asc' },
    });

    if (simple) {
      const enriched = products.map((p) => {
        const plainVariants = p.variants.map((v) => ({
          id: v.id,
          variant_name: v.variant_name,
          price: v.price,
          overhead_cost: v.overhead_cost,
          product_id: v.product_id,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          VariantIngredients: [],
        }));
        return {
          ...p,
          Category: p.category,
          category: undefined,
          ProductVariants: plainVariants,
          variants: undefined,
          low_stock: false,
        };
      });
      return res.json(enriched);
    }

    // Enrich each product with a low_stock flag and map to old field names
    const enriched = (products as any[]).map((p) => {
      let lowStock = false;
      const variants = p.variants.map((v) => {
        // Rename ingredients -> VariantIngredients, rawMaterial -> RawMaterial
        const ingredients = v.ingredients.map((ing) => ({
          ...ing,
          RawMaterial: ing.rawMaterial,
          rawMaterial: undefined,
        }));
        return {
          ...v,
          VariantIngredients: ingredients,
          ingredients: undefined,
        };
      });

      for (const v of variants) {
        for (const ing of v.VariantIngredients) {
          if (Number(ing.RawMaterial.stock) <= Number(ing.RawMaterial.minimum_stock)) {
            lowStock = true;
            break;
          }
        }
        if (lowStock) break;
      }

      return {
        ...p,
        variants: undefined,
        category: undefined,
        low_stock: lowStock,
        Category: p.category,
        ProductVariants: variants,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET PRODUCT BY ID ──────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── UPDATE PRODUCT ─────────────────────────────────────────────────────────
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      category_id,
      product_name,
      description,
      image_url: bodyImageUrl,
      status,
      variants: variantsRaw,
    } = req.body;

    // Resolve new image URL
    let newImageUrl = product.image_url;
    if (req.file) {
      deleteUploadedFile(product.image_url);
      newImageUrl = `/uploads/products/${req.file.filename}`;
    } else if (bodyImageUrl !== undefined) {
      newImageUrl = bodyImageUrl || null;
    }

    // Validate category if provided
    if (category_id) {
      const category = await prisma.category.findUnique({ where: { id: Number(category_id) } });
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }

    // Check duplicate name
    if (product_name && product_name !== product.product_name) {
      const existing = await prisma.product.findUnique({ where: { product_name } });
      if (existing && existing.id !== product.id) {
        return res.status(400).json({ message: 'Product name already exists' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          category_id: category_id ? Number(category_id) : product.category_id,
          product_name: product_name ?? product.product_name,
          description: description !== undefined ? description : product.description,
          image_url: newImageUrl,
          status: status ?? product.status,
        },
      });

      // Update or replace variants if provided
      const variants = parseVariants(variantsRaw);
      if (Array.isArray(variants)) {
        const existingVariants = await tx.productVariant.findMany({
          where: { product_id: id },
        });

        const matchedExistingIds = new Set<number>();

        for (const v of variants) {
          const existing = existingVariants.find(
            (ev) => ev.variant_name.toLowerCase() === (v.variant_name || '').toLowerCase()
          );

          if (existing) {
            matchedExistingIds.add(existing.id);
            await tx.productVariant.update({
              where: { id: existing.id },
              data: {
                variant_name: v.variant_name,
                price: parseFloat(v.price || 0),
                overhead_cost: parseFloat(v.overhead_cost || 0),
              },
            });

            // Replace ingredients
            await tx.variantIngredient.deleteMany({ where: { variant_id: existing.id } });
            if (Array.isArray(v.ingredients)) {
              for (const ing of v.ingredients) {
                const material = await tx.rawMaterial.findUnique({ where: { id: ing.ingredient_id } });
                if (!material) {
                  throw new Error(`Ingredient ${ing.ingredient_id} not found`);
                }
                await tx.variantIngredient.create({
                  data: {
                    variant_id: existing.id,
                    raw_material_id: ing.ingredient_id,
                    quantity: parseFloat(ing.qty || 0),
                  },
                });
              }
            }
          } else {
            // Create new variant
            const variant = await tx.productVariant.create({
              data: {
                product_id: id,
                variant_name: v.variant_name,
                price: parseFloat(v.price || 0),
                overhead_cost: parseFloat(v.overhead_cost || 0),
              },
            });

            if (Array.isArray(v.ingredients)) {
              for (const ing of v.ingredients) {
                const material = await tx.rawMaterial.findUnique({ where: { id: ing.ingredient_id } });
                if (!material) {
                  throw new Error(`Ingredient ${ing.ingredient_id} not found`);
                }
                await tx.variantIngredient.create({
                  data: {
                    variant_id: variant.id,
                    raw_material_id: ing.ingredient_id,
                    quantity: parseFloat(ing.qty || 0),
                  },
                });
              }
            }
          }
        }

        // Delete variants that are no longer present
        for (const ev of existingVariants) {
          if (!matchedExistingIds.has(ev.id)) {
            // Nullify bundle_item references
            await tx.bundleItem.updateMany({
              where: { variant_id: ev.id },
              data: { variant_id: null },
            });
            await tx.variantIngredient.deleteMany({ where: { variant_id: ev.id } });
            await tx.productVariant.delete({ where: { id: ev.id } });
          }
        }
      }

      return product;
    });

    const updatedProduct = await prisma.product.findUnique({
      where: { id: result.id },
      include: productInclude,
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── DELETE PRODUCT ─────────────────────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check if product is referenced by any bundle
    const bundleItems = await prisma.bundleItem.findMany({
      where: { product_id: id },
      include: { bundle: { select: { bundle_name: true } } },
    });
    if (bundleItems.length > 0) {
      const bundleNames = bundleItems
        .map((bi) => bi.bundle?.bundle_name)
        .filter(Boolean)
        .join(', ');
      return res.status(400).json({
        message: `Menu ini terdapat dalam bundel: ${bundleNames}. Hapus dari bundel terlebih dahulu sebelum menghapus menu.`,
      });
    }

    // Check if product has order history
    const orderCount = await prisma.orderDetail.count({ where: { product_id: id } });
    if (orderCount > 0) {
      return res.status(400).json({
        message: `Menu ini tidak dapat dihapus karena sudah tercatat dalam ${orderCount} transaksi. Nonaktifkan saja jika tidak ingin digunakan lagi.`,
      });
    }

    deleteUploadedFile(product.image_url);
    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
