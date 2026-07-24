const express = require('express');
const { 
  placeOrder, 
  updateOrderStatus, 
  submitReview, 
  getAiReviewPrompts, 
  getMyOrders, 
  getAllOrders, 
  getOrderById 
} = require('../controllers/orderController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my-orders', protect, getMyOrders);
router.get('/all', protect, isAdmin, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, placeOrder);
router.put('/:id/status', protect, updateOrderStatus);
router.post('/:id/review', protect, submitReview);
router.get('/prompts', protect, getAiReviewPrompts);

module.exports = router;
