const createHttpError = require("http-errors");
const Expense = require("../models/expenseModel");
const Payment = require("../models/paymentModel");
const { default: mongoose } = require("mongoose");

// Create a new expense
const createExpense = async (req, res, next) => {
    try {
        console.log('Creating expense with data:', req.body);
        console.log('User from middleware:', req.user ? req.user._id : 'No user found');

        const { title, amount, amountPerUnit, category, description } = req.body;

        // Validate required fields
        if (!title || !amount || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, amount, and category are required fields"
            });
        }

        // Calculate totalAmount
        let totalAmount;
        if (amountPerUnit && amountPerUnit > 0) {
            totalAmount = amount * amountPerUnit;
        } else {
            totalAmount = amount;
        }

        const expense = new Expense({
            title,
            amount,
            amountPerUnit,
            category,
            description,
            totalAmount
        });

        await expense.save();
        console.log('Expense saved successfully:', expense._id);

        // Send notification to admin and relevant roles
        const notificationData = {
            type: 'NEW_EXPENSE',
            expense: expense,
            message: `New expense "${title}" added - Amount: ৳${expense.totalAmount}`,
            timestamp: new Date(),
            category: expense.categoryDisplay
        };

        // Log expense creation
        console.log(`New expense created: ${expense._id}`);

        res.status(201).json({
            success: true,
            message: "Expense created successfully!",
            data: expense
        });
    } catch (error) {
        console.error('Error in createExpense:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors
            });
        }
        next(error);
    }
};

// Get all expenses with filtering
const getAllExpenses = async (req, res, next) => {
    try {
        const {
            category,
            startDate,
            endDate,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { isDeleted: false };

        if (category) {
            filter.category = category;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;

        const [expenses, totalExpenses] = await Promise.all([
            Expense.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Expense.countDocuments(filter)
        ]);

        // Calculate total amount for filtered expenses
        const totalAmount = await Expense.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalExpenses,
            pages: Math.ceil(totalExpenses / limit)
        };

        res.status(200).json({
            success: true,
            data: expenses,
            pagination,
            totalAmount: totalAmount[0]?.total || 0
        });
    } catch (error) {
        next(error);
    }
};

// Get expense by ID
const getExpenseById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(createHttpError(400, "Invalid expense ID"));
        }

        const expense = await Expense.findOne({ _id: id, isDeleted: false });

        if (!expense) {
            return next(createHttpError(404, "Expense not found"));
        }

        res.status(200).json({
            success: true,
            data: expense
        });
    } catch (error) {
        next(error);
    }
};

// Update expense
const updateExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, amount, amountPerUnit, category, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(createHttpError(400, "Invalid expense ID"));
        }

        const updatedExpense = await Expense.findOneAndUpdate(
            { _id: id, isDeleted: false },
            {
                $set: {
                    title,
                    amount,
                    amountPerUnit,
                    category,
                    description
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedExpense) {
            return next(createHttpError(404, "Expense not found"));
        }

        // Send notification
        const notificationData = {
            type: 'EXPENSE_UPDATED',
            expense: updatedExpense,
            message: `Expense "${updatedExpense.title}" updated - Amount: ৳${updatedExpense.totalAmount}`,
            timestamp: new Date(),
            category: updatedExpense.categoryDisplay
        };

        // Log expense update
        console.log(`Expense updated: ${updatedExpense._id}`);

        res.status(200).json({
            success: true,
            message: "Expense updated successfully!",
            data: updatedExpense
        });
    } catch (error) {
        next(error);
    }
};

// Soft delete expense
const deleteExpense = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(createHttpError(400, "Invalid expense ID"));
        }

        const deletedExpense = await Expense.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $set: { isDeleted: true } },
            { new: true }
        );

        if (!deletedExpense) {
            return next(createHttpError(404, "Expense not found"));
        }

        // Send notification
        const notificationData = {
            type: 'EXPENSE_DELETED',
            expense: deletedExpense,
            message: `Expense "${deletedExpense.title}" deleted`,
            timestamp: new Date(),
            category: deletedExpense.categoryDisplay
        };

        // Log expense deletion
        console.log(`Expense deleted: ${deletedExpense._id}`);

        res.status(200).json({
            success: true,
            message: "Expense deleted successfully!"
        });
    } catch (error) {
        next(error);
    }
};

// Get expense statistics
const getExpenseStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        // Build date filter
        const dateFilter = { isDeleted: false };
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                dateFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.createdAt.$lte = new Date(endDate);
            }
        }

        const stats = await Expense.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$category",
                    totalAmount: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                    avgAmount: { $avg: "$totalAmount" }
                }
            },
            {
                $project: {
                    category: "$_id",
                    totalAmount: 1,
                    count: 1,
                    avgAmount: { $round: ["$avgAmount", 2] },
                    _id: 0
                }
            }
        ]);

        // Get total expenses
        const totalExpenses = await Expense.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                categoryStats: stats,
                totalExpenses: totalExpenses[0]?.total || 0,
                totalCount: totalExpenses[0]?.count || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

