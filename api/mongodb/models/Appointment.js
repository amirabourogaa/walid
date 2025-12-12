const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  appointment_type: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['مجدولة', 'مؤكدة', 'مكتملة', 'ملغاة', 'لم تحضر'],
    default: 'مجدولة'
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  }
}, {
  timestamps: true,
  collection: 'appointments'
});

appointmentSchema.index({ client_id: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ created_by: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;