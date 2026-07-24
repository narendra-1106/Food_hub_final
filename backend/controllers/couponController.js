const Coupon = require('../models/Coupon');

// ── Validate & apply a coupon code ────────────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or inactive coupon code' });
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    // Minimum order check — use both field names for compatibility
    const minOrder = coupon.minOrderValue || coupon.minOrderAmount || 0;
    if (subtotal < minOrder) {
      return res.status(400).json({
        message: `Minimum order of ₹${minOrder} required for this coupon`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
      // Cap at maxDiscount if set
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      // flat / fixed
      discountAmount = coupon.discountValue;
    }

    // Discount can never exceed the subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      message: `Coupon applied! You save ₹${discountAmount}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get all coupons (admin) ───────────────────────────────────────────────────
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Create coupon (admin) ─────────────────────────────────────────────────────
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, discountType, discountValue,
      minOrderValue, minOrderAmount,
      maxDiscount, expiresAt, isActive
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: 'code, discountType and discountValue are required' });
    }

    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      minOrderValue: parseFloat(minOrderValue || minOrderAmount || 0),
      minOrderAmount: parseFloat(minOrderValue || minOrderAmount || 0),
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      expiresAt: expiresAt || null,
      isActive: isActive !== false
    });

    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Delete coupon (admin) ─────────────────────────────────────────────────────
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
