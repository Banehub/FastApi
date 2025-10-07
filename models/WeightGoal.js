const mongoose = require('mongoose');

// WeightGoal schema
const weightGoalSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true // Only one goal per user
  },
  goal_weight: {
    type: Number,
    required: [true, 'Goal weight is required'],
    min: [20.0, 'Goal weight must be at least 20.0 kg'],
    max: [500.0, 'Goal weight must not exceed 500.0 kg']
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
  collection: 'weight_goals'
});

// Indexes for better performance
weightGoalSchema.index({ user_id: 1 });

// Update the updated_at field before saving
weightGoalSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Static method to find or create goal for user
weightGoalSchema.statics.findOrCreateGoal = function(userId, goalWeight) {
  return this.findOneAndUpdate(
    { user_id: userId },
    { 
      goal_weight: goalWeight,
      updated_at: Date.now()
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

// Static method to get goal for user
weightGoalSchema.statics.getUserGoal = function(userId) {
  return this.findOne({ user_id: userId });
};

// Create WeightGoal model
const WeightGoal = mongoose.model('WeightGoal', weightGoalSchema);

module.exports = WeightGoal;
