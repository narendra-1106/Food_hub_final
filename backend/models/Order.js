const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  courierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
    priceAtTimeOfOrder: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  couponCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['COD', 'UPI', 'CARD'], default: 'COD' },
  paymentDetails: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'ORDER_PREPARING', 'READY_FOR_PICKUP', 'COURIER_ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
