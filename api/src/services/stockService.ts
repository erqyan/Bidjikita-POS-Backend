import prisma from '../lib/prisma';

/**
 * Deducts raw material stock for one order line.
 *
 * Each selected variant directly owns its ingredient list (VariantIngredient).
 * We sum up the quantities across all selected variants, multiply by order quantity,
 * and deduct from each RawMaterial's stock.
 */
export async function reduceStock(product_id: number, variantIds: number[], quantity: number): Promise<void> {
  const ids = Array.isArray(variantIds) ? variantIds : [];

  // Look up product name for the log
  const product = await prisma.product.findUnique({
    where: { id: product_id },
    select: { product_name: true },
  });
  const productName = product?.product_name || `Product #${product_id}`;

  if (ids.length === 0) {
    // No variant selected — find the default variant for this product
    const defaultVariant = await prisma.productVariant.findFirst({
      where: { product_id },
      orderBy: { id: 'asc' },
    });
    if (defaultVariant) {
      ids.push(defaultVariant.id);
    } else {
      throw new Error(`No variant found for product ${product_id}`);
    }
  }

  // Load variant names for the log
  const variantModels = await prisma.productVariant.findMany({
    where: { id: { in: ids } },
    select: { variant_name: true },
  });
  const variantNames = variantModels.map((v) => v.variant_name).filter(Boolean).join(', ');

  // Load all ingredients for all selected variants
  const ingredients = await prisma.variantIngredient.findMany({
    where: { variant_id: { in: ids } },
    include: { rawMaterial: true },
  });

  if (ingredients.length === 0) {
    throw new Error(`No ingredients found for variant(s) ${ids.join(', ')}`);
  }

  // Aggregate quantity per raw material
  const usageMap: Record<number, number> = {};
  for (const ing of ingredients) {
    usageMap[ing.raw_material_id] = (usageMap[ing.raw_material_id] || 0) + Number(ing.quantity);
  }

  // Deduct stock for each raw material
  for (const [rawMaterialIdStr, perServingQty] of Object.entries(usageMap)) {
    const rawMaterialId = Number(rawMaterialIdStr);
    const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    if (!material) {
      throw new Error(`Raw material ${rawMaterialId} not found`);
    }

    const usedStock = perServingQty * quantity;
    const currentStock = Number(material.stock);

    if (currentStock < usedStock) {
      throw new Error(
        `Insufficient stock for "${material.material_name}" (need ${usedStock} ${material.unit}, have ${currentStock})`,
      );
    }

    const oldStock = currentStock;
    const newStockVal = oldStock - usedStock;

    await prisma.rawMaterial.update({
      where: { id: rawMaterialId },
      data: { stock: newStockVal },
    });

    // Log the deduction
    await prisma.ingredientLog.create({
      data: {
        raw_material_id: material.id,
        material_name: material.material_name,
        previous_stock: oldStock,
        new_stock: newStockVal,
        quantity_change: -usedStock,
        change_type: 'order_deduction',
        notes: `Pesanan: ${productName}${variantNames ? ' (' + variantNames + ')' : ''} × ${quantity}`,
      },
    });
  }
}
