const Bundle = require("../models/Bundle");
const BundleItem = require("../models/BundleItem");
const Product = require("../models/Product");

// =============================================
// CREATE BUNDLE
// =============================================
exports.createBundle = async (req, res) => {
  try {
    const {
      bundle_name,
      description,
      bundle_price,
      items, // [{product_id, quantity}, ...]
    } = req.body;

    // Validate inputs
    if (!bundle_name || !bundle_price || !items || items.length === 0) {
      return res.status(400).json({
        message: "bundle_name, bundle_price, and items are required",
      });
    }

    // Check duplicate bundle name
    const existingBundle = await Bundle.findOne({
      where: { bundle_name },
    });

    if (existingBundle) {
      return res.status(400).json({
        message: "Bundle name already exists",
      });
    }

    // Validate all products exist and calculate total cost
    let totalBundleCost = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) {
        return res.status(404).json({
          message: `Product ${item.product_id} not found`,
        });
      }
      const productCost = (product.base_cost || 0) * item.quantity;
      totalBundleCost += productCost;
    }

    // Create bundle
    const bundle = await Bundle.create({
      bundle_name,
      description,
      bundle_price,
      total_bundle_cost: totalBundleCost,
      bundle_profit: bundle_price - totalBundleCost,
    });

    // Add items to bundle
    for (const item of items) {
      await BundleItem.create({
        bundle_id: bundle.id,
        product_id: item.product_id,
        quantity: item.quantity,
      });
    }

    // Fetch complete bundle with items
    const completeBundle = await Bundle.findByPk(bundle.id, {
      include: {
        model: BundleItem,
        include: Product,
      },
    });

    res.status(201).json(completeBundle);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error,
    });
  }
};

// =============================================
// GET ALL BUNDLES
// =============================================
exports.getBundles = async (req, res) => {
  try {
    const bundles = await Bundle.findAll({
      include: {
        model: BundleItem,
        include: {
          model: Product,
          attributes: ["id", "product_name", "base_cost", "selling_price"],
        },
      },
      where: { is_active: true },
    });

    res.json(bundles);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error,
    });
  }
};

// =============================================
// GET BUNDLE BY ID
// =============================================
exports.getBundleById = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id, {
      include: {
        model: BundleItem,
        include: {
          model: Product,
          attributes: ["id", "product_name", "base_cost", "selling_price"],
        },
      },
    });

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    res.json(bundle);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error,
    });
  }
};

// =============================================
// UPDATE BUNDLE
// =============================================
exports.updateBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id);

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    const {
      bundle_name,
      description,
      bundle_price,
      items, // [{product_id, quantity}, ...]
    } = req.body;

    // Check duplicate bundle name (if changing)
    if (bundle_name && bundle_name !== bundle.bundle_name) {
      const existingBundle = await Bundle.findOne({
        where: { bundle_name },
      });
      if (existingBundle) {
        return res.status(400).json({
          message: "Bundle name already exists",
        });
      }
    }

    let totalBundleCost = 0;

    // If items provided, recalculate cost
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findByPk(item.product_id);
        if (!product) {
          return res.status(404).json({
            message: `Product ${item.product_id} not found`,
          });
        }
        const productCost = (product.base_cost || 0) * item.quantity;
        totalBundleCost += productCost;
      }

      // Remove old items
      await BundleItem.destroy({
        where: { bundle_id: bundle.id },
      });

      // Add new items
      for (const item of items) {
        await BundleItem.create({
          bundle_id: bundle.id,
          product_id: item.product_id,
          quantity: item.quantity,
        });
      }
    } else {
      // Recalculate with existing items
      const existingItems = await BundleItem.findAll({
        where: { bundle_id: bundle.id },
        include: Product,
      });

      for (const bundleItem of existingItems) {
        const productCost = (bundleItem.Product.base_cost || 0) * bundleItem.quantity;
        totalBundleCost += productCost;
      }
    }

    // Update bundle
    await bundle.update({
      bundle_name: bundle_name || bundle.bundle_name,
      description: description !== undefined ? description : bundle.description,
      bundle_price: bundle_price || bundle.bundle_price,
      total_bundle_cost: totalBundleCost,
      bundle_profit: (bundle_price || bundle.bundle_price) - totalBundleCost,
    });

    // Fetch updated bundle with items
    const updatedBundle = await Bundle.findByPk(bundle.id, {
      include: {
        model: BundleItem,
        include: Product,
      },
    });

    res.json(updatedBundle);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error,
    });
  }
};

// =============================================
// DELETE BUNDLE
// =============================================
exports.deleteBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id);

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    await bundle.destroy();

    res.json({
      message: "Bundle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error,
    });
  }
};

// =============================================
// GET ALL BUNDLES (including inactive)
// =============================================
exports.getAllBundles = async (req, res) => {
  try {
    const bundles = await Bundle.findAll({
      include: {
        model: BundleItem,
        include: {
          model: Product,
          attributes: ["id", "product_name", "base_cost", "selling_price"],
        },
      },
    });

    res.json(bundles);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error,
    });
  }
};
