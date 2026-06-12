const path = require("path");
const fs = require("fs");
const sequelize = require("../config/database");
const Product = require("../models/Product");
const Category = require("../models/Category");
const ProductVariant = require("../models/ProductVariant");
const VariantIngredient = require("../models/VariantIngredient");
const RawMaterial = require("../models/RawMaterial");
const BundleItem = require("../models/BundleItem");
const Bundle = require("../models/Bundle");

/** Delete an uploaded product image file (non-blocking, errors are just warned). */
function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  const filePath = path.join(__dirname, "../../", imageUrl);
  fs.unlink(filePath, (err) => {
    if (err) console.warn("Could not delete image file:", err.message);
  });
}

/** Parse the `variants` field — it may arrive as a JSON string (from FormData) or as an object (from JSON body). */
function parseVariants(raw) {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

// ── CREATE PRODUCT (with optional nested variants) ────────────────────────
exports.createProduct = async (req, res) => {
  const t = await sequelize.transaction();
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

    const category = await Category.findByPk(category_id);
    if (!category) {
      await t.rollback();
      return res.status(404).json({ message: "Category not found" });
    }

    const existing = await Product.findOne({ where: { product_name } });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ message: "Product already exists" });
    }

    const product = await Product.create(
      {
        category_id,
        product_name,
        description: description || null,
        image_url,
        status: status || "available",
      },
      { transaction: t }
    );

    // Create variants if provided, otherwise create a default variant
    const variantList = Array.isArray(variants) && variants.length > 0
      ? variants
      : [{ variant_name: product_name, price: 0, overhead_cost: 0, ingredients: [] }];

    for (const v of variantList) {
      const variant = await ProductVariant.create(
        {
          product_id: product.id,
          variant_name: v.variant_name,
          price: parseFloat(v.price || 0),
          overhead_cost: parseFloat(v.overhead_cost || 0),
        },
        { transaction: t }
      );

      if (Array.isArray(v.ingredients)) {
        for (const ing of v.ingredients) {
          const material = await RawMaterial.findByPk(ing.ingredient_id);
          if (!material) {
            await t.rollback();
            return res
              .status(404)
              .json({ message: `Ingredient ${ing.ingredient_id} not found` });
          }
          await VariantIngredient.create(
            {
              variant_id: variant.id,
              raw_material_id: ing.ingredient_id,
              quantity: parseFloat(ing.qty || 0),
            },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();

    // Re-fetch with associations
    const result = await Product.findByPk(product.id, {
      include: [
        { model: Category },
        {
          model: ProductVariant,
          include: [
            {
              model: VariantIngredient,
              include: [
                { model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] },
              ],
            },
          ],
        },
      ],
    });

    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// ── GET ALL PRODUCTS ──────────────────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category },
        {
          model: ProductVariant,
          include: [
            {
              model: VariantIngredient,
              include: [
                { model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] },
              ],
            },
          ],
        },
      ],
      order: [["product_name", "ASC"]],
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET PRODUCT BY ID ─────────────────────────────────────────────────────
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category },
        {
          model: ProductVariant,
          include: [
            {
              model: VariantIngredient,
              include: [
                { model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] },
              ],
            },
          ],
        },
      ],
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE PRODUCT (with nested variants) ─────────────────────────────────
exports.updateProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: "Product not found" });
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

    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        await t.rollback();
        return res.status(404).json({ message: "Category not found" });
      }
    }

    if (product_name && product_name !== product.product_name) {
      const existing = await Product.findOne({ where: { product_name } });
      if (existing && existing.id !== product.id) {
        await t.rollback();
        return res.status(400).json({ message: "Product name already exists" });
      }
    }

    await product.update(
      {
        category_id: category_id ?? product.category_id,
        product_name: product_name ?? product.product_name,
        description: description !== undefined ? description : product.description,
        image_url: newImageUrl,
        status: status ?? product.status,
      },
      { transaction: t }
    );

    // Update or replace variants if provided
    const variants = parseVariants(variantsRaw);
    if (Array.isArray(variants)) {
      const existingVariants = await ProductVariant.findAll({
        where: { product_id: product.id },
      });

      // Track which existing variant IDs are still in use
      const matchedExistingIds = new Set();

      for (const v of variants) {
        // Try to find an existing variant with the same name → update in place
        const existing = existingVariants.find(
          (ev) => ev.variant_name.toLowerCase() === (v.variant_name || "").toLowerCase()
        );

        if (existing) {
          // Update existing variant (keeps the same ID)
          matchedExistingIds.add(existing.id);
          await existing.update(
            {
              variant_name: v.variant_name,
              price: parseFloat(v.price || 0),
              overhead_cost: parseFloat(v.overhead_cost || 0),
            },
            { transaction: t }
          );

          // Replace ingredients
          await VariantIngredient.destroy({ where: { variant_id: existing.id }, transaction: t });
          if (Array.isArray(v.ingredients)) {
            for (const ing of v.ingredients) {
              const material = await RawMaterial.findByPk(ing.ingredient_id);
              if (!material) {
                await t.rollback();
                return res.status(404).json({ message: `Ingredient ${ing.ingredient_id} not found` });
              }
              await VariantIngredient.create(
                {
                  variant_id: existing.id,
                  raw_material_id: ing.ingredient_id,
                  quantity: parseFloat(ing.qty || 0),
                },
                { transaction: t }
              );
            }
          }
        } else {
          // Create new variant
          const variant = await ProductVariant.create(
            {
              product_id: product.id,
              variant_name: v.variant_name,
              price: parseFloat(v.price || 0),
              overhead_cost: parseFloat(v.overhead_cost || 0),
            },
            { transaction: t }
          );

          if (Array.isArray(v.ingredients)) {
            for (const ing of v.ingredients) {
              const material = await RawMaterial.findByPk(ing.ingredient_id);
              if (!material) {
                await t.rollback();
                return res.status(404).json({ message: `Ingredient ${ing.ingredient_id} not found` });
              }
              await VariantIngredient.create(
                {
                  variant_id: variant.id,
                  raw_material_id: ing.ingredient_id,
                  quantity: parseFloat(ing.qty || 0),
                },
                { transaction: t }
              );
            }
          }
        }
      }

      // Delete variants that are no longer present (not matched)
      for (const ev of existingVariants) {
        if (!matchedExistingIds.has(ev.id)) {
          // Before deleting, nullify bundle_item references so bundles don't break
          await sequelize.query(
            "UPDATE bundle_items SET variant_id = NULL WHERE variant_id = :vid",
            { replacements: { vid: ev.id }, transaction: t }
          );
          await VariantIngredient.destroy({ where: { variant_id: ev.id }, transaction: t });
          await ev.destroy({ transaction: t });
        }
      }
    }

    await t.commit();

    const result = await Product.findByPk(product.id, {
      include: [
        { model: Category },
        {
          model: ProductVariant,
          include: [
            {
              model: VariantIngredient,
              include: [
                { model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] },
              ],
            },
          ],
        },
      ],
    });

    res.json(result);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE PRODUCT ────────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if product is referenced by any bundle
    const bundleItems = await BundleItem.findAll({
      where: { product_id: product.id },
      include: [{ model: Bundle, attributes: ["bundle_name"] }],
    });
    if (bundleItems.length > 0) {
      const bundleNames = bundleItems
        .map((bi) => bi.Bundle?.bundle_name)
        .filter(Boolean)
        .join(", ");
      return res.status(400).json({
        message: `Menu ini terdapat dalam bundel: ${bundleNames}. Hapus dari bundel terlebih dahulu sebelum menghapus menu.`,
      });
    }

    deleteUploadedFile(product.image_url);
    // Variants + ingredients cascade-delete via FK
    await product.destroy();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
