const RawMaterial = require(
  "../models/RawMaterial"
);

const RecipeDetail = require(
  "../models/RecipeDetail"
);

const Recipe = require(
  "../models/Recipe"
);

// CREATE RAW MATERIAL
exports.createRawMaterial =
  async (req, res) => {
    try {

      const {
        material_name,
        unit,
        stock,
        minimum_stock,
      } = req.body;

      // validation
      if (
        !material_name ||
        !unit
      ) {
        return res.status(400).json({
          message:
            "Material name and unit are required",
        });
      }

      // duplicate check
      const existingMaterial =
        await RawMaterial.findOne({
          where: {
            material_name,
          },
        });

      if (existingMaterial) {
        return res.status(400).json({
          message:
            "Material already exists",
        });
      }

      // create
      const material =
        await RawMaterial.create({
          material_name,
          unit,
          stock:
            stock || 0,
          minimum_stock:
            minimum_stock || 0,
        });

      res.status(201).json({
        message:
          "Material created successfully",

        data: material,
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// GET ALL MATERIALS
exports.getRawMaterials =
  async (req, res) => {
    try {

      const materials =
        await RawMaterial.findAll({
          attributes: [
            "id",
            "material_name",
            "unit",
            "stock",
            "minimum_stock",
            "createdAt",
            "updatedAt",
          ],

          order: [
            ["createdAt", "DESC"],
          ],
        });

      res.json(materials);

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// GET MATERIAL BY ID
exports.getRawMaterialById =
  async (req, res) => {
    try {

      const material =
        await RawMaterial.findByPk(
          req.params.id,
          {
            attributes: [
              "id",
              "material_name",
              "unit",
              "stock",
              "minimum_stock",
              "createdAt",
              "updatedAt",
            ],
          }
        );

      if (!material) {
        return res.status(404).json({
          message:
            "Material not found",
        });
      }

      res.json(material);

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// UPDATE MATERIAL
exports.updateRawMaterial =
  async (req, res) => {
    try {

      const material =
        await RawMaterial.findByPk(
          req.params.id
        );

      if (!material) {
        return res.status(404).json({
          message:
            "Material not found",
        });
      }

      const {
        material_name,
        unit,
        stock,
        minimum_stock,
      } = req.body;

      // duplicate name check
      if (
        material_name &&
        material_name !==
          material.material_name
      ) {

        const existingMaterial =
          await RawMaterial.findOne({
            where: {
              material_name,
            },
          });

        if (existingMaterial) {
          return res.status(400).json({
            message:
              "Material name already exists",
          });
        }
      }

      // update
      await material.update({
        material_name,
        unit,
        stock,
        minimum_stock,
      });

      res.json({
        message:
          "Material updated successfully",

        data: material,
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          error.message,
      });

    }
  };

// DELETE MATERIAL
exports.deleteRawMaterial =
  async (req, res) => {
    try {

      const material =
        await RawMaterial.findByPk(
          req.params.id
        );

      if (!material) {
        return res.status(404).json({
          message:
            "Material not found",
        });
      }

      // CHECK RECIPE USAGE
      const recipeUsage =
        await RecipeDetail.findOne({
          where: {
            raw_material_id:
              material.id,
          },

          include: [
            {
              model: Recipe,
              attributes: [
                "id",
                "recipe_name",
              ],
            },
          ],
        });

      // IF USED IN RECIPE
      if (recipeUsage) {

        return res.status(400).json({
          message:
            "Cannot delete material because it is used in recipe",

          recipe:
            recipeUsage.Recipe
              ?.recipe_name ||
            null,
        });
      }

      // DELETE MATERIAL
      await material.destroy();

      res.json({
        message:
          "Material deleted successfully",
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          error.message,
      });

    }
  };