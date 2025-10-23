const User = require('../models/userModel');
const Order = require('../models/orderModel');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } });
        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
const getSingleUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (req.user.id === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role',
            });
        }

        const orders = await Order.find({ user: req.params.id });

        if (orders.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot change role of user with associated orders',
            });
        }

        user.role = role || user.role;

        const updatedUser = await user.save();

        res.status(200).json({
            success: true,
            data: updatedUser,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (req.user.id === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account',
            });
        }

        const orders = await Order.find({ user: req.params.id });

        if (orders.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete user with associated orders',
            });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    }
};

module.exports = {
    getAllUsers,
    getSingleUser,
    updateUser,
    deleteUser,
};
