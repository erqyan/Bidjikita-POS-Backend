const Recipe = require(
  "../models/Recipe"
);

const RecipeDetail = require(
  "../models/RecipeDetail"
);

const RawMaterial = require(
  "../models/RawMaterial"
);

exports.reduceStock = async (
  product_id,
  variant_id,
  quantity
) => {

  const recipe = await Recipe.findOne({
    where: {
      product_id,
      variant_id,
    },
  });

  if (!recipe) {
    throw new Error(
      "Recipe not found"
    );
  }

  const recipeDetails =
    await RecipeDetail.findAll({
      where: {
        recipe_id: recipe.id,
      },
      include: RawMaterial,
    });

  for (const detail of recipeDetails) {

    const material =
      detail.RawMaterial;

    const usedStock =
      Number(detail.quantity) *
      quantity;

    if (
      Number(material.stock) <
      usedStock
    ) {
      throw new Error(
        `${material.material_name} stock is not enough`
      );
    }

    await material.update({
      stock:
        Number(material.stock) -
        usedStock,
    });
  }
};