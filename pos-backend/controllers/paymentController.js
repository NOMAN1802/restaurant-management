const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");
const createHttpError = require("http-errors"); // Import createHttpError

const processCashPayment = async (req, res, next) => {
  try {
    const { amount, orderId } = req.body;

    // Find the order and update its payment status
    const order = await Order.findByIdAndUpdate(
      orderId,
      { isPaid: true, paymentMethod: "Cash" },
      { new: true }
    );

    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    const newPayment = new Payment({
      orderId: orderId,
      amount: amount,
      currency: "INR", // Assuming INR for cash payments
      status: "completed", // Cash payments are completed immediately
      method: "cash",
      createdAt: new Date(),
    });

    await newPayment.save();

    // Log payment completion
    console.log(`Cash payment processed for order: ${order._id}, amount: ${amount}`);

    res.status(200).json({ success: true, message: "Cash payment processed successfully!", order });
  } catch (error) {
    console.error("Error processing cash payment:", error);
    next(error);
  }
};

// Get sales analytics
const getSalesAnalytics = async (req, res, next) => {
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

    // Get sales data with time series
    const salesData = await Payment.aggregate([
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
          totalSales: { $sum: "$amount" },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]);

    // Get total statistics
    const totalStats = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$amount" }
        }
      }
    ]);

    // Get payment method distribution
    const paymentMethodStats = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
          total: { $sum: "$amount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        totalStats: totalStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
        salesData,
        paymentMethodStats,
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

module.exports = { processCashPayment, getSalesAnalytics };
