const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const WeightEntry = require('../models/WeightEntry');
const WeightGoal = require('../models/WeightGoal');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateAddWeight = [
  body('weight')
    .isFloat({ min: 20.0, max: 500.0 })
    .withMessage('Weight must be between 20.0 and 500.0 kg'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

const validateGoalWeight = [
  body('goal_weight')
    .isFloat({ min: 20.0, max: 500.0 })
    .withMessage('Goal weight must be between 20.0 and 500.0 kg')
];

const validateUpdateWeight = [
  param('entry_id')
    .isMongoId()
    .withMessage('Invalid entry ID'),
  body('weight')
    .isFloat({ min: 20.0, max: 500.0 })
    .withMessage('Weight must be between 20.0 and 500.0 kg')
];

const validateDeleteWeight = [
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

// 1. POST /api/weight/add - Add weight entry
router.post('/add', validateAddWeight, async (req, res) => {
  try {
    console.log('⚖️ Add weight entry request received:', {
      userId: req.user.id,
      weight: req.body.weight,
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

    const { weight, date } = req.body;
    const userId = req.user.id;

    // Set date (default to current time if not provided)
    const entryDate = date ? new Date(date) : new Date();

    // Multiple entries per day are now allowed for testing purposes

    // Create new weight entry
    const entry = new WeightEntry({
      user_id: userId,
      weight: weight,
      date: entryDate
    });

    await entry.save();

    console.log('✅ Weight entry added:', {
      entryId: entry._id,
      userId: userId,
      weight: weight,
      date: entryDate
    });

    res.status(201).json({
      success: true,
      entry: {
        id: entry._id,
        user_id: entry.user_id,
        weight: entry.weight,
        date: entry.date,
        created_at: entry.created_at
      }
    });

  } catch (error) {
    console.error('❌ Add weight entry error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: 'Failed to add weight entry',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. POST /api/weight/goal - Set goal weight
router.post('/goal', validateGoalWeight, async (req, res) => {
  try {
    console.log('🎯 Set goal weight request received:', {
      userId: req.user.id,
      goalWeight: req.body.goal_weight,
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

    const { goal_weight } = req.body;
    const userId = req.user.id;

    // Find or create goal
    const goal = await WeightGoal.findOrCreateGoal(userId, goal_weight);

    console.log('✅ Goal weight set:', {
      goalId: goal._id,
      userId: userId,
      goalWeight: goal_weight
    });

    res.json({
      success: true,
      goal: {
        id: goal._id,
        user_id: goal.user_id,
        goal_weight: goal.goal_weight,
        created_at: goal.created_at,
        updated_at: goal.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Set goal weight error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set goal weight',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/weight/history - Get weight history
router.get('/history', validateGetHistory, async (req, res) => {
  try {
    console.log('📊 Get weight history request:', {
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
      WeightEntry.getUserEntries(userId, { page: parseInt(page), limit: parseInt(limit) }),
      WeightEntry.countUserEntries(userId)
    ]);

    const totalPages = Math.ceil(totalEntries / limit);

    console.log('✅ Weight history retrieved:', {
      userId: userId,
      count: entries.length,
      total: totalEntries
    });

    res.json({
      success: true,
      entries: entries.map(entry => ({
        id: entry._id,
        user_id: entry.user_id,
        weight: entry.weight,
        date: entry.date,
        created_at: entry.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEntries,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error('❌ Get weight history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weight history',
      code: 'SERVER_ERROR'
    });
  }
});

// 4. GET /api/weight/current - Get current weight
router.get('/current', async (req, res) => {
  try {
    console.log('⚖️ Get current weight request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const currentEntry = await WeightEntry.getCurrentWeight(userId);

    if (!currentEntry) {
      return res.json({
        success: true,
        current_weight: null,
        last_updated: null
      });
    }

    console.log('✅ Current weight retrieved:', {
      userId: userId,
      weight: currentEntry.weight,
      date: currentEntry.date
    });

    res.json({
      success: true,
      current_weight: currentEntry.weight,
      last_updated: currentEntry.date
    });

  } catch (error) {
    console.error('❌ Get current weight error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current weight',
      code: 'SERVER_ERROR'
    });
  }
});

// 5. GET /api/weight/goal - Get goal weight
router.get('/goal', async (req, res) => {
  try {
    console.log('🎯 Get goal weight request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;
    const goal = await WeightGoal.getUserGoal(userId);

    if (!goal) {
      return res.json({
        success: true,
        goal_weight: null,
        set_date: null
      });
    }

    console.log('✅ Goal weight retrieved:', {
      userId: userId,
      goalWeight: goal.goal_weight,
      setDate: goal.created_at
    });

    res.json({
      success: true,
      goal_weight: goal.goal_weight,
      set_date: goal.created_at
    });

  } catch (error) {
    console.error('❌ Get goal weight error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get goal weight',
      code: 'SERVER_ERROR'
    });
  }
});

// 6. GET /api/weight/analytics - Get weight analytics
router.get('/analytics', async (req, res) => {
  try {
    console.log('📈 Get weight analytics request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;

    // Get analytics data
    const [analyticsData, goal] = await Promise.all([
      WeightEntry.getWeightAnalytics(userId),
      WeightGoal.getUserGoal(userId)
    ]);

    if (!analyticsData || analyticsData.length === 0) {
      return res.json({
        success: true,
        analytics: {
          current_weight: null,
          goal_weight: goal?.goal_weight || null,
          weight_to_lose: null,
          progress_percentage: null,
          total_entries: 0,
          weight_change_this_week: null,
          weight_change_this_month: null,
          average_weekly_change: null,
          trend: null,
          start_weight: null,
          total_weight_lost: null,
          days_since_start: null
        }
      });
    }

    const data = analyticsData[0];
    const currentWeight = data.currentWeight;
    const startWeight = data.startWeight;
    const goalWeight = goal?.goal_weight;
    
    // Calculate analytics
    const weightToLose = goalWeight ? Math.max(0, currentWeight - goalWeight) : null;
    const progressPercentage = (goalWeight && startWeight) ? 
      Math.min(100, Math.max(0, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100)) : null;
    
    const totalWeightLost = startWeight - currentWeight;
    const daysSinceStart = Math.floor((data.latestDate - data.earliestDate) / (1000 * 60 * 60 * 24));
    
    // Calculate weekly and monthly changes
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    const weeklyEntry = await WeightEntry.findOne({
      user_id: userId,
      date: { $lte: oneWeekAgo }
    }).sort({ date: -1 });
    
    const monthlyEntry = await WeightEntry.findOne({
      user_id: userId,
      date: { $lte: oneMonthAgo }
    }).sort({ date: -1 });
    
    const weightChangeThisWeek = weeklyEntry ? currentWeight - weeklyEntry.weight : null;
    const weightChangeThisMonth = monthlyEntry ? currentWeight - monthlyEntry.weight : null;
    
    const averageWeeklyChange = daysSinceStart > 0 ? totalWeightLost / (daysSinceStart / 7) : null;
    const trend = totalWeightLost > 0 ? 'losing' : totalWeightLost < 0 ? 'gaining' : 'maintaining';

    console.log('✅ Weight analytics calculated:', {
      userId: userId,
      totalEntries: data.totalEntries,
      currentWeight: currentWeight,
      goalWeight: goalWeight
    });

    res.json({
      success: true,
      analytics: {
        current_weight: Math.round(currentWeight * 100) / 100,
        goal_weight: goalWeight,
        weight_to_lose: weightToLose ? Math.round(weightToLose * 100) / 100 : null,
        progress_percentage: progressPercentage ? Math.round(progressPercentage * 100) / 100 : null,
        total_entries: data.totalEntries,
        weight_change_this_week: weightChangeThisWeek ? Math.round(weightChangeThisWeek * 100) / 100 : null,
        weight_change_this_month: weightChangeThisMonth ? Math.round(weightChangeThisMonth * 100) / 100 : null,
        average_weekly_change: averageWeeklyChange ? Math.round(averageWeeklyChange * 100) / 100 : null,
        trend: trend,
        start_weight: Math.round(startWeight * 100) / 100,
        total_weight_lost: Math.round(totalWeightLost * 100) / 100,
        days_since_start: daysSinceStart
      }
    });

  } catch (error) {
    console.error('❌ Get weight analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weight analytics',
      code: 'SERVER_ERROR'
    });
  }
});

// 7. PUT /api/weight/entry/:entry_id - Update weight entry
router.put('/entry/:entry_id', validateUpdateWeight, async (req, res) => {
  try {
    console.log('✏️ Update weight entry request received:', {
      userId: req.user.id,
      entryId: req.params.entry_id,
      weight: req.body.weight,
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
    const { weight } = req.body;
    const userId = req.user.id;

    // Find the entry
    const entry = await WeightEntry.findOne({
      _id: entry_id,
      user_id: userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Weight entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    // Update the entry
    entry.weight = weight;
    entry.updated_at = Date.now();
    await entry.save();

    console.log('✅ Weight entry updated:', {
      entryId: entry._id,
      userId: userId,
      newWeight: weight
    });

    res.json({
      success: true,
      entry: {
        id: entry._id,
        user_id: entry.user_id,
        weight: entry.weight,
        date: entry.date,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Update weight entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update weight entry',
      code: 'SERVER_ERROR'
    });
  }
});

// 8. DELETE /api/weight/entry/:entry_id - Delete weight entry
router.delete('/entry/:entry_id', validateDeleteWeight, async (req, res) => {
  try {
    console.log('🗑️ Delete weight entry request received:', {
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

    // Find and delete the entry
    const entry = await WeightEntry.findOneAndDelete({
      _id: entry_id,
      user_id: userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Weight entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    console.log('✅ Weight entry deleted:', {
      entryId: entry._id,
      userId: userId,
      weight: entry.weight
    });

    res.json({
      success: true,
      message: 'Weight entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete weight entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete weight entry',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
