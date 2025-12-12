const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  workload: {
    type: Number,
    default: 0
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    unique: true,
    sparse: true
  },
  profile_synced: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'employees'
});

employeeSchema.index({ user_id: 1 });
employeeSchema.index({ email: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;