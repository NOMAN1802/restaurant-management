const createHttpError = require("http-errors");
const Expense = require("../models/expenseModel");
const Payment = require("../models/paymentModel");
const { default: mongoose } = require("mongoose");

// Helper function to get date range for report type
const getDateRange = (reportType, date = new Date()) => {
    const currentDate = new Date(date);
    let startDate, endDate;

    switch (reportType) {
        case 'daily':
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
            break;
        case 'weekly':
            const weekStart = currentDate.getDate() - currentDate.getDay();
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), weekStart);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), weekStart + 7);
            break;
        case 'monthly':
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            break;
        default:
            throw new Error('Invalid report type');
    }

    return { startDate, endDate };
};

// Helper function to format date for grouping
const getDateGroupFormat = (reportType) => {
    switch (reportType) {
        case 'daily':
            return {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" }
            };
        case 'weekly':
            return {
                year: { $year: "$createdAt" },
                week: { $week: "$createdAt" }
            };
        case 'monthly':
            return {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" }
            };
        default:
            throw new Error('Invalid report type');
    }
};

// Generate daily report
const generateDailyReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const reportDate = date ? new Date(date) : new Date();
        const { startDate, endDate } = getDateRange('daily', reportDate);

        const [expenseData, revenueData] = await Promise.all([
            // Get expenses for the day grouped by category
            Expense.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        createdAt: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 },
                        expenses: {
                            $push: {
                                title: "$title",
                                amount: "$totalAmount",
                                createdAt: "$createdAt"
                            }
                        }
                    }
                }
            ]),
            // Get revenue for the day
            Payment.aggregate([
                {
                    $match: {
                        status: "completed",
                        createdAt: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$amount" },
                        transactionCount: { $sum: 1 }
                    }
                }
            ])
        ]);

        const totalExpenses = expenseData.reduce((sum, item) => sum + item.totalAmount, 0);
        const totalRevenue = revenueData[0]?.totalRevenue || 0;
        const netRevenue = totalRevenue - totalExpenses;

        res.status(200).json({
            success: true,
            data: {
                reportType: 'daily',
                date: reportDate.toISOString().split('T')[0],
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netRevenue,
                    transactionCount: revenueData[0]?.transactionCount || 0
                },
                expenseBreakdown: expenseData.map(item => ({
                    category: item._id,
                    categoryDisplay: getCategoryDisplay(item._id),
                    totalAmount: item.totalAmount,
                    count: item.count,
                    expenses: item.expenses
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Generate weekly report
const generateWeeklyReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const reportDate = date ? new Date(date) : new Date();
        const { startDate, endDate } = getDateRange('weekly', reportDate);

        const [expenseData, revenueData, dailyBreakdown] = await Promise.all([
            // Get expenses for the week grouped by category
            Expense.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        createdAt: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Get revenue for the week
            Payment.aggregate([
                {
                    $match: {
                        status: "completed",
                        createdAt: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$amount" },
                        transactionCount: { $sum: 1 }
                    }
                }
            ]),
            // Get daily breakdown for the week
            Promise.all([
                Expense.aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            createdAt: { $gte: startDate, $lt: endDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: "$createdAt" },
                                month: { $month: "$createdAt" },
                                day: { $dayOfMonth: "$createdAt" }
                            },
                            totalExpenses: { $sum: "$totalAmount" }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
                ]),
                Payment.aggregate([
                    {
                        $match: {
                            status: "completed",
                            createdAt: { $gte: startDate, $lt: endDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: "$createdAt" },
                                month: { $month: "$createdAt" },
                                day: { $dayOfMonth: "$createdAt" }
                            },
                            totalRevenue: { $sum: "$amount" }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
                ])
            ])
        ]);

        const totalExpenses = expenseData.reduce((sum, item) => sum + item.totalAmount, 0);
        const totalRevenue = revenueData[0]?.totalRevenue || 0;
        const netRevenue = totalRevenue - totalExpenses;

        // Merge daily breakdown
        const [dailyExpenses, dailyRevenue] = dailyBreakdown;
        const dailyData = mergeDailyData(dailyExpenses, dailyRevenue, startDate, endDate);

        res.status(200).json({
            success: true,
            data: {
                reportType: 'weekly',
                weekStart: startDate.toISOString().split('T')[0],
                weekEnd: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netRevenue,
                    transactionCount: revenueData[0]?.transactionCount || 0
                },
                expenseBreakdown: expenseData.map(item => ({
                    category: item._id,
                    categoryDisplay: getCategoryDisplay(item._id),
                    totalAmount: item.totalAmount,
                    count: item.count
                })),
                dailyBreakdown: dailyData
            }
        });
    } catch (error) {
        next(error);
    }
};

