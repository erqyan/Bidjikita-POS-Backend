const Product = require("../models/Product");
const Category = require("../models/Category");
const ProductVariant = require("../models/ProductVariant");

// CREATE PRODUCT
exports.createProduct = async (
  req,
  res
) => {
  try {

    const {
      category_id,
      product_name,
      description,
      base_price,
      image_url,
      status,
    } = req.body;

    // cek category exists
    const category =
      await Category.findByPk(
        category_id
      );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // cek duplicate product
    const existingProduct =
      await Product.findOne({
        where: {
          product_name,
        },
      });

    if (existingProduct) {
      return res.status(400).json({
        message:
          "Product already exists",
      });
    }

    const product =
      await Product.create({
        category_id,
        product_name,
        description,
        base_price,
        image_url,
        status,
      });

    res.status(201).json(product);

  } catch (error) {

    res.status(500).json(error);

  }
};

// GET ALL PRODUCTS
exports.getProducts = async (
  req,
  res
) => {
  try {

    const products =
      await Product.findAll({
        include: Category,
      });

    res.json(products);

  } catch (error) {

    res.status(500).json(error);

  }
};

// GET PRODUCT BY ID
exports.getProductById = async (
  req,
  res
) => {
  try {

    const product =
      await Product.findByPk(
        req.params.id,
        {
          include: Category,
        }
      );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);

  } catch (error) {

    res.status(500).json(error);

  }
};

// UPDATE PRODUCT
exports.updateProduct = async (
  req,
  res
) => {
  try {

    const product =
      await Product.findByPk(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const {
      category_id,
      product_name,
      description,
      base_price,
      image_url,
      status,
    } = req.body;

    // cek category exists
    const category =
      await Category.findByPk(
        category_id
      );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // cek duplicate product
    const existingProduct =
      await Product.findOne({
        where: {
          product_name,
        },
      });

    if (
      existingProduct &&
      existingProduct.id !== product.id
    ) {
      return res.status(400).json({
        message:
          "Product already exists",
      });
    }

    await product.update({
      category_id,
      product_name,
      description,
      base_price,
      image_url,
      status,
    });

    res.json(product);

  } catch (error) {

    res.status(500).json(error);

  }
};

// DELETE PRODUCT
exports.deleteProduct = async (
  req,
  res
) => {
  try {

    const product =
      await Product.findByPk(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // cek variant exists
    const variantExists =
      await ProductVariant.findOne({
        where: {
          product_id: product.id,
        },
      });

    if (variantExists) {
      return res.status(400).json({
        message:
          "Product is used by variants and cannot be deleted",
      });
    }

    await product.destroy();

    res.json({
      message:
        "Product deleted successfully",
    });

  } catch (error) {

    res.status(500).json(error);

  }
};