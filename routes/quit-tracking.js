const express = require('express');
const { body, validationResult, param } = require('express-validator');
const QuitTracking = require('../models/QuitTracking');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateSaveQuitTracking = [
  body('quitType')
    .isIn(['smoking', 'vaping'])
    .withMessage('Quit type must be either smoking or vaping'),
  body('quitDate')
    .isISO8601()
    .withMessage('Quit date must be a valid ISO 8601 date'),
  body('daysQuit')
    .isInt({ min: 0 })
    .withMessage('Days quit must be a non-negative integer')
];

const validateUpdateQuitTracking = [
  body('quitType')
    .isIn(['smoking', 'vaping'])
    .withMessage('Quit type must be either smoking or vaping'),
  body('quitDate')
    .isISO8601()
    .withMessage('Quit date must be a valid ISO 8601 date'),
  body('daysQuit')
    .isInt({ min: 0 })
    .withMessage('Days quit must be a non-negative integer')
];

const validateGetQuitTracking = [
  param('quitType')
    .isIn(['smoking', 'vaping'])
    .withMessage('Quit type must be either smoking or vaping')
];

const validateDeleteQuitTracking = [
  param('quitType')
    .isIn(['smoking', 'vaping'])
    .withMessage('Quit type must be either smoking or vaping')
];

// 1. POST /api/quit-tracking/save - Save quit tracking data
router.post('/save', validateSaveQuitTracking, async (req, res) => {
  try {
    console.log('🚭 Save quit tracking request received:', {
      userId: req.user.id,
      quitType: req.body.quitType,
      quitDate: req.body.quitDate,
      daysQuit: req.body.daysQuit,
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

    const { quitType, quitDate, daysQuit } = req.body;
    const userId = req.user.id;

    // Find or create quit tracking record
    const quitTracking = await QuitTracking.findOrCreateQuitTracking(
      userId,
      quitType,
      quitDate,
      daysQuit
    );

    console.log('✅ Quit tracking data saved:', {
      quitTrackingId: quitTracking._id,
      userId: userId,
      quitType: quitType,
      daysQuit: daysQuit
    });

    res.status(201).json({
      success: true,
      message: 'Quit tracking data saved successfully',
      data: {
        id: quitTracking._id,
        userId: quitTracking.user_id,
        quitType: quitTracking.quit_type,
        quitDate: quitTracking.quit_date,
        daysQuit: quitTracking.days_quit,
        createdAt: quitTracking.created_at,
        updatedAt: quitTracking.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Save quit tracking error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: 'Failed to save quit tracking data',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. GET /api/quit-tracking/get/:quitType - Get quit tracking data
router.get('/get/:quitType', validateGetQuitTracking, async (req, res) => {
  try {
    console.log('🚭 Get quit tracking request received:', {
      userId: req.user.id,
      quitType: req.params.quitType,
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

    const { quitType } = req.params;
    const userId = req.user.id;

    const quitTracking = await QuitTracking.getUserQuitTracking(userId, quitType);

    if (!quitTracking) {
      return res.json({
        success: true,
        data: null
      });
    }

    console.log('✅ Quit tracking data retrieved:', {
      quitTrackingId: quitTracking._id,
      userId: userId,
      quitType: quitType,
      daysQuit: quitTracking.days_quit
    });

    res.json({
      success: true,
      data: {
        id: quitTracking._id,
        userId: quitTracking.user_id,
        quitType: quitTracking.quit_type,
        quitDate: quitTracking.quit_date,
        daysQuit: quitTracking.days_quit,
        createdAt: quitTracking.created_at,
        updatedAt: quitTracking.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Get quit tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quit tracking data',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. PUT /api/quit-tracking/update - Update quit tracking data
router.put('/update', validateUpdateQuitTracking, async (req, res) => {
  try {
    console.log('🚭 Update quit tracking request received:', {
      userId: req.user.id,
      quitType: req.body.quitType,
      quitDate: req.body.quitDate,
      daysQuit: req.body.daysQuit,
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

    const { quitType, quitDate, daysQuit } = req.body;
    const userId = req.user.id;

    const quitTracking = await QuitTracking.getUserQuitTracking(userId, quitType);

    if (!quitTracking) {
      return res.status(404).json({
        success: false,
        error: 'Quit tracking data not found',
        code: 'QUIT_TRACKING_NOT_FOUND'
      });
    }

    // Update the quit tracking record
    quitTracking.quit_date = new Date(quitDate);
    quitTracking.days_quit = parseInt(daysQuit);
    quitTracking.updated_at = Date.now();
    await quitTracking.save();

    console.log('✅ Quit tracking data updated:', {
      quitTrackingId: quitTracking._id,
      userId: userId,
      quitType: quitType,
      daysQuit: daysQuit
    });

    res.json({
      success: true,
      message: 'Quit tracking data updated successfully',
      data: {
        id: quitTracking._id,
        userId: quitTracking.user_id,
        quitType: quitTracking.quit_type,
        quitDate: quitTracking.quit_date,
        daysQuit: quitTracking.days_quit,
        updatedAt: quitTracking.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Update quit tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quit tracking data',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. DELETE /api/quit-tracking/delete/:quitType - Delete quit tracking data
router.delete('/delete/:quitType', validateDeleteQuitTracking, async (req, res) => {
  try {
    console.log('🚭 Delete quit tracking request received:', {
      userId: req.user.id,
      quitType: req.params.quitType,
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

    const { quitType } = req.params;
    const userId = req.user.id;

    const quitTracking = await QuitTracking.deleteUserQuitTracking(userId, quitType);

    if (!quitTracking) {
      return res.status(404).json({
        success: false,
        error: 'Quit tracking data not found',
        code: 'QUIT_TRACKING_NOT_FOUND'
      });
    }

    console.log('✅ Quit tracking data deleted:', {
      quitTrackingId: quitTracking._id,
      userId: userId,
      quitType: quitType
    });

    res.json({
      success: true,
      message: 'Quit tracking data deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete quit tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quit tracking data',
      code: 'SERVER_ERROR'
    });
  }
});

// 5. GET /api/quit-tracking/all - Get all quit tracking data for user
router.get('/all', async (req, res) => {
  try {
    console.log('🚭 Get all quit tracking request received:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const allQuitTracking = await QuitTracking.getAllUserQuitTracking(userId);

    console.log('✅ All quit tracking data retrieved:', {
      userId: userId,
      count: allQuitTracking.length
    });

    res.json({
      success: true,
      data: allQuitTracking.map(quitTracking => ({
        id: quitTracking._id,
        userId: quitTracking.user_id,
        quitType: quitTracking.quit_type,
        quitDate: quitTracking.quit_date,
        daysQuit: quitTracking.days_quit,
        createdAt: quitTracking.created_at,
        updatedAt: quitTracking.updated_at
      }))
    });

  } catch (error) {
    console.error('❌ Get all quit tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all quit tracking data',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
