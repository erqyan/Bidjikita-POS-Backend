const Category = require("../models/Category");
const Product = require("../models/Product");

exports.createCategory = async (
  req,
  res
) => {
  try {

    const {
      category_name,
      description,
    } = req.body;

    // cek duplicate category
    const existingCategory =
      await Category.findOne({
        where: {
          category_name,
        },
      });

    if (existingCategory) {
      return res.status(400).json({
        message:
          "Category already exists",
      });
    }

    const category =
      await Category.create({
        category_name,
        description,
      });

    res.status(201).json(category);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.getCategories = async (req, res) => {
  try {

    const categories = await Category.findAll();

    res.json(categories);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.updateCategory = async (
  req,
  res
) => {
  try {

    const category =
      await Category.findByPk(
        req.params.id
      );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const {
      category_name,
      description,
    } = req.body;

    // cek duplicate category
    const existingCategory =
      await Category.findOne({
        where: {
          category_name,
        },
      });

    // jika ada category lain dengan nama sama
    if (
      existingCategory &&
      existingCategory.id !==
        category.id
    ) {
      return res.status(400).json({
        message:
          "Category already exists",
      });
    }

    await category.update({
      category_name,
      description,
    });

    res.json(category);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.deleteCategory = async (
  req,
  res
) => {
  try {

    const category =
      await Category.findByPk(
        req.params.id
      );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // cek apakah category dipakai product
    const productExists =
      await Product.findOne({
        where: {
          category_id: category.id,
        },
      });

    if (productExists) {
      return res.status(400).json({
        message:
          "Category is used by products and cannot be deleted",
      });
    }

    await category.destroy();

    res.json({
      message:
        "Category deleted successfully",
    });

  } catch (error) {

    res.status(500).json(error);

  }
};