// Calculate current revenue (Total Payments - Total Expenses)
const calculateRevenue = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                dateFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.createdAt.$lte = new Date(endDate);
            }
        }

        // Get total payments (revenue from sales)
        const totalPayments = await Payment.aggregate([
            {
                $match: {
                    status: "completed",
                    ...dateFilter
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        // Get total expenses
        const totalExpenses = await Expense.aggregate([
            {
                $match: {
                    isDeleted: false,
                    ...dateFilter
                }
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const totalRevenue = (totalPayments[0]?.total || 0);
        const totalExpenseAmount = (totalExpenses[0]?.total || 0);
        const netRevenue = totalRevenue - totalExpenseAmount;

        res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalExpenses: totalExpenseAmount,
                netRevenue,
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get comprehensive financial overview
const getFinancialOverview = async (req, res, next) => {
    try {
        const { period, startDate, endDate } = req.query;

        // Determine date range based on period
        let dateFilter = {};
        const now = new Date();

        if (period === 'daily') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter.createdAt = { $gte: startOfDay };
        } else if (period === 'weekly') {
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            dateFilter.createdAt = { $gte: startOfWeek };
        } else if (period === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter.createdAt = { $gte: startOfMonth };
        } else if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // Get sales data
        const salesStats = await Payment.aggregate([
            {
                $match: {
                    status: "completed",
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$amount" },
                    totalOrders: { $sum: 1 },
                    avgOrderValue: { $avg: "$amount" }
                }
            }
        ]);

        // Get expense data by category
        const expenseStats = await Expense.aggregate([
            {
                $match: {
                    isDeleted: false,
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: "$category",
                    totalAmount: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                    avgAmount: { $avg: "$totalAmount" }
                }
            }
        ]);

        // Get total expenses
        const totalExpenseStats = await Expense.aggregate([
            {
                $match: {
                    isDeleted: false,
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: "$totalAmount" },
                    expenseCount: { $sum: 1 }
                }
            }
        ]);

        // Get time-series data for charts (sales)
        const salesChartData = await Payment.aggregate([
            {
                $match: {
                    status: "completed",
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                        hour: period === 'daily' ? { $hour: "$createdAt" } : null
                    },
                    sales: { $sum: "$amount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
        ]);

        // Get time-series data for expenses
        const expenseChartData = await Expense.aggregate([
            {
                $match: {
                    isDeleted: false,
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                        hour: period === 'daily' ? { $hour: "$createdAt" } : null
                    },
                    expenses: { $sum: "$totalAmount" },
                    expenseCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
        ]);

        // Merge sales and expense data
        const chartData = salesChartData.map(salesItem => {
            // Find corresponding expense data for the same time period
            const expenseItem = expenseChartData.find(exp =>
                exp._id.year === salesItem._id.year &&
                exp._id.month === salesItem._id.month &&
                exp._id.day === salesItem._id.day &&
                (period === 'daily' ? exp._id.hour === salesItem._id.hour : true)
            );

            return {
                _id: salesItem._id,
                sales: salesItem.sales,
                orders: salesItem.orders,
                expenses: expenseItem?.expenses || 0,
                expenseCount: expenseItem?.expenseCount || 0
            };
        });

        // Add expense-only periods (where there are expenses but no sales)
        expenseChartData.forEach(expenseItem => {
            const existingSalesItem = salesChartData.find(sales =>
                sales._id.year === expenseItem._id.year &&
                sales._id.month === expenseItem._id.month &&
                sales._id.day === expenseItem._id.day &&
                (period === 'daily' ? sales._id.hour === expenseItem._id.hour : true)
            );

            if (!existingSalesItem) {
                chartData.push({
                    _id: expenseItem._id,
                    sales: 0,
                    orders: 0,
                    expenses: expenseItem.expenses,
                    expenseCount: expenseItem.expenseCount
                });
            }
        });

        // Sort the final chart data
        chartData.sort((a, b) => {
            if (a._id.year !== b._id.year) return a._id.year - b._id.year;
            if (a._id.month !== b._id.month) return a._id.month - b._id.month;
            if (a._id.day !== b._id.day) return a._id.day - b._id.day;
            return (a._id.hour || 0) - (b._id.hour || 0);
        });

        const totalSales = salesStats[0]?.totalSales || 0;
        const totalExpenses = totalExpenseStats[0]?.totalExpenses || 0;
        const netRevenue = totalSales - totalExpenses;

        res.status(200).json({
            success: true,
            data: {
                period,
                overview: {
                    totalSales,
                    totalExpenses,
                    netRevenue,
                    totalOrders: salesStats[0]?.totalOrders || 0,
                    avgOrderValue: salesStats[0]?.avgOrderValue || 0,
                    expenseCount: totalExpenseStats[0]?.expenseCount || 0
                },
                expensesByCategory: expenseStats,
                chartData,
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getExpenseStats,
    calculateRevenue,
    getFinancialOverview
};