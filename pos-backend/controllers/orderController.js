const createHttpError = require("http-errors");
const Order = require("../models/orderModel");
const Table = require("../models/tableModel"); // Import Table model
const { default: mongoose } = require("mongoose");

const freeSeatsForOrder = async (order, session) => {
    if (order.orderType === 'Dine In' && order.seats && order.seats.length > 0) {
        for (const seatInfo of order.seats) {
            const table = await Table.findById(seatInfo.tableId).session(session);
            if (table) {
                const seat = table.seatDetails.find(s => s.seatNumber === seatInfo.seatNumber);
                if (seat) {
                    seat.status = 'Available';
                    seat.orderId = null;
                }
                // Remove order from currentOrders array
                table.currentOrders = table.currentOrders.filter(orderId => orderId.toString() !== order._id.toString());
                await table.save({ session });
            }
        }
    }
};

const addOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      customerDetails,
      orderStatus,
      items,
      seats, // Expecting an array of { tableId, seatNumber }
      bills,
      orderType
    } = req.body;

    if (orderType === 'Dine In' && (!seats || seats.length === 0)) {
      throw createHttpError(400, 'Seats are required for Dine In orders.');
    }

    const {
      total,
      couponCode = null,
      discountAmount = 0,
      totalWithDiscount
    } = bills;

    // For Dine In orders, check seat availability and update table
    if (orderType === 'Dine In') {
      for (const seatInfo of seats) {
        const table = await Table.findById(seatInfo.tableId).session(session);
        if (!table) {
          throw createHttpError(404, `Table with id ${seatInfo.tableId} not found.`);
        }
        const seat = table.seatDetails.find(s => s.seatNumber === seatInfo.seatNumber);
        if (!seat) {
          throw createHttpError(404, `Seat number ${seatInfo.seatNumber} not found on table ${table.tableNo}.`);
        }
        if (seat.status !== 'Available') {
          throw createHttpError(400, `Seat ${seatInfo.seatNumber} on table ${table.tableNo} is already booked.`);
        }
      }
    }

    // Extract table information from seats for Dine In orders
    let tableInfo = null;
    if (orderType === 'Dine In' && seats && seats.length > 0) {
      const firstSeatTableId = seats[0].tableId;
      const tableDoc = await Table.findById(firstSeatTableId).session(session);
      if (tableDoc) {
        tableInfo = {
          _id: tableDoc._id,
          tableNo: tableDoc.tableNo
        };
      }
    }

    const order = new Order({
      customerDetails,
      orderStatus,
      items,
      seats: orderType === 'Dine In' ? seats : [],
      table: tableInfo,
      orderType,
      bills: {
        total,
        couponCode,
        discountAmount,
        totalWithDiscount
      },
      isPaid: false,
    });
    
    const savedOrder = await order.save({ session });

    // Update table with current order reference for Dine In orders
    if (orderType === 'Dine In') {
      for (const seatInfo of seats) {
        const table = await Table.findById(seatInfo.tableId).session(session);
        const seat = table.seatDetails.find(s => s.seatNumber === seatInfo.seatNumber);
        seat.status = 'Booked';
        seat.orderId = savedOrder._id;
        
        // Also add to currentOrders for backward compatibility and general table view
        if (!table.currentOrders.includes(savedOrder._id)) {
            table.currentOrders.push(savedOrder._id);
        }

        await table.save({ session });
      }
    }

    await session.commitTransaction();

    // Send notification to all roles when new order is placed
    console.log('New order created:', savedOrder._id);

    res
      .status(201)
      .json({ success: true, message: "Order created!", data: savedOrder });
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid id!");
      return next(error);
    }

    const order = await Order.findById(id)
      .populate({ 
        path: 'seats.tableId',
        model: 'Table'
      })
      .populate({
        path: 'table._id',
        model: 'Table'
      }); // Populate table information
    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate({ 
        path: 'seats.tableId',
        model: 'Table'
      })
      .populate({
        path: 'table._id',
        model: 'Table'
      });
    res.status(200).json({ data: orders });
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { orderStatus, isPaid, paymentMethod, items, customerDetails } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(404, "Invalid id!");
    }

    const existingOrder = await Order.findById(id).session(session);
    if (!existingOrder) {
      throw createHttpError(404, "Order not found!");
    }

    const updateFields = {};
    if (orderStatus) updateFields.orderStatus = orderStatus;
    if (isPaid !== undefined) updateFields.isPaid = isPaid;
    if (paymentMethod) updateFields.paymentMethod = paymentMethod;
    if (items) updateFields.items = items;
    if (customerDetails) updateFields.customerDetails = customerDetails;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, session }
    );

    // If order is completed or ready, free up the seats
    if (orderStatus === "Ready" || orderStatus === "Completed") {
        await freeSeatsForOrder(existingOrder, session);
    }
    
    await session.commitTransaction();

    // Notifications and logging...
    if (orderStatus) {
      console.log(`Order status updated to ${orderStatus} for order: ${id}`);
    }
    if (isPaid === true) {
      console.log(`Payment completed for order: ${id}`);
    }

    res
      .status(200)
      .json({ success: true, message: "Order updated", data: updatedOrder });
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params; // Order ID from URL params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid order ID!");
      return next(error);
    }

    const order = await Order.findById(id).session(session);

    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    order.orderStatus = "Cancelled";
    const cancelledOrder = await order.save({ session });

    await freeSeatsForOrder(order, session);

    await session.commitTransaction();

    res.status(200).json({ success: true, message: "Order cancelled successfully!", data: cancelledOrder });
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    console.error("Error cancelling order:", error);
    next(error);
  } finally {
    session.endSession();
  }
};

const deleteOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(404, "Invalid order ID!");
    }

    const order = await Order.findById(id).session(session);
    if (!order) {
      throw createHttpError(404, "Order not found!");
    }

    await freeSeatsForOrder(order, session);
    
    await Order.findByIdAndDelete(id, { session });

    await session.commitTransaction();

    console.log('Order deleted:', id);

    res.status(200).json({ success: true, message: "Order deleted successfully!" });
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    console.error("Error deleting order:", error);
    next(error);
  } finally {
    session.endSession();
  }
};

// Get order statistics
const getOrderStats = async (req, res, next) => {
  try {
    const { period, startDate, endDate, month, year } = req.query;

    // Build date filter for period
    let dateFilter = {};
    const now = new Date();

    if (period === 'custom' && startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period === 'daily') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter.createdAt = { $gte: startOfDay };
    } else if (period === 'weekly') {
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      dateFilter.createdAt = { $gte: startOfWeek };
    } else if (period === 'monthly') {
      if (month && year) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        dateFilter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
      } else {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter.createdAt = { $gte: startOfMonth };
      }
    } else if (period === 'yearly') {
      if (year) {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        dateFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
      } else {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter.createdAt = { $gte: startOfYear };
      }
    }

    // Get total orders
    const totalOrders = await Order.countDocuments(dateFilter);

    // Get active orders (not completed or cancelled)
    const activeOrders = await Order.countDocuments({
      ...dateFilter,
      orderStatus: { $nin: ["Completed", "Cancelled"] }
    });

    // Get completed orders
    const completedOrders = await Order.countDocuments({
      ...dateFilter,
      orderStatus: "Completed"
    });

    // Get cancelled orders
    const cancelledOrders = await Order.countDocuments({
      ...dateFilter,
      orderStatus: "Cancelled"
    });

    // Mock growth data
    const ordersGrowth = Math.floor(Math.random() * 25 + 10); // 10-35%

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        trends: {
          ordersGrowth: `+${ordersGrowth}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const addItemToOrder = async (req, res, next) => {
  try {
    const { id } = req.params; // Order ID
    const { items, orderType, table, bills } = req.body; // Array of new items to add, plus orderType, table, and bills

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid order ID!");
      return next(error);
    }

    const order = await Order.findById(id);

    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    if (order.isPaid) {
      const error = createHttpError(400, "Cannot add items to a paid order.");
      return next(error);
    }

    // Update orderType and table if provided
    if (orderType) {
      order.orderType = orderType;
    }
    if (orderType === 'Dine In' && !table) {
      return next(createHttpError(400, 'Table is required for Dine In orders.'));
    }
    if (table) {
      order.table = table;
    }

    // Add new items to the existing items array
    order.items.push(...items);

    // Recalculate total
    let newTotal = 0;
    order.items.forEach(item => {
      newTotal += item.price * item.quantity;
    });

    order.bills.total = newTotal;

    // Update coupon details if provided in the request
    if (bills) {
      order.bills.couponCode = bills.couponCode || null;
      order.bills.discountAmount = bills.discountAmount || 0;
      order.bills.totalWithDiscount = bills.totalWithDiscount || newTotal;
    } else {
      // If no new bills are provided, use the newTotal for totalWithDiscount without discount
      order.bills.totalWithDiscount = newTotal;
    }

    await order.save();

    res.status(200).json({ success: true, message: "Items added to order successfully", data: order });
  } catch (error) {
    next(error);
  }
};

const updateOrderItems = async (req, res, next) => {
  try {
    const { id } = req.params; // Order ID
    const { items, bills, orderType, table, seats, customerDetails } = req.body; // Array of new items to add, plus orderType, table, seats, and bills

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid order ID!");
      return next(error);
    }

    const order = await Order.findById(id);

    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    if (order.isPaid) {
      const error = createHttpError(400, "Cannot add items to a paid order.");
      return next(error);
    }

    // Update orderType if provided
    if (orderType) {
      order.orderType = orderType;
    }

    // Validate table requirement for Dine In orders
    if ((orderType === 'Dine In' || order.orderType === 'Dine In') && !table && (!seats || seats.length === 0)) {
      return next(createHttpError(400, 'Table and seats are required for Dine In orders.'));
    }

    // Update table if provided
    if (table) {
      order.table = table;
    }

    // Update seats if provided
    if (seats) {
      order.seats = seats;
    }

    // Update customer details if provided
    if (customerDetails) {
      order.customerDetails = { ...order.customerDetails, ...customerDetails };
    }

    // Update items
    order.items = items;

    // Recalculate total
    let newTotal = 0;
    order.items.forEach(item => {
      newTotal += item.price;
    });

    order.bills.total = newTotal;

    // Update coupon details if provided in the request
    if (bills) {
      order.bills.couponCode = bills.couponCode || null;
      order.bills.discountAmount = bills.discountAmount || 0;
      order.bills.totalWithDiscount = bills.totalWithDiscount || newTotal;
    } else {
      // If no new bills are provided, use the newTotal for totalWithDiscount without discount
      order.bills.totalWithDiscount = newTotal;
    }

    await order.save();

    res.status(200).json({ success: true, message: "Order updated successfully", data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = { addOrder, getOrderById, getOrders, updateOrder, cancelOrder, deleteOrder, getOrderStats, addItemToOrder, updateOrderItems };
