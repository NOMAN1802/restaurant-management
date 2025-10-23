const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
    seatNumber: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Available', 'Booked'],
        default: 'Available'
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
});

const tableSchema = new mongoose.Schema({
    tableNo: { type: Number, required: true, unique: true },
    status: {
        type: String,
        default: "Available"
    },
    seats: {
        type: Number,
        required: true
    },
    seatDetails: [seatSchema], // New field
    currentOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    // Keep currentOrder for backward compatibility, will be deprecated
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }
});

// Method to initialize seats when a table is created
tableSchema.methods.initializeSeats = function() {
    if (this.isNew) {
        this.seatDetails = [];
        for (let i = 1; i <= this.seats; i++) {
            this.seatDetails.push({ seatNumber: i });
        }
    }
};

// Pre-save hook to initialize seats and update status
tableSchema.pre('save', function(next) {
    this.initializeSeats();

    const occupiedCount = this.seatDetails.filter(s => s.status === 'Booked').length;
    if (occupiedCount === 0) {
        this.status = 'Available';
    } else if (occupiedCount < this.seats) {
        this.status = 'Partial Booked';
    } else {
        this.status = 'Booked';
    }
    next();
});

module.exports = mongoose.model("Table", tableSchema);