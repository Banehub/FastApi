const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const FastingSession = require('../models/FastingSession');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateStartSession = [
  body('start_type')
    .isIn(['immediate', 'custom'])
    .withMessage('Start type must be either "immediate" or "custom"'),
  body('custom_start_hours')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Custom start hours must be a non-negative integer'),
  body('custom_start_minutes')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Custom start minutes must be between 0 and 59')
];

const validateStopSession = [
  param('session_id')
    .isMongoId()
    .withMessage('Invalid session ID'),
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date')
];

const validateGetSessions = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'completed', 'all'])
    .withMessage('Status must be "active", "completed", or "all"')
];

// Helper function to calculate custom start time
const calculateCustomStartTime = (hours, minutes) => {
  const now = new Date();
  const customStartTime = new Date(now.getTime() - (hours * 60 + minutes) * 60 * 1000);
  return customStartTime;
};

// 1. POST /api/fasting/start - Start a new fasting session
router.post('/start', validateStartSession, async (req, res) => {
  try {
    console.log('🏃‍♂️ Start fasting request received:', {
      userId: req.user.id,
      startType: req.body.start_type,
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

    const { start_type, custom_start_hours, custom_start_minutes } = req.body;
    const userId = req.user.id;

    // Check if user already has an active session
    const existingSession = await FastingSession.findActiveSession(userId);
    if (existingSession) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active fasting session',
        code: 'ALREADY_FASTING'
      });
    }

    // Calculate start time
    let startTime;
    if (start_type === 'immediate') {
      startTime = new Date();
    } else {
      // Custom start time
      if (!custom_start_hours && !custom_start_minutes) {
        return res.status(400).json({
          success: false,
          error: 'Custom start hours and minutes are required for custom start type',
          code: 'VALIDATION_ERROR'
        });
      }
      startTime = calculateCustomStartTime(
        custom_start_hours || 0,
        custom_start_minutes || 0
      );
    }

    // Create new fasting session
    const session = new FastingSession({
      user_id: userId,
      start_time: startTime,
      start_type: start_type,
      custom_start_hours: start_type === 'custom' ? custom_start_hours : null,
      custom_start_minutes: start_type === 'custom' ? custom_start_minutes : null,
      status: 'active'
    });

    await session.save();

    console.log('✅ Fasting session started:', {
      sessionId: session._id,
      userId: userId,
      startTime: startTime
    });

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        user_id: session.user_id,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        start_type: session.start_type,
        custom_start_hours: session.custom_start_hours,
        custom_start_minutes: session.custom_start_minutes,
        status: session.status
      }
    });

  } catch (error) {
    console.error('❌ Start fasting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start fasting session',
      code: 'SERVER_ERROR'
    });
  }
});

// 2. PUT /api/fasting/stop/:session_id - End an active fasting session
router.put('/stop/:session_id', validateStopSession, async (req, res) => {
  try {
    console.log('🛑 Stop fasting request received:', {
      userId: req.user.id,
      sessionId: req.params.session_id,
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

    const { session_id } = req.params;
    const { end_time } = req.body;
    const userId = req.user.id;

    // Find the session
    const session = await FastingSession.findOne({
      _id: session_id,
      user_id: userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Fasting session not found',
        code: 'INVALID_SESSION'
      });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active',
        code: 'NO_ACTIVE_SESSION'
      });
    }

    // Set end time (default to current time if not provided)
    const endTime = end_time ? new Date(end_time) : new Date();
    
    // Update session
    session.end_time = endTime;
    session.status = 'completed';
    await session.save();

    console.log('✅ Fasting session stopped:', {
      sessionId: session._id,
      userId: userId,
      duration: session.duration_minutes
    });

    res.json({
      success: true,
      session: {
        id: session._id,
        user_id: session.user_id,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        start_type: session.start_type,
        custom_start_hours: session.custom_start_hours,
        custom_start_minutes: session.custom_start_minutes,
        status: session.status
      }
    });

  } catch (error) {
    console.error('❌ Stop fasting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop fasting session',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/fasting/current - Get current active fasting session
router.get('/current', async (req, res) => {
  try {
    console.log('📊 Get current session request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const activeSession = await FastingSession.findActiveSession(userId);

    if (!activeSession) {
      return res.json({
        success: true,
        session: null
      });
    }

    console.log('✅ Current session found:', {
      sessionId: activeSession._id,
      userId: userId
    });

    res.json({
      success: true,
      session: {
        id: activeSession._id,
        user_id: activeSession.user_id,
        start_time: activeSession.start_time,
        end_time: activeSession.end_time,
        duration_minutes: activeSession.duration_minutes,
        start_type: activeSession.start_type,
        custom_start_hours: activeSession.custom_start_hours,
        custom_start_minutes: activeSession.custom_start_minutes,
        status: activeSession.status
      }
    });

  } catch (error) {
    console.error('❌ Get current session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current session',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. GET /api/fasting/sessions - Get all fasting sessions with pagination
router.get('/sessions', validateGetSessions, async (req, res) => {
  try {
    console.log('📋 Get sessions request:', {
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
      limit = 20,
      status = 'all'
    } = req.query;

    // Get sessions and total count
    const [sessions, totalSessions] = await Promise.all([
      FastingSession.getUserSessions(userId, { page: parseInt(page), limit: parseInt(limit), status }),
      FastingSession.countUserSessions(userId, status)
    ]);

    const totalPages = Math.ceil(totalSessions / limit);

    console.log('✅ Sessions retrieved:', {
      userId: userId,
      count: sessions.length,
      total: totalSessions
    });

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session._id,
        user_id: session.user_id,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        start_type: session.start_type,
        custom_start_hours: session.custom_start_hours,
        custom_start_minutes: session.custom_start_minutes,
        status: session.status
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_sessions: totalSessions,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
