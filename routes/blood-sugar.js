const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const BloodSugar = require('../models/BloodSugar');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateAddBloodSugar = [
  body('value')
    .isFloat({ min: 20, max: 600 })
    .withMessage('Blood sugar value must be between 20 and 600 mg/dL'),
  body('meal_type')
    .isIn(['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'])
    .withMessage('Meal type must be one of: fasting, before_meal, after_meal, bedtime, random'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

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

// 1. POST /api/blood-sugar/add - Add blood sugar entry
router.post('/add', validateAddBloodSugar, async (req, res) => {
  try {
    console.log('🩸 Add blood sugar entry request received:', {
      userId: req.user.id,
      value: req.body.value,
      mealType: req.body.meal_type,
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

    const { value, meal_type, date } = req.body;
    const userId = req.user.id;

    // Set date (default to current time if not provided)
    const entryDate = date ? new Date(date) : new Date();

    // Validate historical date if provided
    if (date) {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      // Check if date is in the future
      if (entryDate > today) {
        return res.status(400).json({
          success: false,
          error: 'HISTORICAL_DATE_FUTURE',
          message: 'Cannot add historical data for future dates'
        });
      }

      // Check if date is more than one year ago
      if (entryDate < oneYearAgo) {
        return res.status(400).json({
          success: false,
          error: 'HISTORICAL_DATE_TOO_OLD',
          message: 'Historical data can only be added for dates within the last year',
          details: {
            provided_date: entryDate.toISOString(),
            max_historical_date: oneYearAgo.toISOString()
          }
        });
      }
    }

    // Determine if this is a historical entry
    const isHistorical = date ? (new Date(date) < new Date(new Date().setHours(0, 0, 0, 0))) : false;

    // Create new blood sugar entry
    const entry = new BloodSugar({
      user_id: userId,
      value: value,
      meal_type: meal_type,
      date: entryDate,
      is_historical: isHistorical
    });

    await entry.save();

    console.log('✅ Blood sugar entry added:', {
      entryId: entry._id,
      userId: userId,
      value: value,
      mealType: meal_type,
      category: entry.category,
      date: entryDate
    });

    res.status(201).json({
      success: true,
      message: isHistorical ? 'Historical blood sugar entry added successfully' : 'Blood sugar entry added successfully',
      entry: {
        id: entry._id,
        user_id: entry.user_id,
        value: entry.value,
        meal_type: entry.meal_type,
        category: entry.category,
        date: entry.date,
        is_historical: entry.is_historical,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Add blood sugar entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add blood sugar entry',
      code: 'SERVER_ERROR'
    });
  }
});

// 2. GET /api/blood-sugar/history - Get blood sugar history with pagination
router.get('/history', validateGetHistory, async (req, res) => {
  try {
    console.log('📋 Get blood sugar history request:', {
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
      BloodSugar.getUserEntries(userId, { page: parseInt(page), limit: parseInt(limit) }),
      BloodSugar.countUserEntries(userId)
    ]);

    const totalPages = Math.ceil(totalEntries / limit);

    console.log('✅ Blood sugar history retrieved:', {
      userId: userId,
      count: entries.length,
      total: totalEntries
    });

    res.json({
      success: true,
      entries: entries.map(entry => ({
        id: entry._id,
        user_id: entry.user_id,
        value: entry.value,
        meal_type: entry.meal_type,
        category: entry.category,
        date: entry.date,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_entries: totalEntries,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get blood sugar history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blood sugar history',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/blood-sugar/current - Get current/latest blood sugar entry
router.get('/current', async (req, res) => {
  try {
    console.log('📊 Get current blood sugar request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const latestEntry = await BloodSugar.getLatestEntry(userId);

    if (!latestEntry) {
      return res.json({
        success: true,
        entry: null
      });
    }

    console.log('✅ Current blood sugar entry found:', {
      entryId: latestEntry._id,
      userId: userId,
      value: latestEntry.value,
      mealType: latestEntry.meal_type
    });

    res.json({
      success: true,
      entry: {
        id: latestEntry._id,
        user_id: latestEntry.user_id,
        value: latestEntry.value,
        meal_type: latestEntry.meal_type,
        category: latestEntry.category,
        date: latestEntry.date,
        created_at: latestEntry.created_at,
        updated_at: latestEntry.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Get current blood sugar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current blood sugar',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. DELETE /api/blood-sugar/delete/:entry_id - Delete blood sugar entry
router.delete('/delete/:entry_id', validateDeleteEntry, async (req, res) => {
  try {
    console.log('🗑️  Delete blood sugar entry request received:', {
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
    const entry = await BloodSugar.findOneAndDelete({
      _id: entry_id,
      user_id: userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blood sugar entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    console.log('✅ Blood sugar entry deleted:', {
      entryId: entry._id,
      userId: userId,
      value: entry.value,
      mealType: entry.meal_type
    });

    res.json({
      success: true,
      message: 'Blood sugar entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete blood sugar entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blood sugar entry',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;

