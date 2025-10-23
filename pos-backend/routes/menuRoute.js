const express = require("express");
const {
  createMenuItem,
  getMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  getMenuStats
} = require("../controllers/menuController");
const { upload } = require("../config/cloudinary");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const router = express.Router();

// Public routes (no authentication required for viewing menu)
router.route("/").get(getMenuItems);
router.route("/categories").get(getCategories);
router.route("/stats").get(isVerifiedUser, getMenuStats);
router.route("/:id").get(getMenuItemById);

// Protected routes (authentication required for CRUD operations)
router.route("/").post(isVerifiedUser, upload.single('image'), createMenuItem);
router.route("/:id").put(isVerifiedUser, upload.single('image'), updateMenuItem);
router.route("/:id").delete(isVerifiedUser, deleteMenuItem);

module.exports = router;
