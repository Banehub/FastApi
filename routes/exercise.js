const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const ExerciseSession = require('../models/ExerciseSession');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateStartSession = [
  body('exercise_type')
    .isIn(['running', 'cycling', 'walking', 'swimming', 'weightlifting', 'yoga', 'hiit', 'other'])
    .withMessage('Exercise type must be one of: running, cycling, walking, swimming, weightlifting, yoga, hiit, other'),
  body('start_time')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date')
];

const validateStopSession = [
  param('session_id')
    .isMongoId()
    .withMessage('Invalid session ID'),
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),
  body('end_reason')
    .optional()
    .isIn(['completed', 'cancelled', 'interrupted'])
    .withMessage('End reason must be one of: completed, cancelled, interrupted')
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
    .isIn(['active', 'completed', 'cancelled', 'all'])
    .withMessage('Status must be "active", "completed", "cancelled", or "all"')
];

// 1. POST /api/exercise/start - Start a new exercise session
router.post('/start', validateStartSession, async (req, res) => {
  try {
    console.log('🏃‍♂️ Start exercise request received:', {
      userId: req.user.id,
      exerciseType: req.body.exercise_type,
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

    const { exercise_type, start_time } = req.body;
    const userId = req.user.id;

    // Check if user already has an active session
    const existingSession = await ExerciseSession.findActiveSession(userId);
    if (existingSession) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active exercise session',
        code: 'ACTIVE_SESSION_EXISTS'
      });
    }

    // Set start time (default to current time if not provided)
    const sessionStartTime = start_time ? new Date(start_time) : new Date();

    // Create new exercise session
    const session = new ExerciseSession({
      user_id: userId,
      exercise_type: exercise_type,
      start_time: sessionStartTime,
      status: 'active'
    });

    await session.save();

    console.log('✅ Exercise session started:', {
      sessionId: session._id,
      userId: userId,
      exerciseType: exercise_type,
      startTime: sessionStartTime
    });

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        user_id: session.user_id,
        exercise_type: session.exercise_type,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        status: session.status,
        created_at: session.created_at
      }
    });

  } catch (error) {
    console.error('❌ Start exercise error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start exercise session',
      code: 'SERVER_ERROR'
    });
  }
});

// 2. PUT /api/exercise/stop/:session_id - End an active exercise session
router.put('/stop/:session_id', validateStopSession, async (req, res) => {
  try {
    console.log('🛑 Stop exercise request received:', {
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
    const { end_time, end_reason } = req.body;
    const userId = req.user.id;

    // Find the session
    const session = await ExerciseSession.findOne({
      _id: session_id,
      user_id: userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Exercise session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active',
        code: 'SESSION_ALREADY_ENDED'
      });
    }

    // Set end time (default to current time if not provided)
    const endTime = end_time ? new Date(end_time) : new Date();
    
    // Update session
    session.end_time = endTime;
    session.status = 'completed';
    session.end_reason = end_reason || 'completed';
    await session.save();

    console.log('✅ Exercise session stopped:', {
      sessionId: session._id,
      userId: userId,
      duration: session.duration_minutes,
      exerciseType: session.exercise_type
    });

    res.json({
      success: true,
      session: {
        id: session._id,
        user_id: session.user_id,
        exercise_type: session.exercise_type,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        status: session.status,
        end_reason: session.end_reason,
        created_at: session.created_at
      }
    });

  } catch (error) {
    console.error('❌ Stop exercise error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop exercise session',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/exercise/current - Get current active exercise session
router.get('/current', async (req, res) => {
  try {
    console.log('📊 Get current exercise session request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const activeSession = await ExerciseSession.findActiveSession(userId);

    if (!activeSession) {
      return res.json({
        success: true,
        session: null
      });
    }

    // Calculate current duration for active session
    const currentDuration = activeSession.end_time 
      ? activeSession.duration_minutes 
      : Math.floor((new Date() - activeSession.start_time) / (1000 * 60));

    console.log('✅ Current exercise session found:', {
      sessionId: activeSession._id,
      userId: userId,
      exerciseType: activeSession.exercise_type
    });

    res.json({
      success: true,
      session: {
        id: activeSession._id,
        user_id: activeSession.user_id,
        exercise_type: activeSession.exercise_type,
        start_time: activeSession.start_time,
        end_time: activeSession.end_time,
        duration_minutes: currentDuration,
        status: activeSession.status,
        created_at: activeSession.created_at
      }
    });

  } catch (error) {
    console.error('❌ Get current exercise session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current exercise session',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. GET /api/exercise/sessions - Get all exercise sessions with pagination
router.get('/sessions', validateGetSessions, async (req, res) => {
  try {
    console.log('📋 Get exercise sessions request:', {
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
      ExerciseSession.getUserSessions(userId, { page: parseInt(page), limit: parseInt(limit), status }),
      ExerciseSession.countUserSessions(userId, status)
    ]);

    const totalPages = Math.ceil(totalSessions / limit);

    console.log('✅ Exercise sessions retrieved:', {
      userId: userId,
      count: sessions.length,
      total: totalSessions
    });

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session._id,
        user_id: session.user_id,
        exercise_type: session.exercise_type,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        status: session.status,
        created_at: session.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalSessions,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error('❌ Get exercise sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exercise sessions',
      code: 'SERVER_ERROR'
    });
  }
});

// 5. GET /api/exercise/analytics/summary - Get exercise analytics summary
router.get('/analytics/summary', async (req, res) => {
  try {
    console.log('📈 Get exercise analytics summary request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;

    // Get all completed sessions for the user
    const sessions = await ExerciseSession.find({
      user_id: userId,
      status: 'completed'
    }).sort({ start_time: -1 });

    // Calculate summary statistics
    const totalSessions = sessions.length;
    const totalExerciseMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
    const totalExerciseHours = totalExerciseMinutes / 60;
    const averageSessionHours = totalSessions > 0 ? totalExerciseHours / totalSessions : 0;
    const longestSessionHours = sessions.length > 0 ? Math.max(...sessions.map(s => (s.duration_minutes || 0) / 60)) : 0;

    // Calculate exercise breakdown using aggregation
    const exerciseBreakdown = await ExerciseSession.getExerciseAnalytics(userId);

    // Convert to object format
    const exerciseBreakdownObj = {};
    exerciseBreakdown.forEach(exercise => {
      exerciseBreakdownObj[exercise.exercise_type] = {
        sessions: exercise.sessions,
        total_hours: exercise.total_hours,
        average_hours: exercise.average_hours
      };
    });

    // Calculate current streak (consecutive days with completed sessions)
    let currentStreakDays = 0;
    if (sessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sessions.length; i++) {
        const sessionDate = new Date(sessions[i].end_time);
        sessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === i) {
          currentStreakDays++;
        } else {
          break;
        }
      }
    }

    console.log('✅ Exercise analytics summary calculated:', {
      userId: userId,
      totalSessions: totalSessions,
      totalExerciseHours: totalExerciseHours
    });

    res.json({
      success: true,
      summary: {
        total_sessions: totalSessions,
        total_exercise_hours: Math.round(totalExerciseHours * 100) / 100,
        average_session_hours: Math.round(averageSessionHours * 100) / 100,
        longest_session_hours: Math.round(longestSessionHours * 100) / 100,
        current_streak_days: currentStreakDays,
        exercise_breakdown: exerciseBreakdownObj
      }
    });

  } catch (error) {
    console.error('❌ Get exercise analytics summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exercise analytics summary',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
