import prisma from '../lib/prisma';

/**
 * Deducts raw material stock for one order line — batched in a single transaction.
 */
export async function reduceStock(product_id: number, variantIds: number[], quantity: number): Promise<void> {
  const ids = [...(Array.isArray(variantIds) ? variantIds : [])];

  if (ids.length === 0) {
    const defaultVariant = await prisma.productVariant.findFirst({
      where: { product_id },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (!defaultVariant) throw new Error('No variant found for product ' + product_id);
    ids.push(defaultVariant.id);
  }

  // Single query: all ingredients with raw materials for all variants at once
  const ingredients = await prisma.variantIngredient.findMany({
    where: { variant_id: { in: ids } },
    include: { rawMaterial: { select: { id: true, material_name: true, unit: true, stock: true } } },
  });

  if (ingredients.length === 0) {
    throw new Error('No ingredients found for variant(s) ' + ids.join(', '));
  }

  // Aggregate quantity per raw material
  const usageMap = new Map<number, { used: number; name: string; unit: string; stock: number }>();
  for (const ing of ingredients) {
    const rm = ing.rawMaterial;
    const existing = usageMap.get(rm.id);
    const qty = Number(ing.quantity);
    if (existing) {
      existing.used += qty * quantity;
    } else {
      usageMap.set(rm.id, {
        used: qty * quantity,
        name: rm.material_name,
        unit: rm.unit,
        stock: Number(rm.stock),
      });
    }
  }

  // Check stock before updating
  for (const [id, data] of usageMap) {
    if (data.stock < data.used) {
      throw new Error(
        'Insufficient stock for "' + data.name + '" (need ' + data.used + ' ' + data.unit + ', have ' + data.stock + ')',
      );
    }
  }

  // Batch all updates in a single transaction
  await prisma.$transaction(
    Array.from(usageMap.entries()).map(([rawMaterialId, data]) => {
      return prisma.rawMaterial.update({
        where: { id: rawMaterialId },
        data: { stock: data.stock - data.used },
      });
    }),
  );
}
