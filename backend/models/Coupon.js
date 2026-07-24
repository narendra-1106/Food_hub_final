const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat', 'fixed'],  // accept both 'flat' and 'fixed'
    required: true
  },
  discountValue: {
    type: Number,
    required: true
  },
  minOrderValue: {    // renamed from minOrderAmount for frontend consistency
    type: Number,
    default: 0
  },
  minOrderAmount: {   // kept for backward compat
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Coupon', couponSchema);
