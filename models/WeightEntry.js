const mongoose = require('mongoose');

// WeightEntry schema
const weightEntrySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [20.0, 'Weight must be at least 20.0 kg'],
    max: [500.0, 'Weight must not exceed 500.0 kg']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  is_historical: {
    type: Boolean,
    default: false
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
  collection: 'weight_entries'
});

// Indexes for better performance
weightEntrySchema.index({ user_id: 1, date: -1 });
weightEntrySchema.index({ user_id: 1, created_at: -1 });
weightEntrySchema.index({ user_id: 1, date: -1, is_historical: 1 });
// Removed unique constraint to allow multiple entries per day

// Update the updated_at field before saving
weightEntrySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Static method to find entries for a user with pagination
weightEntrySchema.statics.getUserEntries = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20
  } = options;

  const skip = (page - 1) * limit;

  return this.find({ user_id: userId })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Static method to count user entries
weightEntrySchema.statics.countUserEntries = function(userId) {
  return this.countDocuments({ user_id: userId });
};

// Static method to get current weight (latest entry)
weightEntrySchema.statics.getCurrentWeight = function(userId) {
  return this.findOne({ user_id: userId })
    .sort({ date: -1 })
    .exec();
};

// Static method to get weight analytics
weightEntrySchema.statics.getWeightAnalytics = function(userId) {
  return this.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        currentWeight: { $first: '$weight' },
        startWeight: { $last: '$weight' },
        latestDate: { $first: '$date' },
        earliestDate: { $last: '$date' },
        weights: { $push: '$weight' },
        dates: { $push: '$date' }
      }
    }
  ]);
};

// Multiple entries per day are now allowed

// Create WeightEntry model
const WeightEntry = mongoose.model('WeightEntry', weightEntrySchema);

module.exports = WeightEntry;
