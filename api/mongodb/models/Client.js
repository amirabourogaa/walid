const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  whatsapp_number: {
    type: String,
    trim: true
  },
  passport_number: {
    type: String,
    trim: true
  },
  nationality: {
    type: String,
    trim: true
  },
  passport_status: {
    type: String,
    enum: ['موجود', 'غير موجود'],
    default: 'غير موجود'
  },
  visa_tracking_status: {
    type: String,
    trim: true
  },
  assigned_employee: {
    type: String,
    trim: true
  },
  assigned_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  service_type: {
    type: String,
    trim: true
  },
  destination_country: {
    type: String,
    trim: true
  },
  china_visa_type: {
    type: String,
    trim: true
  },
  visa_type: {
    type: String,
    trim: true
  },
  profession: {
    type: String,
    trim: true
  },
  tax_id: {
    type: String,
    trim: true
  },
  personal_photo_url: {
    type: String,
    trim: true
  },
  passport_photo_url: {
    type: String,
    trim: true
  },
  documents_urls: [{
    type: String
  }],
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'TND', 'DLY'],
    default: 'TND'
  },
  entry_status: {
    type: String,
    trim: true
  },
  submission_date: {
    type: Date
  },
  embassy_receipt_date: {
    type: Date
  },
  submitted_by: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  qr_code_data: {
    type: String,
    trim: true
  },
  progress: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['جديد', 'قيد المعالجة', 'اكتملت العملية', 'مرفوضة'],
    default: 'جديد'
  },
  invoice_status: {
    type: String,
    default: 'غير مدفوعة'
  },
  visa_start_date: {
    type: Date
  },
  visa_end_date: {
    type: Date
  },
  passport_expiry_date: {
    type: Date
  },
  company_name: {
    type: String,
    trim: true
  },
  client_id_number: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true,
  collection: 'clients'
});

// Index pour les requêtes fréquentes
clientSchema.index({ status: 1 });
clientSchema.index({ visa_tracking_status: 1 });
clientSchema.index({ assigned_employee_id: 1 });
clientSchema.index({ client_id_number: 1 });
clientSchema.index({ passport_number: 1 });
clientSchema.index({ createdAt: -1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;