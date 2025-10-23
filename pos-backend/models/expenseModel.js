const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Expense title is required"],
        trim: true,
        maxlength: [100, "Title cannot exceed 100 characters"]
    },
    amount: {
        type: Number,
        required: [true, "Amount is required"],
        min: [0, "Amount cannot be negative"]
    },
    amountPerUnit: {
        type: Number,
        min: [0, "Amount per unit cannot be negative"],
        default: null
    },
    totalAmount: {
        type: Number,
        min: [0, "Total amount cannot be negative"]
    },
    category: {
        type: String,
        required: [true, "Category is required"],
        enum: {
            values: ["rawMaterials", "utilityBills", "others"],
            message: "Category must be one of: rawMaterials, utilityBills, others"
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"]
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate totalAmount
expenseSchema.pre('save', function (next) {
    // Always calculate totalAmount before saving
    if (this.amountPerUnit && this.amountPerUnit > 0) {
        this.totalAmount = this.amount * this.amountPerUnit;
    } else {
        this.totalAmount = this.amount;
    }
    console.log('Pre-save: Calculated totalAmount =', this.totalAmount);
    next();
});

// Pre-update middleware to calculate totalAmount
expenseSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.$set) {
        const { amount, amountPerUnit } = update.$set;
        if (amount !== undefined || amountPerUnit !== undefined) {
            const currentAmount = amount !== undefined ? amount : this.getQuery().amount;
            const currentAmountPerUnit = amountPerUnit !== undefined ? amountPerUnit : this.getQuery().amountPerUnit;

            if (currentAmountPerUnit && currentAmountPerUnit > 0) {
                update.$set.totalAmount = currentAmount * currentAmountPerUnit;
            } else {
                update.$set.totalAmount = currentAmount;
            }
        }
    }
    next();
});

// Index for better query performance
expenseSchema.index({ category: 1, isDeleted: 1 });
expenseSchema.index({ createdAt: -1 });
expenseSchema.index({ title: 'text', description: 'text' });

// Virtual for getting category display name
expenseSchema.virtual('categoryDisplay').get(function () {
    const categoryMap = {
        'rawMaterials': 'Raw Materials',
        'utilityBills': 'Utility Bills',
        'others': 'Others'
    };
    return categoryMap[this.category] || this.category;
});

// Transform output to include virtuals
expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Expense", expenseSchema);
