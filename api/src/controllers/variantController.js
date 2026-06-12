const ProductVariant = require("../models/ProductVariant");
const Product = require("../models/Product");
const VariantIngredient = require("../models/VariantIngredient");
const RawMaterial = require("../models/RawMaterial");

// ── CRUD ──────────────────────────────────────────────────────────────────

exports.createVariant = async (req, res) => {
  try {
    const { product_id, variant_name, price, overhead_cost, ingredients } = req.body;

    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = await ProductVariant.create({
      product_id,
      variant_name,
      price: parseFloat(price || 0),
      overhead_cost: parseFloat(overhead_cost || 0),
    });

    // Create ingredients if provided
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const material = await RawMaterial.findByPk(ing.ingredient_id);
        if (!material) {
          return res.status(404).json({ message: `Ingredient ${ing.ingredient_id} not found` });
        }
        await VariantIngredient.create({
          variant_id: variant.id,
          raw_material_id: ing.ingredient_id,
          quantity: parseFloat(ing.qty || 0),
        });
      }
    }

    // Re-fetch with includes
    const result = await ProductVariant.findByPk(variant.id, {
      include: [
        { model: Product, attributes: ["id", "product_name"] },
        {
          model: VariantIngredient,
          include: [{ model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] }],
        },
      ],
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVariants = async (req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      include: [
        { model: Product, attributes: ["id", "product_name"] },
        {
          model: VariantIngredient,
          include: [{ model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] }],
        },
      ],
    });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVariantById = async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id, {
      include: [
        { model: Product, attributes: ["id", "product_name"] },
        {
          model: VariantIngredient,
          include: [{ model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] }],
        },
      ],
    });
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    res.json(variant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const { variant_name, price, overhead_cost, ingredients } = req.body;

    await variant.update({
      variant_name: variant_name ?? variant.variant_name,
      price: price !== undefined ? parseFloat(price) : variant.price,
      overhead_cost: overhead_cost !== undefined ? parseFloat(overhead_cost) : variant.overhead_cost,
    });

    // Replace ingredients if provided
    if (Array.isArray(ingredients)) {
      await VariantIngredient.destroy({ where: { variant_id: variant.id } });
      for (const ing of ingredients) {
        const material = await RawMaterial.findByPk(ing.ingredient_id);
        if (!material) {
          return res.status(404).json({ message: `Ingredient ${ing.ingredient_id} not found` });
        }
        await VariantIngredient.create({
          variant_id: variant.id,
          raw_material_id: ing.ingredient_id,
          quantity: parseFloat(ing.qty || 0),
        });
      }
    }

    const result = await ProductVariant.findByPk(variant.id, {
      include: [
        { model: Product, attributes: ["id", "product_name"] },
        {
          model: VariantIngredient,
          include: [{ model: RawMaterial, attributes: ["id", "material_name", "unit", "cost_per_unit"] }],
        },
      ],
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    await variant.destroy(); // cascade deletes ingredients
    res.json({ message: "Variant deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
