const express = require("express");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { applyCoupon, createCoupon, getCoupons, updateCoupon, deleteCoupon } = require("../controllers/couponController");
const router = express.Router();

router.post("/apply-coupon", isVerifiedUser, applyCoupon);
router.post("/create-coupon", isVerifiedUser, createCoupon);
router.get("/coupons", isVerifiedUser, getCoupons);
router.put("/update-coupon/:id", isVerifiedUser, updateCoupon);
router.delete("/delete-coupon/:id", isVerifiedUser, deleteCoupon);

module.exports = router;