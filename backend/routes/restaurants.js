const express = require('express');
const { 
  getAllRestaurants, 
  getNearbyRestaurants, 
  getRestaurantById, 
  createRestaurant, 
  addMenuItem, 
  updateRestaurant, 
  deleteRestaurant, 
  updateMenuItem, 
  deleteMenuItem 
} = require('../controllers/restaurantController');
const { protect, isPartnerOrAdmin, optionalProtect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET uses optionalProtect so admins see ALL restaurants, guests see only active
router.get('/', optionalProtect, getAllRestaurants);
router.get('/nearby', getNearbyRestaurants);
router.get('/:id', getRestaurantById);
router.post('/', protect, isPartnerOrAdmin, createRestaurant);
router.put('/:id', protect, isPartnerOrAdmin, updateRestaurant);
router.delete('/:id', protect, isPartnerOrAdmin, deleteRestaurant);
router.post('/:id/menu', protect, isPartnerOrAdmin, addMenuItem);
router.put('/:id/menu/:itemId', protect, isPartnerOrAdmin, updateMenuItem);
router.delete('/:id/menu/:itemId', protect, isPartnerOrAdmin, deleteMenuItem);

module.exports = router;
