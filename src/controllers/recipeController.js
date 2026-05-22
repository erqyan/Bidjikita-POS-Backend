const Recipe = require(
  "../models/Recipe"
);

const RecipeDetail = require(
  "../models/RecipeDetail"
);

const Product = require(
  "../models/Product"
);

const ProductVariant = require(
  "../models/ProductVariant"
);

const RawMaterial = require(
  "../models/RawMaterial"
);

// reusable include
const recipeInclude = [
  {
    model: Product,

    attributes: [
      "id",
      "product_name",
    ],
  },

  {
    model: ProductVariant,

    attributes: [
      "id",
      "variant_name",
    ],
  },

  {
    model: RecipeDetail,

    attributes: [
      "id",
      "quantity",
    ],

    include: [
      {
        model: RawMaterial,

        attributes: [
          "id",
          "material_name",
          "unit",
          "stock",
        ],
      },
    ],
  },
];

// CREATE RECIPE
exports.createRecipe = async (
  req,
  res
) => {
  try {

    const {
      recipe_name,
      product_id,
      variant_id,
      materials,
    } = req.body;

    // validation
    if (
      !recipe_name ||
      !product_id ||
      !materials ||
      materials.length === 0
    ) {
      return res.status(400).json({
        message:
          "Incomplete recipe data",
      });
    }

    // check product
    const product =
      await Product.findByPk(
        product_id
      );

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    // check variant
    if (variant_id) {

      const variant =
        await ProductVariant.findByPk(
          variant_id
        );

      if (!variant) {
        return res.status(404).json({
          message:
            "Variant not found",
        });
      }
    }

    // create recipe
    const recipe =
      await Recipe.create({
        recipe_name,
        product_id,
        variant_id:
          variant_id || null,
      });

    // create recipe details
    for (const material of materials) {

      const rawMaterial =
        await RawMaterial.findByPk(
          material.raw_material_id
        );

      if (!rawMaterial) {
        return res.status(404).json({
          message:
            "Raw material not found",
        });
      }

      await RecipeDetail.create({
        recipe_id:
          recipe.id,

        raw_material_id:
          material.raw_material_id,

        quantity:
          material.quantity,
      });
    }

    // get result
    const result =
      await Recipe.findByPk(
        recipe.id,
        {
          attributes: [
            "id",
            "recipe_name",
            "createdAt",
          ],

          include:
            recipeInclude,
        }
      );

    res.status(201).json(
      result
    );

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message:
        error.message,
    });

  }
};

// GET ALL RECIPES
exports.getRecipes =
  async (req, res) => {
    try {

      const recipes =
        await Recipe.findAll({
          attributes: [
            "id",
            "recipe_name",
            "createdAt",
          ],

          include:
            recipeInclude,

          order: [
            ["createdAt", "DESC"],
          ],
        });

      res.json(recipes);

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// GET RECIPE BY ID
exports.getRecipeById =
  async (req, res) => {
    try {

      const recipe =
        await Recipe.findByPk(
          req.params.id,
          {
            attributes: [
              "id",
              "recipe_name",
              "createdAt",
            ],

            include:
              recipeInclude,
          }
        );

      if (!recipe) {
        return res.status(404).json({
          message:
            "Recipe not found",
        });
      }

      res.json(recipe);

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// DELETE RECIPE
exports.deleteRecipe =
  async (req, res) => {
    try {

      const recipe =
        await Recipe.findByPk(
          req.params.id
        );

      if (!recipe) {
        return res.status(404).json({
          message:
            "Recipe not found",
        });
      }

      // delete recipe details
      await RecipeDetail.destroy({
        where: {
          recipe_id:
            recipe.id,
        },
      });

      // delete recipe
      await recipe.destroy();

      res.json({
        message:
          "Recipe deleted successfully",
      });

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

  // UPDATE RECIPE
exports.updateRecipe = async (
  req,
  res
) => {
  try {

    const recipe =
      await Recipe.findByPk(
        req.params.id
      );

    if (!recipe) {
      return res.status(404).json({
        message:
          "Recipe not found",
      });
    }

    const {
      recipe_name,
      product_id,
      variant_id,
      materials,
    } = req.body;

    // VALIDATION
    if (
      !recipe_name ||
      !product_id ||
      !materials ||
      materials.length === 0
    ) {
      return res.status(400).json({
        message:
          "Incomplete recipe data",
      });
    }

    // CHECK PRODUCT
    const product =
      await Product.findByPk(
        product_id
      );

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    // CHECK VARIANT
    if (variant_id) {

      const variant =
        await ProductVariant.findByPk(
          variant_id
        );

      if (!variant) {
        return res.status(404).json({
          message:
            "Variant not found",
        });
      }
    }

    // UPDATE RECIPE
    await recipe.update({
      recipe_name,
      product_id,
      variant_id:
        variant_id || null,
    });

    // DELETE OLD DETAILS
    await RecipeDetail.destroy({
      where: {
        recipe_id:
          recipe.id,
      },
    });

    // INSERT NEW DETAILS
    for (const material of materials) {

      const rawMaterial =
        await RawMaterial.findByPk(
          material.raw_material_id
        );

      if (!rawMaterial) {
        return res.status(404).json({
          message:
            "Raw material not found",
        });
      }

      await RecipeDetail.create({
        recipe_id:
          recipe.id,

        raw_material_id:
          material.raw_material_id,

        quantity:
          material.quantity,
      });
    }

    // GET UPDATED RESULT
    const updatedRecipe =
      await Recipe.findByPk(
        recipe.id,
        {
          attributes: [
            "id",
            "recipe_name",
            "createdAt",
            "updatedAt",
          ],

          include:
            recipeInclude,
        }
      );

    res.json({
      message:
        "Recipe updated successfully",

      data:
        updatedRecipe,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message:
        error.message,
    });

  }
};