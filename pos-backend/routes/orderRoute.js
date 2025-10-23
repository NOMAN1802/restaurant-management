const express = require("express");
const { addOrder, getOrders, getOrderById, updateOrder, cancelOrder, deleteOrder, getOrderStats, addItemToOrder, updateOrderItems } = require("../controllers/orderController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const router = express.Router();


router.route("/").post(isVerifiedUser, addOrder);
router.route("/").get(isVerifiedUser, getOrders);
router.route("/stats").get(isVerifiedUser, getOrderStats);
router.route("/:id").get(isVerifiedUser, getOrderById);
router.route("/:id").put(isVerifiedUser, updateOrder);
router.route("/:id").patch(isVerifiedUser, updateOrderItems);
router.route("/:id/cancel").delete(isVerifiedUser, cancelOrder);
router.route("/:id").delete(isVerifiedUser, deleteOrder);
router.route("/:id/items").put(isVerifiedUser, addItemToOrder);

module.exports = router;