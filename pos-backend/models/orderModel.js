const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    customerDetails: {
        serialNumber: { type: String, required: true },
        guests: { type: Number, required: false },
    },
    orderStatus: {
        type: String,
        required: true
    },
    orderType: {
        type: String,
        enum: ['Dine In', 'Take Away'],
        default: 'Dine In'
    },
    orderDate: {
        type: Date,
        default : Date.now()
    },
    bills: {
        total: { type: Number, required: true },
        couponCode: { type: String, default: null },
        discountAmount: { type: Number, default: 0 },
        totalWithDiscount: { type: Number, required: true }
    },
    items: [],
    table: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
        tableNo: { type: Number }
    },
    seats: [{
        tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
        seatNumber: { type: Number }
    }],
    paymentMethod: { type: String, required: false }, // Make paymentMethod optional initially
    isPaid: { type: Boolean, default: false },
}, { timestamps : true } );

module.exports = mongoose.model("Order", orderSchema);