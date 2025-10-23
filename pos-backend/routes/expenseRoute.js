const router = require("express").Router();
const {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getExpenseStats,
    calculateRevenue,
    getFinancialOverview
} = require("../controllers/expenseController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");

// Create expense
router.post("/", isVerifiedUser, createExpense);

// Test endpoint without authentication (temporary for debugging)
router.post("/test", createExpense);

// Get all expenses with filtering
router.get("/", isVerifiedUser, getAllExpenses);

// Get expense statistics
router.get("/stats", isVerifiedUser, getExpenseStats);

// Calculate revenue
router.get("/revenue", isVerifiedUser, calculateRevenue);

// Get financial overview
router.get("/financial-overview", isVerifiedUser, getFinancialOverview);

// Get expense by ID
router.get("/:id", isVerifiedUser, getExpenseById);

// Update expense
router.put("/:id", isVerifiedUser, updateExpense);

// Soft delete expense
router.delete("/:id", isVerifiedUser, deleteExpense);

module.exports = router;
