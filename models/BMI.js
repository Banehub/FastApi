const mongoose = require('mongoose');

// BMI schema
const bmiSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    min: [50, 'Height must be at least 50 cm'],
    max: [300, 'Height cannot exceed 300 cm']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [20, 'Weight must be at least 20 kg'],
    max: [500, 'Weight cannot exceed 500 kg']
  },
  bmi: {
    type: Number,
    required: [true, 'BMI is required'],
    min: [10, 'BMI must be at least 10'],
    max: [100, 'BMI cannot exceed 100']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
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
  collection: 'bmi_entries'
});

// Indexes for better performance
bmiSchema.index({ user_id: 1, date: -1 });

// Update the updated_at field before saving
bmiSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Virtual for BMI category
bmiSchema.virtual('category').get(function() {
  if (this.bmi < 18.5) {
    return 'Underweight';
  } else if (this.bmi >= 18.5 && this.bmi < 25) {
    return 'Normal weight';
  } else if (this.bmi >= 25 && this.bmi < 30) {
    return 'Overweight';
  } else if (this.bmi >= 30 && this.bmi < 35) {
    return 'Obese (Class 1)';
  } else if (this.bmi >= 35 && this.bmi < 40) {
    return 'Obese (Class 2)';
  } else {
    return 'Obese (Class 3)';
  }
});

// Virtual for health risk
bmiSchema.virtual('health_risk').get(function() {
  if (this.bmi < 18.5) {
    return 'Increased risk of nutritional deficiency and osteoporosis';
  } else if (this.bmi >= 18.5 && this.bmi < 25) {
    return 'Low risk';
  } else if (this.bmi >= 25 && this.bmi < 30) {
    return 'Increased risk of heart disease, high blood pressure, stroke';
  } else if (this.bmi >= 30 && this.bmi < 35) {
    return 'High risk of type 2 diabetes, heart disease, stroke';
  } else if (this.bmi >= 35 && this.bmi < 40) {
    return 'Very high risk of metabolic syndrome, type 2 diabetes';
  } else {
    return 'Extremely high risk of obesity-related health conditions';
  }
});

// Static method to get user entries with pagination
bmiSchema.statics.getUserEntries = function(userId, options = {}) {
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
bmiSchema.statics.countUserEntries = function(userId) {
  return this.countDocuments({ user_id: userId });
};

// Static method to get latest entry
bmiSchema.statics.getLatestEntry = function(userId) {
  return this.findOne({ user_id: userId })
    .sort({ date: -1 })
    .exec();
};

// Create BMI model
const BMI = mongoose.model('BMI', bmiSchema);

module.exports = BMI;

