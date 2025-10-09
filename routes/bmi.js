const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const BMI = require('../models/BMI');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateAddBMI = [
  body('height')
    .isFloat({ min: 50, max: 300 })
    .withMessage('Height must be between 50 and 300 cm'),
  body('weight')
    .isFloat({ min: 20, max: 500 })
    .withMessage('Weight must be between 20 and 500 kg'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

// Helper function to calculate BMI
const calculateBMI = (weight, height) => {
  // weight in kg, height in cm
  // BMI = weight (kg) / (height (m))²
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return Math.round(bmi * 100) / 100; // Round to 2 decimal places
};

const validateDeleteEntry = [
  param('entry_id')
    .isMongoId()
    .withMessage('Invalid entry ID')
];

const validateGetHistory = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// 1. POST /api/bmi/add - Add BMI entry
router.post('/add', validateAddBMI, async (req, res) => {
  try {
    console.log('📊 Add BMI entry request received:', {
      userId: req.user.id,
      height: req.body.height,
      weight: req.body.weight,
      bmi: req.body.bmi,
      date: req.body.date,
      timestamp: new Date().toISOString()
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { height, weight, date } = req.body;
    const userId = req.user.id;

    // Calculate BMI automatically
    const bmi = calculateBMI(weight, height);

    // Set date (default to current time if not provided)
    const entryDate = date ? new Date(date) : new Date();

    // Create new BMI entry
    const entry = new BMI({
      user_id: userId,
      height: height,
      weight: weight,
      bmi: bmi,
      date: entryDate
    });

    await entry.save();

    console.log('✅ BMI entry added:', {
      entryId: entry._id,
      userId: userId,
      height: height,
      weight: weight,
      bmi: bmi,
      category: entry.category,
      date: entryDate
    });

    res.status(201).json({
      success: true,
      entry: {
        id: entry._id,
        height: entry.height,
        weight: entry.weight,
        bmi: entry.bmi,
        date: entry.date
      }
    });

  } catch (error) {
    console.error('❌ Add BMI entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add BMI entry',
      code: 'SERVER_ERROR'
    });
  }
});

// 2. GET /api/bmi/history - Get BMI history with pagination
router.get('/history', validateGetHistory, async (req, res) => {
  try {
    console.log('📋 Get BMI history request:', {
      userId: req.user.id,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const {
      page = 1,
      limit = 20
    } = req.query;

    // Get entries and total count
    const [entries, totalEntries] = await Promise.all([
      BMI.getUserEntries(userId, { page: parseInt(page), limit: parseInt(limit) }),
      BMI.countUserEntries(userId)
    ]);

    const totalPages = Math.ceil(totalEntries / limit);

    console.log('✅ BMI history retrieved:', {
      userId: userId,
      count: entries.length,
      total: totalEntries
    });

    res.json({
      success: true,
      entries: entries.map(entry => ({
        id: entry._id,
        height: entry.height,
        weight: entry.weight,
        bmi: entry.bmi,
        date: entry.date
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEntries
      }
    });

  } catch (error) {
    console.error('❌ Get BMI history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get BMI history',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/bmi/current - Get current/latest BMI entry
router.get('/current', async (req, res) => {
  try {
    console.log('📊 Get current BMI request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const latestEntry = await BMI.getLatestEntry(userId);

    if (!latestEntry) {
      return res.json({
        success: true,
        entry: null
      });
    }

    console.log('✅ Current BMI entry found:', {
      entryId: latestEntry._id,
      userId: userId,
      bmi: latestEntry.bmi,
      category: latestEntry.category
    });

    res.json({
      success: true,
      entry: {
        id: latestEntry._id,
        height: latestEntry.height,
        weight: latestEntry.weight,
        bmi: latestEntry.bmi,
        date: latestEntry.date
      }
    });

  } catch (error) {
    console.error('❌ Get current BMI error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current BMI',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. DELETE /api/bmi/delete/:entry_id - Delete BMI entry
router.delete('/delete/:entry_id', validateDeleteEntry, async (req, res) => {
  try {
    console.log('🗑️  Delete BMI entry request received:', {
      userId: req.user.id,
      entryId: req.params.entry_id,
      timestamp: new Date().toISOString()
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { entry_id } = req.params;
    const userId = req.user.id;

    // Find and delete the entry (only if it belongs to the user)
    const entry = await BMI.findOneAndDelete({
      _id: entry_id,
      user_id: userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'BMI entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    console.log('✅ BMI entry deleted:', {
      entryId: entry._id,
      userId: userId,
      bmi: entry.bmi,
      category: entry.category
    });

    res.json({
      success: true,
      message: 'BMI entry deleted'
    });

  } catch (error) {
    console.error('❌ Delete BMI entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete BMI entry',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;

