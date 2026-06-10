const ProductVariant = require(
  "../models/ProductVariant"
);

const Product = require(
  "../models/Product"
);

exports.createVariant = async (
  req,
  res
) => {
  try {

    const {
      product_id,
      variant_name,
      variant_type,
      additional_price,
    } = req.body;

    // cek product exists
    const product = await Product.findByPk(
      product_id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const variant =
      await ProductVariant.create({
        product_id,
        variant_name,
        variant_type,
        additional_price,
      });

    res.status(201).json(variant);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.getVariants = async (
  req,
  res
) => {
  try {

    const variants =
      await ProductVariant.findAll({
        include: Product,
      });

    res.json(variants);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.getVariantById = async (
  req,
  res
) => {
  try {

    const variant =
      await ProductVariant.findByPk(
        req.params.id,
        {
          include: Product,
        }
      );

    if (!variant) {
      return res.status(404).json({
        message: "Variant not found",
      });
    }

    res.json(variant);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.updateVariant = async (
  req,
  res
) => {
  try {

    const variant =
      await ProductVariant.findByPk(
        req.params.id
      );

    if (!variant) {
      return res.status(404).json({
        message: "Variant not found",
      });
    }

    await variant.update(req.body);

    res.json(variant);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.deleteVariant = async (
  req,
  res
) => {
  try {

    const variant =
      await ProductVariant.findByPk(
        req.params.id
      );

    if (!variant) {
      return res.status(404).json({
        message: "Variant not found",
      });
    }

    await variant.destroy();

    res.json({
      message: "Variant deleted",
    });

  } catch (error) {

    res.status(500).json(error);

  }
};