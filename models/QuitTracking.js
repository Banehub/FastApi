const mongoose = require('mongoose');

// QuitTracking schema
const quitTrackingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  quit_type: {
    type: String,
    required: [true, 'Quit type is required'],
    enum: ['smoking', 'vaping'],
    message: 'Quit type must be either smoking or vaping'
  },
  quit_date: {
    type: Date,
    required: [true, 'Quit date is required']
  },
  days_quit: {
    type: Number,
    required: [true, 'Days quit is required'],
    min: [0, 'Days quit cannot be negative']
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
  collection: 'quit_tracking'
});

// Index for better performance and unique constraint
quitTrackingSchema.index({ user_id: 1, quit_type: 1 }, { unique: true });

// Update the updated_at field before saving
quitTrackingSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Static method to find or create quit tracking record
quitTrackingSchema.statics.findOrCreateQuitTracking = async function(userId, quitType, quitDate, daysQuit) {
  try {
    // Try to find existing record
    let quitTracking = await this.findOne({
      user_id: userId,
      quit_type: quitType
    });

    if (quitTracking) {
      // Update existing record
      quitTracking.quit_date = new Date(quitDate);
      quitTracking.days_quit = parseInt(daysQuit);
      quitTracking.updated_at = Date.now();
      await quitTracking.save();
      return quitTracking;
    } else {
      // Create new record
      quitTracking = new this({
        user_id: userId,
        quit_type: quitType,
        quit_date: new Date(quitDate),
        days_quit: parseInt(daysQuit)
      });
      await quitTracking.save();
      return quitTracking;
    }
  } catch (error) {
    throw error;
  }
};

// Static method to get user's quit tracking by type
quitTrackingSchema.statics.getUserQuitTracking = async function(userId, quitType) {
  try {
    return await this.findOne({
      user_id: userId,
      quit_type: quitType
    });
  } catch (error) {
    throw error;
  }
};

// Static method to get all quit tracking for a user
quitTrackingSchema.statics.getAllUserQuitTracking = async function(userId) {
  try {
    return await this.find({ user_id: userId }).sort({ created_at: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to delete user's quit tracking by type
quitTrackingSchema.statics.deleteUserQuitTracking = async function(userId, quitType) {
  try {
    return await this.findOneAndDelete({
      user_id: userId,
      quit_type: quitType
    });
  } catch (error) {
    throw error;
  }
};

// Create QuitTracking model
const QuitTracking = mongoose.model('QuitTracking', quitTrackingSchema);

module.exports = QuitTracking;
