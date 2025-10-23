const router = require("express").Router();
const { processCashPayment, getSalesAnalytics } = require("../controllers/paymentController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");

router.post("/process-order-payment", isVerifiedUser, processCashPayment);

// Get sales analytics
router.get("/analytics", isVerifiedUser, getSalesAnalytics);

module.exports = router;