// Generate monthly report
const generateMonthlyReport = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const reportDate = new Date(year || new Date().getFullYear(), (month ? month - 1 : new Date().getMonth()), 1);
        const { startDate, endDate } = getDateRange('monthly', reportDate);

        const [expenseData, revenueData, weeklyBreakdown] = await Promise.all([
            // Get expenses for the month grouped by category
            Expense.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        createdAt: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Get revenue for the month
            Payment.aggregate([
                {
                    $match: {
                        status: "completed",
                        createdAt: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$amount" },
                        transactionCount: { $sum: 1 }
                    }
                }
            ]),
            // Get weekly breakdown for the month
            Promise.all([
                Expense.aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            createdAt: { $gte: startDate, $lt: endDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: "$createdAt" },
                                week: { $week: "$createdAt" }
                            },
                            totalExpenses: { $sum: "$totalAmount" }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.week": 1 } }
                ]),
                Payment.aggregate([
                    {
                        $match: {
                            status: "completed",
                            createdAt: { $gte: startDate, $lt: endDate }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: "$createdAt" },
                                week: { $week: "$createdAt" }
                            },
                            totalRevenue: { $sum: "$amount" }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.week": 1 } }
                ])
            ])
        ]);

        const totalExpenses = expenseData.reduce((sum, item) => sum + item.totalAmount, 0);
        const totalRevenue = revenueData[0]?.totalRevenue || 0;
        const netRevenue = totalRevenue - totalExpenses;

        // Merge weekly breakdown
        const [weeklyExpenses, weeklyRevenue] = weeklyBreakdown;
        const weeklyData = mergeWeeklyData(weeklyExpenses, weeklyRevenue);

        res.status(200).json({
            success: true,
            data: {
                reportType: 'monthly',
                month: reportDate.getMonth() + 1,
                year: reportDate.getFullYear(),
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netRevenue,
                    transactionCount: revenueData[0]?.transactionCount || 0
                },
                expenseBreakdown: expenseData.map(item => ({
                    category: item._id,
                    categoryDisplay: getCategoryDisplay(item._id),
                    totalAmount: item.totalAmount,
                    count: item.count
                })),
                weeklyBreakdown: weeklyData
            }
        });
    } catch (error) {
        next(error);
    }
};

// Helper function to get category display name
const getCategoryDisplay = (category) => {
    const categoryMap = {
        'rawMaterials': 'Raw Materials',
        'utilityBills': 'Utility Bills',
        'others': 'Others'
    };
    return categoryMap[category] || category;
};

// Helper function to merge daily data
const mergeDailyData = (expenses, revenue, startDate, endDate) => {
    const dailyMap = new Map();

    // Initialize all days in the range
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        dailyMap.set(dateKey, {
            date: new Date(d).toISOString().split('T')[0],
            totalExpenses: 0,
            totalRevenue: 0,
            netRevenue: 0
        });
    }

    // Add expense data
    expenses.forEach(item => {
        const dateKey = `${item._id.year}-${item._id.month}-${item._id.day}`;
        if (dailyMap.has(dateKey)) {
            dailyMap.get(dateKey).totalExpenses = item.totalExpenses;
        }
    });

    // Add revenue data
    revenue.forEach(item => {
        const dateKey = `${item._id.year}-${item._id.month}-${item._id.day}`;
        if (dailyMap.has(dateKey)) {
            dailyMap.get(dateKey).totalRevenue = item.totalRevenue;
        }
    });

    // Calculate net revenue
    dailyMap.forEach(item => {
        item.netRevenue = item.totalRevenue - item.totalExpenses;
    });

    return Array.from(dailyMap.values());
};

// Helper function to merge weekly data
const mergeWeeklyData = (expenses, revenue) => {
    const weeklyMap = new Map();

    // Add expense data
    expenses.forEach(item => {
        const weekKey = `${item._id.year}-${item._id.week}`;
        weeklyMap.set(weekKey, {
            year: item._id.year,
            week: item._id.week,
            totalExpenses: item.totalExpenses,
            totalRevenue: 0,
            netRevenue: 0
        });
    });

    // Add revenue data
    revenue.forEach(item => {
        const weekKey = `${item._id.year}-${item._id.week}`;
        if (weeklyMap.has(weekKey)) {
            weeklyMap.get(weekKey).totalRevenue = item.totalRevenue;
        } else {
            weeklyMap.set(weekKey, {
                year: item._id.year,
                week: item._id.week,
                totalExpenses: 0,
                totalRevenue: item.totalRevenue,
                netRevenue: 0
            });
        }
    });

    // Calculate net revenue
    weeklyMap.forEach(item => {
        item.netRevenue = item.totalRevenue - item.totalExpenses;
    });

    return Array.from(weeklyMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.week - b.week;
    });
};

module.exports = {
    generateDailyReport,
    generateWeeklyReport,
    generateMonthlyReport
};
