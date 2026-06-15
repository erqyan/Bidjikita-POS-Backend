import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

// ── Reusable eager-load config ─────────────────────────────────────────────
const bundleWithItems = {
  include: {
    items: {
      include: {
        variant: {
          include: {
            ingredients: {
              include: {
                rawMaterial: {
                  select: { id: true, material_name: true, unit: true, cost_per_unit: true },
                },
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            product_name: true,
            image_url: true,
            variants: {
              select: { id: true, variant_name: true, price: true },
            },
          },
        },
      },
    },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function computeVariantCost(variant: Record<string, unknown> | null): number {
  if (!variant) return 0;
  const ingredients = ((variant as any).ingredients || (variant as any).VariantIngredients || []) as any[];
  const ingCost = ingredients.reduce((sum: number, vi: any) => {
    return sum + Number(vi.quantity) * Number(vi.rawMaterial?.cost_per_unit || vi.RawMaterial?.cost_per_unit || 0);
  }, 0);
  return ingCost + Number((variant as any).overhead_cost || 0);
}

async function resolveVariant(productId: number, variantId: number | null | undefined) {
  if (variantId) {
    const v = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { ingredients: { include: { rawMaterial: true } } },
    });
    if (v && v.product_id === productId) return v;
  }
  // Fallback: first variant of the product
  return prisma.productVariant.findFirst({
    where: { product_id: productId },
    orderBy: { id: 'asc' },
    include: { ingredients: { include: { rawMaterial: true } } },
  });
}

function deleteUploadedFile(imageUrl: string | null | undefined): void {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filePath = path.join(__dirname, '../../', imageUrl);
  fs.unlink(filePath, (err) => {
    if (err) console.warn('Could not delete image file:', err.message);
  });
}

function enrichBundleImages(bundle: any) {
  if (!bundle) return bundle;
  const seen = new Set<string>();
  (bundle as any).items_images = (bundle.items || bundle.BundleItems || [])
    .map((item: any) => item.product?.image_url || item.Product?.image_url)
    .filter((url: string | null) => url && (seen.has(url) ? false : seen.add(url)))
    .slice(0, 4);

  // Ensure every bundle item has a resolved variant for the dashboard
  for (const item of (bundle.items || bundle.BundleItems || [])) {
    if (!item.variant && !item.ProductVariant) {
      const productVariants = item.product?.variants || item.Product?.ProductVariants || [];
      if (productVariants.length > 0) {
        item.ProductVariant = productVariants[0];
        item.variant = productVariants[0];
      }
    }
  }

  return bundle;
}

// ── CREATE BUNDLE ──────────────────────────────────────────────────────────
export const createBundle = async (req: Request, res: Response) => {
  try {
    const { bundle_name, description, bundle_price } = req.body;
    let items = req.body.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    const image_url = req.file ? `/uploads/bundles/${req.file.filename}` : null;

    if (!bundle_name || !bundle_name.trim() || !bundle_price || !items || items.length === 0) {
      return res.status(400).json({ message: 'bundle_name, bundle_price, and items are required' });
    }

    const trimmedName = bundle_name.trim();

    const existingBundle = await prisma.bundle.findUnique({ where: { bundle_name: trimmedName } });
    if (existingBundle) {
      return res.status(400).json({ message: 'Bundle name already exists' });
    }

    // Check for duplicate items (same product_id + variant_id combination)
    const seen = new Set<string>();
    for (const item of items) {
      const key = `${item.product_id}-${item.variant_id || 'default'}`;
      if (seen.has(key)) {
        return res.status(400).json({
          message: 'Terdapat produk/varian yang duplikat dalam bundle. Hapus duplikat sebelum menyimpan.',
        });
      }
      seen.add(key);
    }

    let totalBundleCost = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.product_id } });
      if (!product) return res.status(404).json({ message: `Product ${item.product_id} not found` });

      if (product.status === 'out_of_stock') {
        return res.status(400).json({
          message: `Produk "${product.product_name}" sedang habis dan tidak dapat ditambahkan ke bundle.`,
        });
      }

      const variant = await resolveVariant(item.product_id, item.variant_id);
      if (!variant) {
        return res.status(400).json({
          message: `Produk "${product.product_name}" tidak memiliki varian. Tambahkan varian terlebih dahulu.`,
        });
      }
      totalBundleCost += computeVariantCost(variant) * item.quantity;
    }

    const bundle = await prisma.bundle.create({
      data: {
        bundle_name: trimmedName,
        description,
        image_url,
        bundle_price: Number(bundle_price),
        total_bundle_cost: totalBundleCost,
        bundle_profit: Number(bundle_price) - totalBundleCost,
      },
    });

    for (const item of items) {
      await prisma.bundleItem.create({
        data: {
          bundle_id: bundle.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
        },
      });
    }

    const completeBundle = await prisma.bundle.findUnique({
      where: { id: bundle.id },
      ...bundleWithItems,
    });

    res.status(201).json(enrichBundleImages(completeBundle));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET ALL BUNDLES (active only) ───────────────────────────────────────────
