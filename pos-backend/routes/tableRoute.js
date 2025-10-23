const express = require("express");
const { addTable, getTables, updateTable, deleteTable, getTableStats, updateSeatStatus } = require("../controllers/tableController");
const router = express.Router();
const { isVerifiedUser } = require("../middlewares/tokenVerification")

router.route("/").post(isVerifiedUser, addTable);
router.route("/").get(isVerifiedUser, getTables);
router.route("/stats").get(isVerifiedUser, getTableStats);
router.route("/seat-status").put(isVerifiedUser, updateSeatStatus);
router.route("/:id").put(isVerifiedUser, updateTable);
router.route("/:id").delete(isVerifiedUser, deleteTable);

module.exports = router;