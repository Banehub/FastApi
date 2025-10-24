const mongoose = require('mongoose');

// BloodSugar schema
const bloodSugarSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  value: {
    type: Number,
    required: [true, 'Blood sugar value is required'],
    min: [20, 'Blood sugar value must be at least 20 mg/dL'],
    max: [600, 'Blood sugar value cannot exceed 600 mg/dL']
  },
  meal_type: {
    type: String,
    enum: ['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'],
    required: [true, 'Meal type is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
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
  collection: 'blood_sugar_entries'
});

// Indexes for better performance
bloodSugarSchema.index({ user_id: 1, date: -1 });
bloodSugarSchema.index({ user_id: 1, meal_type: 1 });
bloodSugarSchema.index({ user_id: 1, date: -1, is_historical: 1 });

// Update the updated_at field before saving
bloodSugarSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Virtual for blood sugar category
bloodSugarSchema.virtual('category').get(function() {
  if (this.meal_type === 'fasting') {
    if (this.value < 70) {
      return 'Low';
    } else if (this.value >= 70 && this.value <= 99) {
      return 'Normal';
    } else if (this.value >= 100 && this.value <= 125) {
      return 'Prediabetes';
    } else {
      return 'Diabetes';
    }
  } else if (this.meal_type === 'after_meal') {
    if (this.value < 70) {
      return 'Low';
    } else if (this.value < 140) {
      return 'Normal';
    } else if (this.value >= 140 && this.value <= 199) {
      return 'Prediabetes';
    } else {
      return 'Diabetes';
    }
  } else {
    // General categories for other meal types
    if (this.value < 70) {
      return 'Low';
    } else if (this.value >= 70 && this.value <= 140) {
      return 'Normal';
    } else if (this.value > 140 && this.value <= 199) {
      return 'Elevated';
    } else {
      return 'High';
    }
  }
});

// Static method to get user entries with pagination
bloodSugarSchema.statics.getUserEntries = function(userId, options = {}) {
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
bloodSugarSchema.statics.countUserEntries = function(userId) {
  return this.countDocuments({ user_id: userId });
};

// Static method to get latest entry
bloodSugarSchema.statics.getLatestEntry = function(userId) {
  return this.findOne({ user_id: userId })
    .sort({ date: -1 })
    .exec();
};

// Create BloodSugar model
const BloodSugar = mongoose.model('BloodSugar', bloodSugarSchema);

module.exports = BloodSugar;

