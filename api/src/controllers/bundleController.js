const path = require("path");
const fs = require("fs");
const Bundle = require("../models/Bundle");
const BundleItem = require("../models/BundleItem");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const VariantIngredient = require("../models/VariantIngredient");
const RawMaterial = require("../models/RawMaterial");
const { Op } = require("sequelize");

/** Eager-load config for bundle → items → product + variants with cost data. */
const bundleWithItems = {
  include: {
    model: BundleItem,
    include: [
      { model: ProductVariant, include: [{ model: VariantIngredient, include: [{ model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] }] }] },
      { model: Product, attributes: ["id", "product_name", "image_url"], include: [{ model: ProductVariant, attributes: ["id", "variant_name", "price"] }] },
    ],
  },
};

/**
 * Compute production cost of a specific variant.
 * cost = sum(ingredient_qty × cost_per_unit) + overhead_cost
 */
function computeVariantCost(variant) {
  if (!variant) return 0;
  const ingCost = (variant.VariantIngredients || []).reduce((sum, vi) => {
    return sum + Number(vi.quantity) * Number(vi.RawMaterial?.cost_per_unit || 0);
  }, 0);
  return ingCost + Number(variant.overhead_cost || 0);
}

/**
 * Resolve the variant for a bundle item.
 * Uses the explicitly selected variant_id, or falls back to the product's first variant.
 */
async function resolveVariant(productId, variantId, transaction) {
  if (variantId) {
    const v = await ProductVariant.findByPk(variantId, {
      include: [{ model: VariantIngredient, include: [RawMaterial] }],
      transaction,
    });
    if (v && v.product_id === productId) return v;
  }
  // Fallback: first variant of the product
  return ProductVariant.findOne({
    where: { product_id: productId },
    order: [["id", "ASC"]],
    include: [{ model: VariantIngredient, include: [RawMaterial] }],
    transaction,
  });
}

/** Delete an uploaded bundle image file (non-blocking). */
function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  const filePath = path.join(__dirname, "../../", imageUrl);
  fs.unlink(filePath, (err) => {
    if (err) console.warn("Could not delete image file:", err.message);
  });
}

/**
 * Attach a flat `items_images` array of unique product image URLs
 * so the cashier app doesn't have to traverse nested relations.
 * Also resolve the effective price for each bundle item.
 */
function enrichBundleImages(bundle) {
  if (!bundle) return bundle;
  const json = bundle.toJSON ? bundle.toJSON() : bundle;
  const seen = new Set();
  json.items_images = (json.BundleItems || [])
    .map((item) => item.Product?.image_url)
    .filter((url) => url && (seen.has(url) ? false : seen.add(url)))
    .slice(0, 4);

  // Ensure every bundle item has a resolved variant price for the dashboard
  for (const item of json.BundleItems || []) {
    if (!item.ProductVariant && item.Product?.ProductVariants?.length > 0) {
      // Use the first variant as the effective variant
      item.ProductVariant = item.Product.ProductVariants[0];
    }
  }

  return json;
}

// =============================================
// CREATE BUNDLE
// =============================================
exports.createBundle = async (req, res) => {
  try {
    const { bundle_name, description, bundle_price } = req.body;
    let items = req.body.items;
    if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }
    const image_url = req.file ? `/uploads/bundles/${req.file.filename}` : null;

    if (!bundle_name || !bundle_price || !items || items.length === 0) {
      return res.status(400).json({ message: "bundle_name, bundle_price, and items are required" });
    }

    const existingBundle = await Bundle.findOne({ where: { bundle_name } });
    if (existingBundle) {
      return res.status(400).json({ message: "Bundle name already exists" });
    }

    let totalBundleCost = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) return res.status(404).json({ message: `Product ${item.product_id} not found` });
      const variant = await resolveVariant(item.product_id, item.variant_id);
      if (!variant) {
        return res.status(400).json({ message: `Produk "${product.product_name}" tidak memiliki varian. Tambahkan varian terlebih dahulu.` });
      }
      totalBundleCost += computeVariantCost(variant) * item.quantity;
    }

    const bundle = await Bundle.create({
      bundle_name,
      description,
      image_url,
      bundle_price,
      total_bundle_cost: totalBundleCost,
      bundle_profit: bundle_price - totalBundleCost,
    });

    for (const item of items) {
      await BundleItem.create({
        bundle_id: bundle.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
      });
    }

    const completeBundle = await Bundle.findByPk(bundle.id, bundleWithItems);
    res.status(201).json(enrichBundleImages(completeBundle));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================================