export const getBundles = async (_req: Request, res: Response) => {
  try {
    const bundles = await prisma.bundle.findMany({
      ...bundleWithItems,
      where: { is_active: true },
    });
    res.json(bundles.map(enrichBundleImages));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET ALL BUNDLES (including inactive) ────────────────────────────────────
export const getAllBundles = async (_req: Request, res: Response) => {
  try {
    const bundles = await prisma.bundle.findMany(bundleWithItems);
    res.json(bundles.map(enrichBundleImages));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── GET BUNDLE BY ID ───────────────────────────────────────────────────────
export const getBundleById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const bundle = await prisma.bundle.findUnique({ where: { id }, ...bundleWithItems });
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.json(enrichBundleImages(bundle));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── UPDATE BUNDLE ──────────────────────────────────────────────────────────
export const updateBundle = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const bundle = await prisma.bundle.findUnique({ where: { id } });
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });

    const { bundle_name, description, bundle_price, image_url: bodyImageUrl } = req.body;
    let items = req.body.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }

    let newImageUrl = bundle.image_url;
    if (req.file) {
      deleteUploadedFile(bundle.image_url);
      newImageUrl = `/uploads/bundles/${req.file.filename}`;
    } else if (bodyImageUrl !== undefined) {
      if (!bodyImageUrl && bundle.image_url) deleteUploadedFile(bundle.image_url);
      newImageUrl = bodyImageUrl || null;
    }

    const trimmedName = bundle_name ? bundle_name.trim() : undefined;

    if (trimmedName && trimmedName !== bundle.bundle_name) {
      const existingBundle = await prisma.bundle.findUnique({ where: { bundle_name: trimmedName } });
      if (existingBundle) return res.status(400).json({ message: 'Bundle name already exists' });
    }

    let totalBundleCost = 0;

    if (items && items.length > 0) {
      // Check for duplicate items
      const seen = new Set<string>();
      for (const item of items) {
        const key = `${item.product_id}-${item.variant_id || 'default'}`;
        if (seen.has(key)) {
          return res.status(400).json({
            message: 'Terdapat produk/varian yang duplikat dalam bundle. Hapus duplikat sebelum menyimpan.',
          });
        }
        seen.add(key);
      }

      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.product_id } });
        if (!product) return res.status(404).json({ message: `Product ${item.product_id} not found` });

        if (product.status === 'out_of_stock') {
          return res.status(400).json({
            message: `Produk "${product.product_name}" sedang habis dan tidak dapat ditambahkan ke bundle.`,
          });
        }

        const variant = await resolveVariant(item.product_id, item.variant_id);
        if (!variant) {
          return res.status(400).json({
            message: `Produk "${product.product_name}" tidak memiliki varian. Tambahkan varian terlebih dahulu.`,
          });
        }
        totalBundleCost += computeVariantCost(variant) * item.quantity;
      }

      await prisma.bundleItem.deleteMany({ where: { bundle_id: id } });
      for (const item of items) {
        await prisma.bundleItem.create({
          data: {
            bundle_id: id,
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            quantity: item.quantity,
          },
        });
      }
    } else {
      const existingItems = await prisma.bundleItem.findMany({
        where: { bundle_id: id },
        include: {
          variant: {
            include: { ingredients: { include: { rawMaterial: true } } },
          },
        },
      });
      for (const bi of existingItems) {
        const variant = bi.variant || (await resolveVariant(bi.product_id, null));
        totalBundleCost += computeVariantCost(variant) * bi.quantity;
      }
    }

    const newPrice = bundle_price !== undefined ? Number(bundle_price) : Number(bundle.bundle_price);
    await prisma.bundle.update({
      where: { id },
      data: {
        bundle_name: trimmedName || bundle.bundle_name,
        description: description !== undefined ? description : bundle.description,
        image_url: newImageUrl,
        bundle_price: newPrice,
        total_bundle_cost: totalBundleCost,
        bundle_profit: newPrice - totalBundleCost,
      },
    });

    const updatedBundle = await prisma.bundle.findUnique({ where: { id }, ...bundleWithItems });
    res.json(enrichBundleImages(updatedBundle));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── DELETE BUNDLE ──────────────────────────────────────────────────────────
export const deleteBundle = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const bundle = await prisma.bundle.findUnique({ where: { id } });
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    deleteUploadedFile(bundle.image_url);
    await prisma.bundle.delete({ where: { id } });
    res.json({ message: 'Bundle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// ── TOGGLE ACTIVE ──────────────────────────────────────────────────────────
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const bundle = await prisma.bundle.findUnique({ where: { id } });
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    await prisma.bundle.update({
      where: { id },
      data: { is_active: !bundle.is_active },
    });
    res.json({ message: 'Bundle status updated', bundle });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
