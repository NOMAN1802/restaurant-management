const router = require("express").Router();
const {
    generateDailyReport,
    generateWeeklyReport,
    generateMonthlyReport
} = require("../controllers/reportController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");

// Generate daily report
router.get("/daily", isVerifiedUser, generateDailyReport);

// Generate weekly report
router.get("/weekly", isVerifiedUser, generateWeeklyReport);

// Generate monthly report
router.get("/monthly", isVerifiedUser, generateMonthlyReport);

module.exports = router;
