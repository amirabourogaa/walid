const mongoose = require('mongoose');

const clientActivityLogSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  },
  action_type: {
    type: String,
    required: true,
    trim: true
  },
  action_description: {
    type: String,
    required: true,
    trim: true
  },
  old_value: {
    type: mongoose.Schema.Types.Mixed
  },
  new_value: {
    type: mongoose.Schema.Types.Mixed
  },
  field_changed: {
    type: String,
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false
  },
  collection: 'client_activity_logs'
});

clientActivityLogSchema.index({ client_id: 1 });
clientActivityLogSchema.index({ user_id: 1 });
clientActivityLogSchema.index({ created_at: -1 });

const ClientActivityLog = mongoose.model('ClientActivityLog', clientActivityLogSchema);

module.exports = ClientActivityLog;