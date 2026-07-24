const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  cuisine: [{ type: String }],

  // Optional geo-location (no longer required so admin can create without GPS)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },

  address: { type: String, default: '' },

  // Frontend display fields
  image: { type: String, default: '' },
  deliveryTime: { type: String, default: '30-45 min' },
  rating: { type: Number, default: 4.0, min: 0, max: 5 },
  priceRange: { type: String, default: '₹₹' },
  minOrder: { type: Number, default: 0 },
  tags: [{ type: String }],

  // Computed from reviews
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// 2dsphere index (sparse so docs without real coords don't break it)
restaurantSchema.index({ location: '2dsphere' }, { sparse: true });
restaurantSchema.index({ averageRating: -1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
