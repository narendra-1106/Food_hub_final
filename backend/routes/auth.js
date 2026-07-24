const express = require('express');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  toggleFavorite, 
  getFavorites, 
  getAllUsers, 
  updateUserRole 
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/favorites/:restaurantId', protect, toggleFavorite);
router.get('/favorites', protect, getFavorites);

router.get('/users', protect, isAdmin, getAllUsers);
router.put('/users/:id/role', protect, isAdmin, updateUserRole);

module.exports = router;
