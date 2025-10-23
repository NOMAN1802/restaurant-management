const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getSingleUser,
    updateUser,
    deleteUser,
} = require('../controllers/userManagementController');
const { isVerifiedUser, isAdmin } = require('../middlewares/tokenVerification');

// Protect all routes
router.use(isVerifiedUser, isAdmin);

// Routes
router.route('/').get(getAllUsers);
router.route('/:id').get(getSingleUser).put(updateUser).delete(deleteUser);

module.exports = router;
