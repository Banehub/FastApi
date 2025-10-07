const mongoose = require('mongoose');

// ExerciseSession schema
const exerciseSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  exercise_type: {
    type: String,
    required: [true, 'Exercise type is required'],
    enum: ['running', 'cycling', 'walking', 'swimming', 'weightlifting', 'yoga', 'hiit', 'other'],
    trim: true
  },
  start_time: {
    type: Date,
    required: [true, 'Start time is required']
  },
  end_time: {
    type: Date,
    default: null
  },
  duration_minutes: {
    type: Number,
    default: 0,
    min: [0, 'Duration cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  end_reason: {
    type: String,
    enum: ['completed', 'cancelled', 'interrupted'],
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'exercise_sessions'
});

// Indexes for better performance
exerciseSessionSchema.index({ user_id: 1, status: 1 });
exerciseSessionSchema.index({ user_id: 1, start_time: -1 });
exerciseSessionSchema.index({ exercise_type: 1 });
exerciseSessionSchema.index({ status: 1 });

// Update the updated_at field before saving
exerciseSessionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Calculate duration when session is completed
exerciseSessionSchema.pre('save', function(next) {
  if (this.isModified('end_time') && this.end_time && this.start_time) {
    const durationMs = this.end_time.getTime() - this.start_time.getTime();
    this.duration_minutes = Math.floor(durationMs / (1000 * 60));
  }
  next();
});

// Static method to find active session for a user
exerciseSessionSchema.statics.findActiveSession = function(userId) {
  return this.findOne({ user_id: userId, status: 'active' });
};

// Static method to get user sessions with pagination
exerciseSessionSchema.statics.getUserSessions = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'all'
  } = options;

  const query = { user_id: userId };
  if (status !== 'all') {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ start_time: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Static method to count user sessions
exerciseSessionSchema.statics.countUserSessions = function(userId, status = 'all') {
  const query = { user_id: userId };
  if (status !== 'all') {
    query.status = status;
  }
  return this.countDocuments(query);
};

// Static method to get exercise analytics
exerciseSessionSchema.statics.getExerciseAnalytics = function(userId) {
  return this.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: '$exercise_type',
        sessions: { $sum: 1 },
        total_hours: { $sum: { $divide: ['$duration_minutes', 60] } },
        average_hours: { $avg: { $divide: ['$duration_minutes', 60] } }
      }
    },
    {
      $project: {
        exercise_type: '$_id',
        sessions: 1,
        total_hours: { $round: ['$total_hours', 2] },
        average_hours: { $round: ['$average_hours', 2] },
        _id: 0
      }
    }
  ]);
};

// Create ExerciseSession model
const ExerciseSession = mongoose.model('ExerciseSession', exerciseSessionSchema);

module.exports = ExerciseSession;
