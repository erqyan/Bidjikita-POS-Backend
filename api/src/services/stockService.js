const ProductVariant = require("../models/ProductVariant");
const VariantIngredient = require("../models/VariantIngredient");
const RawMaterial = require("../models/RawMaterial");
const IngredientLog = require("../models/IngredientLog");
const Product = require("../models/Product");

/**
 * Deducts raw material stock for one order line.
 *
 * Each selected variant directly owns its ingredient list (VariantIngredient).
 * We sum up the quantities across all selected variants, multiply by order quantity,
 * and deduct from each RawMaterial's stock.
 *
 * @param {number}   product_id  - Product being ordered
 * @param {number[]} variantIds  - All selected variant IDs for this order line
 * @param {number}   quantity    - Number of servings ordered
 */
exports.reduceStock = async (product_id, variantIds, quantity) => {
  const ids = Array.isArray(variantIds) ? variantIds : [];

  // Look up product name for the log
  const product = await Product.findByPk(product_id, { attributes: ["product_name"] });
  const productName = product?.product_name || `Product #${product_id}`;

  if (ids.length === 0) {
    // No variant selected — find the default variant for this product
    const defaultVariant = await ProductVariant.findOne({
      where: { product_id },
      order: [["id", "ASC"]],
    });
    if (defaultVariant) {
      ids.push(defaultVariant.id);
    } else {
      throw new Error(`No variant found for product ${product_id}`);
    }
  }

  // Load variant names for the log
  const variantModels = await ProductVariant.findAll({
    where: { id: ids },
    attributes: ["variant_name"],
  });
  const variantNames = variantModels.map((v) => v.variant_name).filter(Boolean).join(", ");

  // Load all ingredients for all selected variants
  const ingredients = await VariantIngredient.findAll({
    where: { variant_id: ids },
    include: [{ model: RawMaterial }],
  });

  if (ingredients.length === 0) {
    throw new Error(`No ingredients found for variant(s) ${ids.join(", ")}`);
  }

  // Aggregate quantity per raw material
  const usageMap = {};
  for (const ing of ingredients) {
    const key = ing.raw_material_id;
    usageMap[key] = (usageMap[key] || 0) + Number(ing.quantity);
  }

  // Deduct stock for each raw material
  for (const [rawMaterialId, perServingQty] of Object.entries(usageMap)) {
    const material = await RawMaterial.findByPk(Number(rawMaterialId));
    if (!material) {
      throw new Error(`Raw material ${rawMaterialId} not found`);
    }

    const usedStock = perServingQty * quantity;

    if (Number(material.stock) < usedStock) {
      throw new Error(
        `Insufficient stock for "${material.material_name}" (need ${usedStock} ${material.unit}, have ${material.stock})`
      );
    }

    const oldStock = Number(material.stock);
    const newStockVal = oldStock - usedStock;

    await material.update({
      stock: newStockVal,
    });

    // Log the deduction
    await IngredientLog.create({
      raw_material_id: material.id,
      material_name: material.material_name,
      previous_stock: oldStock,
      new_stock: newStockVal,
      quantity_change: -usedStock,
      change_type: "order_deduction",
      notes: `Pesanan: ${productName}${variantNames ? " (" + variantNames + ")" : ""} × ${quantity}`,
    });
  }
};
