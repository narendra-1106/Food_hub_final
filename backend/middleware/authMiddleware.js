const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_foodhub_secret_key_123');
      
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

exports.isPartnerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'restaurant_partner')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized. Admin or Partner role required' });
  }
};

// Optional auth — attaches req.user if valid token present, but never blocks
exports.optionalProtect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_foodhub_secret_key_123');
      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      // invalid token — just continue without user
    }
  }
  next();
};
