const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const BloodPressure = require('../models/BloodPressure');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateAddBloodPressure = [
  body('systolic')
    .isFloat({ min: 40, max: 250 })
    .withMessage('Systolic pressure must be between 40 and 250 mmHg'),
  body('diastolic')
    .isFloat({ min: 20, max: 150 })
    .withMessage('Diastolic pressure must be between 20 and 150 mmHg'),
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

// 1. POST /api/blood-pressure/add - Add blood pressure entry
router.post('/add', validateAddBloodPressure, async (req, res) => {
  try {
    console.log('🩺 Add blood pressure entry request received:', {
      userId: req.user.id,
      systolic: req.body.systolic,
      diastolic: req.body.diastolic,
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

    const { systolic, diastolic, date } = req.body;
    const userId = req.user.id;

    // Set date (default to current time if not provided)
    const entryDate = date ? new Date(date) : new Date();

    // Create new blood pressure entry
    const entry = new BloodPressure({
      user_id: userId,
      systolic: systolic,
      diastolic: diastolic,
      date: entryDate
    });

    await entry.save();

    console.log('✅ Blood pressure entry added:', {
      entryId: entry._id,
      userId: userId,
      systolic: systolic,
      diastolic: diastolic,
      category: entry.category,
      date: entryDate
    });

    res.status(201).json({
      success: true,
      entry: {
        id: entry._id,
        user_id: entry.user_id,
        systolic: entry.systolic,
        diastolic: entry.diastolic,
        category: entry.category,
        date: entry.date,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Add blood pressure entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add blood pressure entry',
      code: 'SERVER_ERROR'
    });
  }
});

// 2. GET /api/blood-pressure/history - Get blood pressure history with pagination
router.get('/history', validateGetHistory, async (req, res) => {
  try {
    console.log('📋 Get blood pressure history request:', {
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
      BloodPressure.getUserEntries(userId, { page: parseInt(page), limit: parseInt(limit) }),
      BloodPressure.countUserEntries(userId)
    ]);

    const totalPages = Math.ceil(totalEntries / limit);

    console.log('✅ Blood pressure history retrieved:', {
      userId: userId,
      count: entries.length,
      total: totalEntries
    });

    res.json({
      success: true,
      entries: entries.map(entry => ({
        id: entry._id,
        user_id: entry.user_id,
        systolic: entry.systolic,
        diastolic: entry.diastolic,
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
    console.error('❌ Get blood pressure history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blood pressure history',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/blood-pressure/current - Get current/latest blood pressure entry
router.get('/current', async (req, res) => {
  try {
    console.log('📊 Get current blood pressure request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const latestEntry = await BloodPressure.getLatestEntry(userId);

    if (!latestEntry) {
      return res.json({
        success: true,
        entry: null
      });
    }

    console.log('✅ Current blood pressure entry found:', {
      entryId: latestEntry._id,
      userId: userId,
      systolic: latestEntry.systolic,
      diastolic: latestEntry.diastolic
    });

    res.json({
      success: true,
      entry: {
        id: latestEntry._id,
        user_id: latestEntry.user_id,
        systolic: latestEntry.systolic,
        diastolic: latestEntry.diastolic,
        category: latestEntry.category,
        date: latestEntry.date,
        created_at: latestEntry.created_at,
        updated_at: latestEntry.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Get current blood pressure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current blood pressure',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. DELETE /api/blood-pressure/delete/:entry_id - Delete blood pressure entry
router.delete('/delete/:entry_id', validateDeleteEntry, async (req, res) => {
  try {
    console.log('🗑️  Delete blood pressure entry request received:', {
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
    const entry = await BloodPressure.findOneAndDelete({
      _id: entry_id,
      user_id: userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blood pressure entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    console.log('✅ Blood pressure entry deleted:', {
      entryId: entry._id,
      userId: userId,
      systolic: entry.systolic,
      diastolic: entry.diastolic
    });

    res.json({
      success: true,
      message: 'Blood pressure entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete blood pressure entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blood pressure entry',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;

