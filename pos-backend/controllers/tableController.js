const Table = require("../models/tableModel");
const createHttpError = require("http-errors");
const mongoose = require("mongoose")

const addTable = async (req, res, next) => {
  try {
    const { tableNo, seats } = req.body;
    if (!tableNo) {
      const error = createHttpError(400, "Please provide table No!");
      return next(error);
    }
    const isTablePresent = await Table.findOne({ tableNo });

    if (isTablePresent) {
      const error = createHttpError(400, "Table already exist!");
      return next(error);
    }

    const newTable = new Table({ tableNo, seats });
    await newTable.save();
    res
      .status(201)
      .json({ success: true, message: "Table added!", data: newTable });
  } catch (error) {
    next(error);
  }
};

const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find().populate({
      path: "currentOrders",
      select: "customerDetails orderStatus"
    }).populate({
      path: "seatDetails.orderId",
      select: "customerDetails orderStatus"
    });
    res.status(200).json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
};

const updateTable = async (req, res, next) => {
  try {
    const { tableNo, seats } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const table = await Table.findById(id);
    if (!table) {
      return next(createHttpError(404, "Table not found!"));
    }

    // Check if tableNo is being updated and if it already exists
    if (tableNo && tableNo !== table.tableNo) {
      const existingTable = await Table.findOne({ tableNo });
      if (existingTable) {
        return next(createHttpError(400, "Table number already exists!"));
      }
      table.tableNo = tableNo;
    }

    // If number of seats is changed, re-initialize the seats
    if (seats && seats !== table.seats) {
      // Check if any seat is booked
      const isAnySeatBooked = table.seatDetails.some(seat => seat.status === 'Booked');
      if (isAnySeatBooked) {
        return next(createHttpError(400, "Cannot change seats while table is in use!"));
      }
      table.seats = seats;
      table.seatDetails = [];
      for (let i = 1; i <= seats; i++) {
          table.seatDetails.push({ seatNumber: i, status: 'Available', orderId: null });
      }
    }

    const updatedTable = await table.save();

    res.status(200).json({ success: true, message: "Table updated!", data: updatedTable });

  } catch (error) {
    next(error);
  }
};

const deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid id!");
      return next(error);
    }

    const table = await Table.findById(id);

    if (!table) {
      const error = createHttpError(404, "Table not found!");
      return next(error);
    }

    // Check if table is currently booked or partially booked
    if (table.status === "Booked" || table.status === "Partial Booked") {
      const error = createHttpError(400, "Cannot delete a table with booked seats! Please clear the table first.");
      return next(error);
    }

    await Table.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Table deleted successfully!" });

  } catch (error) {
    next(error);
  }
};

// Get table statistics
const getTableStats = async (req, res, next) => {
  try {
    // Get total tables count
    const totalTables = await Table.countDocuments();

    // Get active tables (Available + Booked + Partial Booked)
    const activeTables = await Table.countDocuments({
      status: { $in: ["Available", "Booked", "Partial Booked"] }
    });

    // Get available tables count
    const availableTables = await Table.countDocuments({ status: "Available" });

    // Get fully booked tables count
    const bookedTables = await Table.countDocuments({ status: "Booked" });

    // Get partially booked tables count
    const partiallyBookedTables = await Table.countDocuments({ status: "Partial Booked" });

    // Calculate total occupied seats across all tables
    const tables = await Table.find();
    let occupiedSeatsCount = 0;
    let totalSeatsCount = 0;
    tables.forEach(table => {
      totalSeatsCount += table.seats;
      occupiedSeatsCount += table.seatDetails.filter(s => s.status === 'Booked').length;
    });

    // Calculate occupancy rate based on seats
    const occupancyRate = totalSeatsCount > 0 ? Math.round((occupiedSeatsCount / totalSeatsCount) * 100) : 0;

    // Mock growth data
    const tablesGrowth = Math.floor(Math.random() * 10 + 5); // 5-15%

    res.status(200).json({
      success: true,
      data: {
        totalTables,
        activeTables,
        availableTables,
        bookedTables,
        partiallyBookedTables,
        totalSeats: totalSeatsCount,
        occupiedSeats: occupiedSeatsCount,
        occupancyRate: `${occupancyRate}%`,
        trends: {
          tablesGrowth: `+${tablesGrowth}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateSeatStatus = async (req, res, next) => {
  try {
    const { tableId, seatNumber, status, orderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return next(createHttpError(404, "Invalid table id!"));
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return next(createHttpError(404, "Table not found!"));
    }

    const seat = table.seatDetails.find(s => s.seatNumber === seatNumber);
    if (!seat) {
      return next(createHttpError(404, "Seat not found!"));
    }

    // Check if the seat is already in the desired state
    if (seat.status === status) {
      return res.status(200).json({ success: true, message: `Seat is already ${status}.`, data: table });
    }

    // Prevent booking an already booked seat
    if (status === 'Booked' && seat.status === 'Booked') {
      return next(createHttpError(400, "This seat is already booked."));
    }
    
    seat.status = status;
    seat.orderId = orderId; // orderId will be null when status is 'Available'

    await table.save();

    res.status(200).json({ success: true, message: "Seat status updated!", data: table });

  } catch (error) {
    next(error);
  }
};

module.exports = { addTable, getTables, updateTable, deleteTable, getTableStats, updateSeatStatus };
