const mongoose = require('mongoose');

// BloodPressure schema
const bloodPressureSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  systolic: {
    type: Number,
    required: [true, 'Systolic pressure is required'],
    min: [40, 'Systolic pressure must be at least 40 mmHg'],
    max: [250, 'Systolic pressure cannot exceed 250 mmHg']
  },
  diastolic: {
    type: Number,
    required: [true, 'Diastolic pressure is required'],
    min: [20, 'Diastolic pressure must be at least 20 mmHg'],
    max: [150, 'Diastolic pressure cannot exceed 150 mmHg']
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
  collection: 'blood_pressure_entries'
});

// Indexes for better performance
bloodPressureSchema.index({ user_id: 1, date: -1 });
bloodPressureSchema.index({ user_id: 1, date: -1, is_historical: 1 });

// Update the updated_at field before saving
bloodPressureSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Virtual for blood pressure category
bloodPressureSchema.virtual('category').get(function() {
  if (this.systolic < 120 && this.diastolic < 80) {
    return 'Normal';
  } else if (this.systolic >= 120 && this.systolic <= 129 && this.diastolic < 80) {
    return 'Elevated';
  } else if ((this.systolic >= 130 && this.systolic <= 139) || (this.diastolic >= 80 && this.diastolic <= 89)) {
    return 'High Blood Pressure (Stage 1)';
  } else if (this.systolic >= 140 || this.diastolic >= 90) {
    return 'High Blood Pressure (Stage 2)';
  } else if (this.systolic > 180 || this.diastolic > 120) {
    return 'Hypertensive Crisis';
  }
  return 'Unknown';
});

// Static method to get user entries with pagination
bloodPressureSchema.statics.getUserEntries = function(userId, options = {}) {
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
bloodPressureSchema.statics.countUserEntries = function(userId) {
  return this.countDocuments({ user_id: userId });
};

// Static method to get latest entry
bloodPressureSchema.statics.getLatestEntry = function(userId) {
  return this.findOne({ user_id: userId })
    .sort({ date: -1 })
    .exec();
};

// Create BloodPressure model
const BloodPressure = mongoose.model('BloodPressure', bloodPressureSchema);

module.exports = BloodPressure;

