const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const WeightEntry = require('../models/WeightEntry');
const WeightGoal = require('../models/WeightGoal');
const BloodPressure = require('../models/BloodPressure');
const BloodSugar = require('../models/BloodSugar');
const BMI = require('../models/BMI');
const ExerciseSession = require('../models/ExerciseSession');
const FastingSession = require('../models/FastingSession');
const QuitTracking = require('../models/QuitTracking');

const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Validation middleware
const validateRegister = [
  body('name')
    .notEmpty()
    .trim()
    .withMessage('Name is required'),
  body('surname')
    .notEmpty()
    .trim()
    .withMessage('Surname is required'),
  body('cellNumber')
    .notEmpty()
    .trim()
    .withMessage('Cell number is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register endpoint
router.post('/register', validateRegister, async (req, res) => {
  try {
    console.log('📝 Register request received:', { 
      email: req.body.email, 
      name: req.body.name,
      surname: req.body.surname,
      timestamp: new Date().toISOString()
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, surname, cellNumber, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create new user
    const user = new User({
      firstName: name,
      lastName: surname,
      phone: cellNumber,
      email,
      password
    });

    await user.save();

    console.log('💾 User saved to database:', {
      database: 'fastapi',
      collection: 'users',
      userId: user._id,
      email: user.email
    });

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ User registered successfully:', { 
      userId: user._id, 
      email: user.email,
      name: user.firstName,
      surname: user.lastName
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.firstName,
          surname: user.lastName,
          cellNumber: user.phone,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
  try {
    console.log('🔐 Login request received:', { 
      email: req.body.email,
      timestamp: new Date().toISOString()
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ User logged in successfully:', { 
      userId: user._id, 
      email: user.email,
      name: user.firstName,
      tokenPreview: token.substring(0, 20) + '...'
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.firstName
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user profile endpoint (protected route)
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Delete account endpoint (protected route)
router.delete('/delete-account', async (req, res) => {
  try {
    console.log('🗑️ Delete account request received:', {
      timestamp: new Date().toISOString()
    });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Find user first to confirm they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🗑️ Starting account deletion for user:', {
      userId: userId,
      email: user.email,
      name: user.firstName
    });

    // Delete all user data from all collections
    const deletionResults = await Promise.allSettled([
      // Delete weight-related data
      WeightEntry.deleteMany({ user_id: userId }),
      WeightGoal.deleteMany({ user_id: userId }),
      
      // Delete health data
      BloodPressure.deleteMany({ user_id: userId }),
      BloodSugar.deleteMany({ user_id: userId }),
      BMI.deleteMany({ user_id: userId }),
      
      // Delete activity data
      ExerciseSession.deleteMany({ user_id: userId }),
      FastingSession.deleteMany({ user_id: userId }),
      
      // Delete quit tracking data
      QuitTracking.deleteMany({ user_id: userId }),
      
      // Finally, delete the user account
      User.findByIdAndDelete(userId)
    ]);

    // Check if any deletions failed
    const failedDeletions = deletionResults.filter(result => result.status === 'rejected');
    if (failedDeletions.length > 0) {
      console.error('❌ Some deletions failed:', failedDeletions);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete some user data',
        details: failedDeletions.map(f => f.reason?.message || 'Unknown error')
      });
    }

    console.log('✅ Account deletion completed successfully:', {
      userId: userId,
      email: user.email,
      deletedCollections: [
        'users', 'weight_entries', 'weight_goals', 
        'blood_pressure', 'blood_sugar', 'bmi',
        'exercise_sessions', 'fasting_sessions', 'quit_tracking'
      ]
    });

    res.json({
      success: true,
      message: 'Account and all associated data deleted successfully',
      data: {
        deletedUserId: userId,
        deletedEmail: user.email,
        deletedAt: new Date().toISOString(),
        deletedCollections: [
          'users', 'weight_entries', 'weight_goals', 
          'blood_pressure', 'blood_sugar', 'bmi',
          'exercise_sessions', 'fasting_sessions', 'quit_tracking'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Delete account error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
