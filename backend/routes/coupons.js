const express = require('express');
const { validateCoupon, getAllCoupons, createCoupon, deleteCoupon } = require('../controllers/couponController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/validate', protect, validateCoupon);
router.get('/', protect, isAdmin, getAllCoupons);
router.post('/', protect, isAdmin, createCoupon);
router.delete('/:id', protect, isAdmin, deleteCoupon);

module.exports = router;
