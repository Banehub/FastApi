const mongoose = require('mongoose');

// FastingSession schema
const fastingSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
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
    default: null
  },
  start_type: {
    type: String,
    enum: ['immediate', 'custom'],
    required: [true, 'Start type is required']
  },
  custom_start_hours: {
    type: Number,
    default: null,
    min: [0, 'Custom start hours cannot be negative']
  },
  custom_start_minutes: {
    type: Number,
    default: null,
    min: [0, 'Custom start minutes cannot be negative'],
    max: [59, 'Custom start minutes cannot exceed 59']
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
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
  collection: 'fasting_sessions'
});

// Indexes for better performance
fastingSessionSchema.index({ user_id: 1, status: 1 });
fastingSessionSchema.index({ user_id: 1, start_time: -1 });
fastingSessionSchema.index({ status: 1 });

// Update the updated_at field before saving
fastingSessionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Calculate duration when session is completed
fastingSessionSchema.pre('save', function(next) {
  if (this.isModified('end_time') && this.end_time && this.start_time) {
    const durationMs = this.end_time.getTime() - this.start_time.getTime();
    this.duration_minutes = Math.floor(durationMs / (1000 * 60));
  }
  next();
});

// Static method to find active session for a user
fastingSessionSchema.statics.findActiveSession = function(userId) {
  return this.findOne({ user_id: userId, status: 'active' });
};

// Static method to get user sessions with pagination
fastingSessionSchema.statics.getUserSessions = function(userId, options = {}) {
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
fastingSessionSchema.statics.countUserSessions = function(userId, status = 'all') {
  const query = { user_id: userId };
  if (status !== 'all') {
    query.status = status;
  }
  return this.countDocuments(query);
};

// Create FastingSession model
const FastingSession = mongoose.model('FastingSession', fastingSessionSchema);

module.exports = FastingSession;
