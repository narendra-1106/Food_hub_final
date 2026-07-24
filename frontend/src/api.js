import axios from 'axios';

const isProd = import.meta.env.PROD;
const API_URL = import.meta.env.VITE_API_URL || (isProd ? 'https://food-hub-final-bafz.onrender.com' : 'http://localhost:5000');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodhub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth & Profile
export const loginUser = async (email, password) => {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data;
};

export const registerUser = async (name, email, password) => {
  const { data } = await api.post('/api/auth/register', { name, email, password });
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get('/api/auth/profile');
  return data;
};

export const updateProfile = async (profileData) => {
  const { data } = await api.put('/api/auth/profile', profileData);
  return data;
};

export const toggleFavorite = async (restaurantId) => {
  const { data } = await api.post(`/api/auth/favorites/${restaurantId}`);
  return data;
};

export const getFavorites = async () => {
  const { data } = await api.get('/api/auth/favorites');
  return data;
};


// Admin User Management
export const getAllUsers = async () => {
  const { data } = await api.get('/api/auth/users');
  return data;
};

export const updateUserRole = async (userId, role) => {
  const { data } = await api.put(`/api/auth/users/${userId}/role`, { role });
  return data;
};

// Restaurants & Menu
export const getRestaurants = async () => {
  const { data } = await api.get('/api/restaurants');
  return data;
};

export const getRestaurantById = async (id) => {
  const { data } = await api.get(`/api/restaurants/${id}`);
  return data;
};

export const createRestaurant = async (restaurantData) => {
  const { data } = await api.post('/api/restaurants', restaurantData);
  return data;
};

export const updateRestaurant = async (id, restaurantData) => {
  const { data } = await api.put(`/api/restaurants/${id}`, restaurantData);
  return data;
};

export const deleteRestaurant = async (id) => {
  const { data } = await api.delete(`/api/restaurants/${id}`);
  return data;
};

export const addMenuItem = async (restaurantId, itemData) => {
  const { data } = await api.post(`/api/restaurants/${restaurantId}/menu`, itemData);
  return data;
};

export const updateMenuItem = async (restaurantId, itemId, itemData) => {
  const { data } = await api.put(`/api/restaurants/${restaurantId}/menu/${itemId}`, itemData);
  return data;
};

export const deleteMenuItem = async (restaurantId, itemId) => {
  const { data } = await api.delete(`/api/restaurants/${restaurantId}/menu/${itemId}`);
  return data;
};

// Orders
export const placeOrder = async (orderData) => {
  const { data } = await api.post('/api/orders', orderData);
  return data;
};

export const getMyOrders = async () => {
  const { data } = await api.get('/api/orders/my-orders');
  return data;
};

export const getAllOrders = async () => {
  const { data } = await api.get('/api/orders/all');
  return data;
};

export const getOrderById = async (id) => {
  const { data } = await api.get(`/api/orders/${id}`);
  return data;
};

export const updateOrderStatus = async (id, status) => {
  const { data } = await api.put(`/api/orders/${id}/status`, { status });
  return data;
};

export const submitReview = async (orderId, reviewData) => {
  const { data } = await api.post(`/api/orders/${orderId}/review`, reviewData);
  return data;
};

// Coupons
export const validateCoupon = async (code, subtotal) => {
  const { data } = await api.post('/api/coupons/validate', { code, subtotal });
  return data;
};

export const getCoupons = async () => {
  const { data } = await api.get('/api/coupons');
  return data;
};

export const createCoupon = async (couponData) => {
  const { data } = await api.post('/api/coupons', couponData);
  return data;
};

export const deleteCoupon = async (id) => {
  const { data } = await api.delete(`/api/coupons/${id}`);
  return data;
};

export default api;
