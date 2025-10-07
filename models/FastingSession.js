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
  plan_type: {
    type: String,
    enum: ['12:12', '14:10', '16:8', '18:6', '20:4'],
    required: [true, 'Plan type is required']
  },
  end_reason: {
    type: String,
    enum: ['completed', 'manually_stopped', 'interrupted'],
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

// Method to calculate metabolic states
fastingSessionSchema.methods.calculateMetabolicStates = function() {
  const durationMinutes = this.duration_minutes || 0;
  
  const fedMinutes = Math.min(durationMinutes, 240); // 0-4 hours
  const transitionMinutes = Math.max(0, Math.min(durationMinutes - 240, 480)); // 4-12 hours
  const fastingMinutes = Math.max(0, Math.min(durationMinutes - 720, 240)); // 12-16 hours
  const ketosisMinutes = Math.max(0, durationMinutes - 960); // 16+ hours
  
  const total = durationMinutes || 1; // Avoid division by zero
  
  return {
    fed: {
      duration_minutes: fedMinutes,
      percentage: Math.round((fedMinutes / total) * 100 * 100) / 100,
      description: 'Fed State - Glucose fuel, No fat burning'
    },
    transition: {
      duration_minutes: transitionMinutes,
      percentage: Math.round((transitionMinutes / total) * 100 * 100) / 100,
      description: 'Transition - Glycogen fuel, Light fat burning'
    },
    fasting: {
      duration_minutes: fastingMinutes,
      percentage: Math.round((fastingMinutes / total) * 100 * 100) / 100,
      description: 'Fasting - Fat + Glycogen fuel, Fat burning starts'
    },
    ketosis: {
      duration_minutes: ketosisMinutes,
      percentage: Math.round((ketosisMinutes / total) * 100 * 100) / 100,
      description: 'Ketosis - Fat + Ketones fuel, Strong fat burning'
    }
  };
};

// Method to calculate plan progress
fastingSessionSchema.methods.calculatePlanProgress = function() {
  const planHours = parseInt(this.plan_type.split(':')[0]);
  const completedHours = (this.duration_minutes || 0) / 60;
  const completionPercentage = Math.min(100, Math.round((completedHours / planHours) * 100 * 100) / 100);
  const remainingHours = Math.max(0, planHours - completedHours);
  
  return {
    plan_hours: planHours,
    completed_hours: Math.round(completedHours * 100) / 100,
    completion_percentage: completionPercentage,
    remaining_hours: Math.round(remainingHours * 100) / 100
  };
};

// Create FastingSession model
const FastingSession = mongoose.model('FastingSession', fastingSessionSchema);

module.exports = FastingSession;
