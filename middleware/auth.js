const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret (should match the one in auth routes)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Authentication middleware using JWT token verification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'UNAUTHORIZED'
      });
    }

    // Verify JWT token and extract user ID
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload.',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated.',
        code: 'UNAUTHORIZED'
      });
    }

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.',
        code: 'UNAUTHORIZED'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed.',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = { authenticateToken };
