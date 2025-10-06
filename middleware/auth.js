const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret (should match the one in auth routes)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Authentication middleware using JWT token verification
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Authentication attempt:', {
      url: req.url,
      method: req.method,
      authHeader: req.headers['authorization'] ? 'Present' : 'Missing',
      timestamp: new Date().toISOString()
    });

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('🔍 Token received:', token.substring(0, 20) + '...');

    // Verify JWT token and extract user ID
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token decoded:', { userId: decoded.userId, exp: decoded.exp });
    
    const userId = decoded.userId;

    if (!userId) {
      console.log('❌ No userId in token payload');
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload.',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(401).json({
        success: false,
        error: 'User not found.',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account deactivated:', userId);
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated.',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('✅ Authentication successful:', {
      userId: user._id,
      email: user.email
    });

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', {
      name: error.name,
      message: error.message,
      url: req.url,
      method: req.method
    });
    
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
