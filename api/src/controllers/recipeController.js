const Recipe = require("../models/Recipe");
const RecipeDetail = require("../models/RecipeDetail");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const RawMaterial = require("../models/RawMaterial");

// Reusable include
const recipeInclude = [
  {
    model: Product,
    attributes: ["id", "product_name"],
  },
  {
    model: ProductVariant,
    attributes: ["id", "variant_name"],
  },
  {
    model: RecipeDetail,
    attributes: ["id", "quantity"],
    include: [
      {
        model: RawMaterial,
        attributes: ["id", "material_name", "unit", "stock", "cost_per_unit"],
      },
    ],
  },
];

/**
 * After saving recipe details, recalculate the product's base_cost and profit_margin.
 * base_cost = sum of (quantity × cost_per_unit) for every ingredient in the recipe.
 */
async function recalculateProductCost(recipe_id, product_id) {
  const details = await RecipeDetail.findAll({
    where: { recipe_id },
    include: [{ model: RawMaterial, attributes: ["cost_per_unit"] }],
  });

  const ingredientCost = details.reduce((sum, d) => {
    const cpu = parseFloat(d.RawMaterial?.cost_per_unit || 0);
    return sum + parseFloat(d.quantity) * cpu;
  }, 0);

  const product = await Product.findByPk(product_id);
  if (!product) return;

  const overhead = parseFloat(product.overhead_cost || 0);
  const totalCost = ingredientCost + overhead;
  const sellingPrice = parseFloat(product.selling_price || 0);
  const profitMargin =
    sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  await product.update({
    base_cost: parseFloat(ingredientCost.toFixed(4)),
    profit_margin: parseFloat(profitMargin.toFixed(2)),
  });
}

// CREATE RECIPE
exports.createRecipe = async (req, res) => {
  try {
    const { recipe_name, product_id, variant_id, materials } = req.body;

    if (!recipe_name || !product_id || !materials || materials.length === 0) {
      return res.status(400).json({ message: "Incomplete recipe data" });
    }

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (variant_id) {
      const variant = await ProductVariant.findByPk(variant_id);
      if (!variant)
        return res.status(404).json({ message: "Variant not found" });
    }

    const recipe = await Recipe.create({
      recipe_name,
      product_id,
      variant_id: variant_id || null,
    });

    for (const material of materials) {
      const rawMaterial = await RawMaterial.findByPk(material.raw_material_id);
      if (!rawMaterial)
        return res.status(404).json({ message: "Raw material not found" });

      await RecipeDetail.create({
        recipe_id: recipe.id,
        raw_material_id: material.raw_material_id,
        quantity: material.quantity,
      });
    }

    // Auto-recalculate product cost
    await recalculateProductCost(recipe.id, product_id);

    const result = await Recipe.findByPk(recipe.id, {
      attributes: ["id", "recipe_name", "createdAt"],
      include: recipeInclude,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// GET ALL RECIPES
exports.getRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.findAll({
      attributes: ["id", "recipe_name", "createdAt"],
      include: recipeInclude,
      order: [["createdAt", "DESC"]],
    });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET RECIPE BY ID
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ["id", "recipe_name", "createdAt"],
      include: recipeInclude,
    });
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE RECIPE
exports.updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    const { recipe_name, product_id, variant_id, materials } = req.body;

    if (!recipe_name || !product_id || !materials || materials.length === 0) {
      return res.status(400).json({ message: "Incomplete recipe data" });
    }

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (variant_id) {
      const variant = await ProductVariant.findByPk(variant_id);
      if (!variant)
        return res.status(404).json({ message: "Variant not found" });
    }

    await recipe.update({
      recipe_name,
      product_id,
      variant_id: variant_id || null,
    });

    // Delete old details
    await RecipeDetail.destroy({ where: { recipe_id: recipe.id } });

    // Insert new details
    for (const material of materials) {
      const rawMaterial = await RawMaterial.findByPk(material.raw_material_id);
      if (!rawMaterial)
        return res.status(404).json({ message: "Raw material not found" });

      await RecipeDetail.create({
        recipe_id: recipe.id,
        raw_material_id: material.raw_material_id,
        quantity: material.quantity,
      });
    }

    // Auto-recalculate product cost
    await recalculateProductCost(recipe.id, product_id);

    const updatedRecipe = await Recipe.findByPk(recipe.id, {
      attributes: ["id", "recipe_name", "createdAt", "updatedAt"],
      include: recipeInclude,
    });

    res.json({ message: "Recipe updated successfully", data: updatedRecipe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE RECIPE
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    await RecipeDetail.destroy({ where: { recipe_id: recipe.id } });
    await recipe.destroy();

    res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