// GET ALL BUNDLES (active only)
// =============================================
exports.getBundles = async (req, res) => {
  try {
    const bundles = await Bundle.findAll({ ...bundleWithItems, where: { is_active: true } });
    res.json(bundles.map(enrichBundleImages));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================================
// GET ALL BUNDLES (including inactive)
// =============================================
exports.getAllBundles = async (req, res) => {
  try {
    const bundles = await Bundle.findAll(bundleWithItems);
    res.json(bundles.map(enrichBundleImages));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================================
// GET BUNDLE BY ID
// =============================================
exports.getBundleById = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id, bundleWithItems);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });
    res.json(enrichBundleImages(bundle));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================================
// UPDATE BUNDLE
// =============================================
exports.updateBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });

    const { bundle_name, description, bundle_price, image_url: bodyImageUrl } = req.body;
    let items = req.body.items;
    if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }

    let newImageUrl = bundle.image_url;
    if (req.file) {
      deleteUploadedFile(bundle.image_url);
      newImageUrl = `/uploads/bundles/${req.file.filename}`;
    } else if (bodyImageUrl !== undefined) {
      if (!bodyImageUrl && bundle.image_url) deleteUploadedFile(bundle.image_url);
      newImageUrl = bodyImageUrl || null;
    }

    if (bundle_name && bundle_name !== bundle.bundle_name) {
      const existingBundle = await Bundle.findOne({ where: { bundle_name } });
      if (existingBundle) return res.status(400).json({ message: "Bundle name already exists" });
    }

    let totalBundleCost = 0;

    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findByPk(item.product_id);
        if (!product) return res.status(404).json({ message: `Product ${item.product_id} not found` });
        const variant = await resolveVariant(item.product_id, item.variant_id);
        if (!variant) {
          return res.status(400).json({ message: `Produk "${product.product_name}" tidak memiliki varian. Tambahkan varian terlebih dahulu.` });
        }
        totalBundleCost += computeVariantCost(variant) * item.quantity;
      }

      await BundleItem.destroy({ where: { bundle_id: bundle.id } });
      for (const item of items) {
        await BundleItem.create({
          bundle_id: bundle.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
        });
      }
    } else {
      const existingItems = await BundleItem.findAll({
        where: { bundle_id: bundle.id },
        include: [{ model: ProductVariant, include: [{ model: VariantIngredient, include: [RawMaterial] }] }],
      });
      for (const bi of existingItems) {
        const variant = bi.ProductVariant || await resolveVariant(bi.product_id, null);
        totalBundleCost += computeVariantCost(variant) * bi.quantity;
      }
    }

    const newPrice = bundle_price !== undefined ? bundle_price : bundle.bundle_price;
    await bundle.update({
      bundle_name: bundle_name || bundle.bundle_name,
      description: description !== undefined ? description : bundle.description,
      image_url: newImageUrl,
      bundle_price: newPrice,
      total_bundle_cost: totalBundleCost,
      bundle_profit: newPrice - totalBundleCost,
    });

    const updatedBundle = await Bundle.findByPk(bundle.id, bundleWithItems);
    res.json(enrichBundleImages(updatedBundle));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================================
// DELETE BUNDLE
// =============================================
exports.deleteBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });
    deleteUploadedFile(bundle.image_url);
    await bundle.destroy();
    res.json({ message: "Bundle deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// TOGGLE ACTIVE
exports.toggleActive = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });
    await bundle.update({ is_active: !bundle.is_active });
    res.json({ message: "Bundle status updated", bundle });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
