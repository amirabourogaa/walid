const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  client_name: {
    type: String,
    required: true,
    trim: true
  },
  visa_type: {
    type: String,
    required: true,
    trim: true
  },
  application_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['جديد', 'قيد المعالجة', 'مكتمل', 'مرفوض'],
    default: 'جديد'
  },
  submitted_date: {
    type: Date,
    required: true
  },
  expected_date: {
    type: Date
  },
  documents_required: {
    type: Number,
    default: 0
  },
  documents_submitted: {
    type: Number,
    default: 0
  },
  embassy: {
    type: String,
    required: true,
    trim: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assigned_employee: {
    type: String,
    trim: true
  },
  deadline: {
    type: Date
  },
  timeline: [{
    date: Date,
    status: String,
    description: String
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  }
}, {
  timestamps: true,
  collection: 'applications'
});

applicationSchema.index({ client_id: 1 });
applicationSchema.index({ application_number: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ submitted_date: -1 });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;