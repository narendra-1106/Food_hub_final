const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

exports.placeOrder = async (req, res) => {
  try {
    const { restaurantId, items, totalAmount, deliveryAddress, couponCode, discountAmount, paymentMethod, paymentDetails } = req.body;
    
    // Simulate Payment Gateway
    const paymentSuccess = true; 
    if (!paymentSuccess) {
      return res.status(400).json({ message: 'Payment failed' });
    }

    const order = await Order.create({
      consumerId: req.user._id,
      restaurantId,
      items,
      totalAmount,
      deliveryAddress,
      couponCode,
      discountAmount,
      paymentMethod,
      paymentDetails
    });

    // Notify restaurant via WebSocket
    req.io.to(`restaurant_${restaurantId}`).emit('new_order', order);

    res.status(201).json(order);
  } catch (error) {
    console.error('Order Placement Error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Broadcast to the order's specific room
    req.io.to(`order_${id}`).emit('order_status_updated', order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text, restaurantId } = req.body;

    // Gamification Algorithm
    const wordCount = text.split(' ').length;
    let points = 0;
    
    if (wordCount > 10) points += 5;
    if (wordCount > 30) points += 10;
    
    const keywords = ['delicious', 'fast', 'fresh', 'hot', 'authentic', 'spicy'];
    keywords.forEach(kw => {
      if (text.toLowerCase().includes(kw)) points += 2;
    });

    const review = await Review.create({
      userId: req.user._id,
      restaurantId,
      orderId: id,
      rating,
      text,
      gamifiedPointsAwarded: points
    });

    // Update order with reviewId
    await Order.findByIdAndUpdate(id, { reviewId: review._id });

    // Award loyalty points to user
    await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: points } });
    
    // Recalculate average rating and total reviews for restaurant
    const reviews = await Review.find({ restaurantId });
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews;

    await Restaurant.findByIdAndUpdate(restaurantId, {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews
    });

    res.status(201).json({ review, pointsAwarded: points });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAiReviewPrompts = async (req, res) => {
  // Mock AI keyword suggestion based on history
  const suggestions = [
    "How was the temperature of the food?",
    "Did you enjoy the blend of spices?",
    "Was the delivery prompt?",
    "Keywords to use: delicious, fast, fresh, authentic."
  ];
  res.json({ prompts: suggestions });
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ consumerId: req.user._id })
      .populate('restaurantId', 'name imageUrl address')
      .populate('items.menuItemId', 'name price imageUrl isVeg')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('consumerId', 'name email phone')
      .populate('restaurantId', 'name imageUrl address')
      .populate('items.menuItemId', 'name price imageUrl isVeg')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('consumerId', 'name email phone')
      .populate('restaurantId', 'name imageUrl address')
      .populate('items.menuItemId', 'name price imageUrl isVeg');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
