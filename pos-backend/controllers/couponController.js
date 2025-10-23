const createHttpError = require("http-errors");
const Coupon = require("../models/couponModel");

const applyCoupon = async (req, res, next) => {
    try {
        const { code, totalAmount } = req.body;

        if (!code || !totalAmount) {
            const error = createHttpError(400, "Coupon code and total amount are required!");
            return next(error);
        }

        const coupon = await Coupon.findOne({ code, isActive: true });

        if (!coupon) {
            const error = createHttpError(404, "Invalid or expired coupon code!");
            return next(error);
        }

        if (coupon.expirationDate && new Date() > coupon.expirationDate) {
            const error = createHttpError(400, "Coupon has expired!");
            return next(error);
        }

        let discountAmount = (totalAmount * coupon.discountPercentage) / 100;

        const totalWithDiscount = totalAmount - discountAmount;

        res.status(200).json({
            success: true,
            message: "Coupon applied successfully!",
            couponCode: coupon.code,
            discountAmount,
            totalWithDiscount,
        });

    } catch (error) {
        next(error);
    }
};

const createCoupon = async (req, res, next) => {
    try {
        const { code, discountPercentage, expirationDate, isActive } = req.body;

        if (!code || !discountPercentage || !expirationDate) {
            const error = createHttpError(400, "Code, discount percentage, and expiration date are required!");
            return next(error);
        }

        const newCoupon = new Coupon({
            code,
            discountPercentage,
            expirationDate,
            isActive: isActive !== undefined ? isActive : true,
        });

        await newCoupon.save();

        res.status(201).json({ success: true, message: "Coupon created successfully!", coupon: newCoupon });

    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            const err = createHttpError(409, "Coupon code already exists!");
            return next(err);
        }
        next(error);
    }
};

const getCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find();
        res.status(200).json({ success: true, data: coupons });
    } catch (error) {
        next(error);
    }
};

const updateCoupon = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { code, discountPercentage, expirationDate, isActive } = req.body;

        if (!code || !discountPercentage || !expirationDate) {
            const error = createHttpError(400, "Code, discount percentage, and expiration date are required!");
            return next(error);
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            {
                code,
                discountPercentage,
                expirationDate,
                isActive: isActive !== undefined ? isActive : true,
            },
            { new: true }
        );

        if (!updatedCoupon) {
            const error = createHttpError(404, "Coupon not found!");
            return next(error);
        }

        res.status(200).json({
            success: true,
            message: "Coupon updated successfully!",
            coupon: updatedCoupon
        });

    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            const err = createHttpError(409, "Coupon code already exists!");
            return next(err);
        }
        next(error);
    }
};

const deleteCoupon = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            const error = createHttpError(404, "Coupon not found!");
            return next(error);
        }

        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully!"
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { applyCoupon, createCoupon, getCoupons, updateCoupon, deleteCoupon };