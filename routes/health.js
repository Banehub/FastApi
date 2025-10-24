const express = require('express');
const { body, validationResult, query } = require('express-validator');
const WeightEntry = require('../models/WeightEntry');
const BloodPressure = require('../models/BloodPressure');
const BloodSugar = require('../models/BloodSugar');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper function to validate historical dates
const validateHistoricalDate = (date) => {
  const entryDate = new Date(date);
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Check if date is in the future
  if (entryDate > today) {
    return {
      valid: false,
      error: 'HISTORICAL_DATE_FUTURE',
      message: 'Cannot add historical data for future dates'
    };
  }

  // Check if date is more than one year ago
  if (entryDate < oneYearAgo) {
    return {
      valid: false,
      error: 'HISTORICAL_DATE_TOO_OLD',
      message: 'Historical data can only be added for dates within the last year',
      details: {
        provided_date: entryDate.toISOString(),
        max_historical_date: oneYearAgo.toISOString()
      }
    };
  }

  return { valid: true };
};

// Helper function to determine if an entry is historical
const isHistoricalEntry = (date) => {
  const entryDate = new Date(date);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const entryDateStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
  
  return entryDateStart < todayStart;
};

// Validation middleware for bulk import
const validateBulkImport = [
  body('entries')
    .isArray({ min: 1, max: 100 })
    .withMessage('Entries must be an array with 1-100 items'),
  body('entries.*.type')
    .isIn(['weight', 'blood_pressure', 'blood_sugar'])
    .withMessage('Entry type must be weight, blood_pressure, or blood_sugar'),
  body('entries.*.date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('entries.*.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('entries.*.systolic')
    .optional()
    .isFloat({ min: 40, max: 250 })
    .withMessage('Systolic pressure must be between 40 and 250 mmHg'),
  body('entries.*.diastolic')
    .optional()
    .isFloat({ min: 20, max: 150 })
    .withMessage('Diastolic pressure must be between 20 and 150 mmHg'),
  body('entries.*.meal_type')
    .optional()
    .isIn(['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'])
    .withMessage('Meal type must be one of: fasting, before_meal, after_meal, bedtime, random')
];

// 1. GET /api/health/historical-analytics - Get historical data analytics
router.get('/historical-analytics', async (req, res) => {
  try {
    console.log('📊 Get historical analytics request:', {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const userId = req.user.id;

    // Get all entries for the user
    const [weightEntries, bloodPressureEntries, bloodSugarEntries] = await Promise.all([
      WeightEntry.find({ user_id: userId }),
      BloodPressure.find({ user_id: userId }),
      BloodSugar.find({ user_id: userId })
    ]);

    // Calculate analytics
    const allEntries = [
      ...weightEntries.map(e => ({ type: 'weight', date: e.date, is_historical: e.is_historical })),
      ...bloodPressureEntries.map(e => ({ type: 'blood_pressure', date: e.date, is_historical: e.is_historical })),
      ...bloodSugarEntries.map(e => ({ type: 'blood_sugar', date: e.date, is_historical: e.is_historical }))
    ];

    const historicalEntries = allEntries.filter(e => e.is_historical);
    const totalHistoricalEntries = historicalEntries.length;

    // Calculate date range
    const dates = allEntries.map(e => e.date).sort((a, b) => a - b);
    const oldestEntry = dates.length > 0 ? dates[0].toISOString().split('T')[0] : null;
    const newestEntry = dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : null;

    // Calculate entry types
    const entryTypes = {
      weight: weightEntries.filter(e => e.is_historical).length,
      blood_pressure: bloodPressureEntries.filter(e => e.is_historical).length,
      blood_sugar: bloodSugarEntries.filter(e => e.is_historical).length
    };

    // Calculate data completeness (percentage of days with entries in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentWeightEntries = weightEntries.filter(e => e.date >= thirtyDaysAgo);
    const recentBloodPressureEntries = bloodPressureEntries.filter(e => e.date >= thirtyDaysAgo);
    const recentBloodSugarEntries = bloodSugarEntries.filter(e => e.date >= thirtyDaysAgo);

    const uniqueWeightDays = new Set(recentWeightEntries.map(e => e.date.toISOString().split('T')[0])).size;
    const uniqueBloodPressureDays = new Set(recentBloodPressureEntries.map(e => e.date.toISOString().split('T')[0])).size;
    const uniqueBloodSugarDays = new Set(recentBloodSugarEntries.map(e => e.date.toISOString().split('T')[0])).size;

    const dataCompleteness = {
      weight_coverage: `${Math.round((uniqueWeightDays / 30) * 100)}%`,
      blood_pressure_coverage: `${Math.round((uniqueBloodPressureDays / 30) * 100)}%`,
      blood_sugar_coverage: `${Math.round((uniqueBloodSugarDays / 30) * 100)}%`
    };

    console.log('✅ Historical analytics calculated:', {
      userId: userId,
      totalHistoricalEntries: totalHistoricalEntries
    });

    res.json({
      success: true,
      analytics: {
        total_historical_entries: totalHistoricalEntries,
        date_range: {
          oldest_entry: oldestEntry,
          newest_entry: newestEntry
        },
        entry_types: entryTypes,
        data_completeness: dataCompleteness
      }
    });

  } catch (error) {
    console.error('❌ Get historical analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get historical analytics',
      code: 'SERVER_ERROR'
    });
  }
});

// 2. POST /api/health/bulk-historical-import - Bulk import historical data
router.post('/bulk-historical-import', validateBulkImport, async (req, res) => {
  try {
    console.log('📥 Bulk historical import request received:', {
      userId: req.user.id,
      entryCount: req.body.entries.length,
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
    const entries = req.body.entries;
    const results = [];
    let importedCount = 0;
    let failedCount = 0;

    // Process each entry
    for (const entry of entries) {
      try {
        // Validate historical date
        const dateValidation = validateHistoricalDate(entry.date);
        if (!dateValidation.valid) {
          results.push({
            type: entry.type,
            date: entry.date,
            status: 'failed',
            error: dateValidation.error,
            message: dateValidation.message
          });
          failedCount++;
          continue;
        }

        const isHistorical = isHistoricalEntry(entry.date);
        let savedEntry;

        // Create entry based on type
        switch (entry.type) {
          case 'weight':
            const weightEntry = new WeightEntry({
              user_id: userId,
              weight: entry.value,
              date: new Date(entry.date),
              is_historical: isHistorical
            });
            savedEntry = await weightEntry.save();
            break;

          case 'blood_pressure':
            const bloodPressureEntry = new BloodPressure({
              user_id: userId,
              systolic: entry.systolic,
              diastolic: entry.diastolic,
              date: new Date(entry.date),
              is_historical: isHistorical
            });
            savedEntry = await bloodPressureEntry.save();
            break;

          case 'blood_sugar':
            const bloodSugarEntry = new BloodSugar({
              user_id: userId,
              value: entry.value,
              meal_type: entry.meal_type,
              date: new Date(entry.date),
              is_historical: isHistorical
            });
            savedEntry = await bloodSugarEntry.save();
            break;

          default:
            throw new Error(`Invalid entry type: ${entry.type}`);
        }

        results.push({
          type: entry.type,
          date: entry.date,
          status: 'success',
          entry_id: savedEntry._id
        });
        importedCount++;

      } catch (error) {
        console.error(`❌ Failed to import entry:`, error);
        results.push({
          type: entry.type,
          date: entry.date,
          status: 'failed',
          error: error.message
        });
        failedCount++;
      }
    }

    console.log('✅ Bulk import completed:', {
      userId: userId,
      importedCount: importedCount,
      failedCount: failedCount
    });

    res.json({
      success: true,
      imported_count: importedCount,
      failed_count: failedCount,
      results: results
    });

  } catch (error) {
    console.error('❌ Bulk historical import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import historical data',
      code: 'SERVER_ERROR'
    });
  }
});

// 3. GET /api/health/historical-export - Export historical data
router.get('/historical-export', [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('data_types')
    .optional()
    .matches(/^(weight|blood_pressure|blood_sugar)(,(weight|blood_pressure|blood_sugar))*$/)
    .withMessage('Data types must be comma-separated values of: weight, blood_pressure, blood_sugar'),
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv')
], async (req, res) => {
  try {
    console.log('📤 Historical export request received:', {
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
      start_date,
      end_date,
      data_types = 'weight,blood_pressure,blood_sugar',
      format = 'json'
    } = req.query;

    // Parse data types
    const requestedTypes = data_types.split(',');
    
    // Set date range (default to last year if not specified)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    // Build query for date range
    const dateQuery = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Get data based on requested types
    const exportData = {};
    let totalEntries = 0;

    if (requestedTypes.includes('weight')) {
      const weightEntries = await WeightEntry.find({
        user_id: userId,
        ...dateQuery
      }).sort({ date: -1 });
      exportData.weight = weightEntries;
      totalEntries += weightEntries.length;
    }

    if (requestedTypes.includes('blood_pressure')) {
      const bloodPressureEntries = await BloodPressure.find({
        user_id: userId,
        ...dateQuery
      }).sort({ date: -1 });
      exportData.blood_pressure = bloodPressureEntries;
      totalEntries += bloodPressureEntries.length;
    }

    if (requestedTypes.includes('blood_sugar')) {
      const bloodSugarEntries = await BloodSugar.find({
        user_id: userId,
        ...dateQuery
      }).sort({ date: -1 });
      exportData.blood_sugar = bloodSugarEntries;
      totalEntries += bloodSugarEntries.length;
    }

    // Generate export URL (simplified - in production, you'd generate actual file URLs)
    const exportId = `export_${userId}_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    console.log('✅ Historical export generated:', {
      userId: userId,
      totalEntries: totalEntries,
      format: format
    });

    res.json({
      success: true,
      export_url: `https://api.example.com/exports/${exportId}.${format}`,
      expires_at: expiresAt.toISOString(),
      total_entries: totalEntries,
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      },
      data_types: requestedTypes,
      format: format,
      // Include actual data for JSON format (in production, this would be in a separate endpoint)
      data: format === 'json' ? exportData : null
    });

  } catch (error) {
    console.error('❌ Historical export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export historical data',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
