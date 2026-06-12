const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.use(authMiddleware, adminMiddleware);

router.get("/summary", analyticsController.getSummary);
router.get("/revenue", analyticsController.getRevenueTrend);
router.get("/top-products", analyticsController.getTopProducts);
router.get("/payment-methods", analyticsController.getPaymentMethodStats);
router.get("/low-stock", analyticsController.getLowStockMaterials);
router.get("/profit", analyticsController.getProfitTrend);
router.get("/financial-report", analyticsController.getFinancialReport);

module.exports = router;
