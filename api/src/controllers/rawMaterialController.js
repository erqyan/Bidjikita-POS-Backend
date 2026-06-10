const RawMaterial = require("../models/RawMaterial");
const RecipeDetail = require("../models/RecipeDetail");
const Recipe = require("../models/Recipe");

// CREATE RAW MATERIAL
exports.createRawMaterial = async (req, res) => {
  try {
    const { material_name, unit, stock, minimum_stock, cost_per_unit } =
      req.body;

    if (!material_name || !unit) {
      return res
        .status(400)
        .json({ message: "Material name and unit are required" });
    }

    const existing = await RawMaterial.findOne({ where: { material_name } });
    if (existing) {
      return res.status(400).json({ message: "Material already exists" });
    }

    const material = await RawMaterial.create({
      material_name,
      unit,
      stock: stock || 0,
      minimum_stock: minimum_stock || 0,
      cost_per_unit: cost_per_unit || 0,
    });

    res
      .status(201)
      .json({ message: "Material created successfully", data: material });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL MATERIALS
exports.getRawMaterials = async (req, res) => {
  try {
    const materials = await RawMaterial.findAll({
      order: [["material_name", "ASC"]],
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET MATERIAL BY ID
exports.getRawMaterialById = async (req, res) => {
  try {
    const material = await RawMaterial.findByPk(req.params.id);
    if (!material)
      return res.status(404).json({ message: "Material not found" });
    res.json(material);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE MATERIAL
exports.updateRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findByPk(req.params.id);
    if (!material)
      return res.status(404).json({ message: "Material not found" });

    const { material_name, unit, stock, minimum_stock, cost_per_unit } =
      req.body;

    // Check duplicate name (excluding self)
    if (material_name && material_name !== material.material_name) {
      const existing = await RawMaterial.findOne({ where: { material_name } });
      if (existing)
        return res
          .status(400)
          .json({ message: "Material name already exists" });
    }

    await material.update({
      material_name: material_name ?? material.material_name,
      unit: unit ?? material.unit,
      stock: stock ?? material.stock,
      minimum_stock: minimum_stock ?? material.minimum_stock,
      cost_per_unit: cost_per_unit ?? material.cost_per_unit,
    });

    res.json({ message: "Material updated successfully", data: material });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE MATERIAL
exports.deleteRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findByPk(req.params.id);
    if (!material)
      return res.status(404).json({ message: "Material not found" });

    const recipeUsage = await RecipeDetail.findOne({
      where: { raw_material_id: material.id },
      include: [{ model: Recipe, attributes: ["id", "recipe_name"] }],
    });

    if (recipeUsage) {
      return res.status(400).json({
        message: "Cannot delete material because it is used in a recipe",
        recipe: recipeUsage.Recipe?.recipe_name || null,
      });
    }

    await material.destroy();
    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
