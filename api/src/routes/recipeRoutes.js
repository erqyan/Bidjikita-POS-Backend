const express = require(
  "express"
);

const router =
  express.Router();

const recipeController =
  require(
    "../controllers/recipeController"
  );

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const adminMiddleware =
  require(
    "../middleware/adminMiddleware"
  );

// CREATE RECIPE
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  recipeController.createRecipe
);

// GET ALL RECIPES
router.get(
  "/",
  authMiddleware,
  recipeController.getRecipes
);

// GET RECIPE BY ID
router.get(
  "/:id",
  authMiddleware,
  recipeController.getRecipeById
);

// DELETE RECIPE
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  recipeController.deleteRecipe
);

// UPDATE RECIPE
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  recipeController.updateRecipe
);

module.exports =
  router;