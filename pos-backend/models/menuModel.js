const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Menu item title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"]
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ['Biriyani', 'Rice Items', 'Fish Items', 'Chicken Items',
    'Beef Items', 'Mutton Items', 'Drinks', 'Fast Foods', 'Kacchi Package', 'Others'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  image: {
    url: {
      type: String,
      required: [true, "Image URL is required"]
    },
    public_id: {
      type: String,
      required: [true, "Image public ID is required"]
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: [500, "Description cannot exceed 500 characters"],
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
menuSchema.index({ category: 1, isAvailable: 1 });
menuSchema.index({ title: 'text', description: 'text' });

const Menu = mongoose.model("Menu", menuSchema);
module.exports = Menu;
