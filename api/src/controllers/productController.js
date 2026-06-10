const Product = require("../models/Product");
const Category = require("../models/Category");
const ProductVariant = require("../models/ProductVariant");

// Helper: derive profit_margin from selling_price and total_cost
function calcProfitMargin(selling_price, base_cost, overhead_cost) {
  const total = parseFloat(base_cost || 0) + parseFloat(overhead_cost || 0);
  const sp = parseFloat(selling_price || 0);
  if (sp <= 0) return 0;
  return parseFloat((((sp - total) / sp) * 100).toFixed(2));
}

// CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const {
      category_id,
      product_name,
      description,
      base_price,
      overhead_cost,
      selling_price,
      image_url,
      status,
    } = req.body;

    const category = await Category.findByPk(category_id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const existing = await Product.findOne({ where: { product_name } });
    if (existing)
      return res.status(400).json({ message: "Product already exists" });

    const overheadVal = parseFloat(overhead_cost || 0);
    const baseCostVal = 0; // will be set when recipe is created
    const sellingPriceVal = parseFloat(selling_price || base_price || 0);

    const product = await Product.create({
      category_id,
      product_name,
      description,
      base_price: base_price || selling_price || 0,
      base_cost: baseCostVal,
      overhead_cost: overheadVal,
      selling_price: sellingPriceVal,
      profit_margin: calcProfitMargin(
        sellingPriceVal,
        baseCostVal,
        overheadVal,
      ),
      image_url,
      status: status || "available",
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Category }],
      order: [["product_name", "ASC"]],
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET PRODUCT BY ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }],
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const {
      category_id,
      product_name,
      description,
      base_price,
      overhead_cost,
      selling_price,
      image_url,
      status,
    } = req.body;

    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });
    }

    if (product_name && product_name !== product.product_name) {
      const existing = await Product.findOne({ where: { product_name } });
      if (existing && existing.id !== product.id) {
        return res.status(400).json({ message: "Product name already exists" });
      }
    }

    const newOverhead =
      overhead_cost !== undefined
        ? parseFloat(overhead_cost)
        : parseFloat(product.overhead_cost);
    const newSelling =
      selling_price !== undefined
        ? parseFloat(selling_price)
        : parseFloat(product.selling_price);

    await product.update({
      category_id: category_id ?? product.category_id,
      product_name: product_name ?? product.product_name,
      description:
        description !== undefined ? description : product.description,
      base_price: base_price ?? selling_price ?? product.base_price,
      overhead_cost: newOverhead,
      selling_price: newSelling,
      profit_margin: calcProfitMargin(
        newSelling,
        product.base_cost,
        newOverhead,
      ),
      image_url: image_url !== undefined ? image_url : product.image_url,
      status: status ?? product.status,
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variantExists = await ProductVariant.findOne({
      where: { product_id: product.id },
    });
    if (variantExists) {
      return res.status(400).json({
        message: "Product has variants – delete variants first",
      });
    }

    await product.destroy();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT OVERHEAD / SELLING PRICE  (recalculates margin)
exports.updateProductPricing = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { overhead_cost, selling_price } = req.body;

    const newOverhead =
      overhead_cost !== undefined
        ? parseFloat(overhead_cost)
        : parseFloat(product.overhead_cost);
    const newSelling =
      selling_price !== undefined
        ? parseFloat(selling_price)
        : parseFloat(product.selling_price);

    await product.update({
      overhead_cost: newOverhead,
      selling_price: newSelling,
      base_price: newSelling,
      profit_margin: calcProfitMargin(
        newSelling,
        product.base_cost,
        newOverhead,
      ),
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
