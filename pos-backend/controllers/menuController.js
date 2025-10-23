const Menu = require("../models/menuModel");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const createHttpError = require("http-errors");
const mongoose = require("mongoose");
const path = require("path");

// Create new menu item
const createMenuItem = async (req, res, next) => {
  try {
    const { title, category, price, description } = req.body;

    // Check if image was uploaded
    if (!req.file) {
      const error = createHttpError(400, "Image is required!");
      return next(error);
    }

    // Create menu item with image data (Cloudinary or local)
    const imageData = isCloudinaryConfigured()
      ? {
        url: req.file.path,
        public_id: req.file.filename
      }
      : {
        url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
        public_id: req.file.filename
      };

    const menuItem = new Menu({
      title,
      category,
      price: parseFloat(price),
      description,
      image: imageData
    });

    await menuItem.save();

    res.status(201).json({
      success: true,
      message: "Menu item created successfully!",
      data: menuItem
    });
  } catch (error) {
    // If menu creation fails, delete uploaded image
    if (req.file && req.file.filename) {
      try {
        if (isCloudinaryConfigured()) {
          await cloudinary.uploader.destroy(req.file.filename);
        } else {
          // For local storage, you might want to delete the file from filesystem
          const fs = require('fs');
          const filePath = path.join('uploads', req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (cleanupError) {
        console.error("Error deleting uploaded image:", cleanupError);
      }
    }
    next(error);
  }
};

// Get all menu items
const getMenuItems = async (req, res, next) => {
  try {
    const { category, available, search, page = 1, limit = 20 } = req.query;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.isAvailable = available === 'true';
    if (search) {
      filter.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get menu items with pagination
    const menuItems = await Menu.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Menu.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: menuItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single menu item by ID
const getMenuItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid menu item ID!");
      return next(error);
    }

    const menuItem = await Menu.findById(id);

    if (!menuItem) {
      const error = createHttpError(404, "Menu item not found!");
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Update menu item
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category, price, description, isAvailable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid menu item ID!");
      return next(error);
    }

    const existingMenuItem = await Menu.findById(id);
    if (!existingMenuItem) {
      const error = createHttpError(404, "Menu item not found!");
      return next(error);
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable === 'true';

    // Handle image update
    if (req.file) {
      // If there's an old image, delete it
      if (existingMenuItem.image && existingMenuItem.image.public_id) {
        try {
          if (isCloudinaryConfigured()) {
            await cloudinary.uploader.destroy(existingMenuItem.image.public_id);
          } else {
            // For local storage, delete the old file from filesystem
            const fs = require('fs');
            const filePath = path.join('uploads', existingMenuItem.image.public_id);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        } catch (cleanupError) {
          console.error("Error deleting old image:", cleanupError);
        }
      }

      // Update with new image data
      updateData.image = isCloudinaryConfigured()
        ? {
            url: req.file.path,
            public_id: req.file.filename,
          }
        : {
            url: `${req.protocol}://${req.get("host")}/uploads/${
              req.file.filename
            }`,
            public_id: req.file.filename,
          };
    }

    const updatedMenuItem = await Menu.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully!",
      data: updatedMenuItem
    });
  } catch (error) {
    // If update fails and new image was uploaded, delete it
    if (req.file && req.file.filename) {
      try {
        if (isCloudinaryConfigured()) {
          await cloudinary.uploader.destroy(req.file.filename);
        } else {
          // For local storage, you might want to delete the file from filesystem
          const fs = require('fs');
          const filePath = path.join('uploads', req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (cleanupError) {
        console.error("Error deleting uploaded image:", cleanupError);
      }
    }
    next(error);
  }
};

// Delete menu item
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid menu item ID!");
      return next(error);
    }

    const menuItem = await Menu.findByIdAndDelete(id);

    if (!menuItem) {
      const error = createHttpError(404, "Menu item not found!");
      return next(error);
    }

    // Delete image from storage
    if (menuItem.image && menuItem.image.public_id) {
      try {
        if (isCloudinaryConfigured()) {
          await cloudinary.uploader.destroy(menuItem.image.public_id);
        } else {
          // For local storage, delete the file from filesystem
          const fs = require('fs');
          const filePath = path.join('uploads', menuItem.image.public_id);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (cleanupError) {
        console.error("Error deleting image:", cleanupError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully!",
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Get menu categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Menu.distinct('category');

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// Get menu statistics
const getMenuStats = async (req, res, next) => {
  try {
    // Get total dishes count
    const totalDishes = await Menu.countDocuments();

    // Get available dishes count  
    const availableDishes = await Menu.countDocuments({ isAvailable: true });

    // Get categories count
    const categoriesAgg = await Menu.aggregate([
      { $group: { _id: "$category" } },
      { $count: "totalCategories" }
    ]);

    const totalCategories = categoriesAgg[0]?.totalCategories || 0;

    // Calculate trend percentages (mock data for now)
    const dishesGrowth = Math.floor(Math.random() * 20 + 5); // 5-25%
    const categoriesGrowth = Math.floor(Math.random() * 15 + 2); // 2-17%

    res.status(200).json({
      success: true,
      data: {
        totalDishes,
        availableDishes,
        totalCategories,
        trends: {
          dishesGrowth: `+${dishesGrowth}%`,
          categoriesGrowth: `+${categoriesGrowth}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMenuItem,
  getMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  getMenuStats
};