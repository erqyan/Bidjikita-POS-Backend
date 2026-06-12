const RawMaterial = require("../models/RawMaterial");
const IngredientLog = require("../models/IngredientLog");
const VariantIngredient = require("../models/VariantIngredient");
const ProductVariant = require("../models/ProductVariant");
const Product = require("../models/Product");
const User = require("../models/User");

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

    // Capture old stock before update for logging
    const oldStock = Number(material.stock);

    await material.update({
      material_name: material_name ?? material.material_name,
      unit: unit ?? material.unit,
      stock: stock ?? material.stock,
      minimum_stock: minimum_stock ?? material.minimum_stock,
      cost_per_unit: cost_per_unit ?? material.cost_per_unit,
    });

    // Log stock change
    if (stock !== undefined && Number(stock) !== oldStock) {
      const newStock = Number(stock);
      const qtyChange = newStock - oldStock;

      // Look up user name from DB since JWT only has id + role
      let userName = null;
      if (req.user?.id) {
        const u = await User.findByPk(req.user.id, { attributes: ["full_name", "username"] });
        userName = u?.full_name || u?.username || null;
      }

      await IngredientLog.create({
        raw_material_id: material.id,
        material_name: material.material_name,
        previous_stock: oldStock,
        new_stock: newStock,
        quantity_change: qtyChange,
        change_type: "manual_adjustment",
        user_id: req.user?.id || null,
        user_name: userName,
        notes: req.body.notes || null,
      });
    }

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

    const usage = await VariantIngredient.findOne({
      where: { raw_material_id: material.id },
      include: [
        {
          model: ProductVariant,
          attributes: ["id", "variant_name"],
          include: [{ model: Product, attributes: ["id", "product_name"] }],
        },
      ],
    });

    if (usage) {
      return res.status(400).json({
        message: "Tidak dapat menghapus bahan karena digunakan dalam varian menu",
        variant: usage.ProductVariant?.variant_name || null,
        product: usage.ProductVariant?.Product?.product_name || null,
      });
    }

    await material.destroy();
    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET MATERIAL LOGS
exports.getMaterialLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await IngredientLog.findAll({
      where: { raw_material_id: id },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
