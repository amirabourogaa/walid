const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoice_number: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  client_name: {
    type: String,
    required: true,
    trim: true
  },
  client_whatsapp: {
    type: String,
    trim: true
  },
  client_tax_id: {
    type: String,
    trim: true
  },
  client_email: {
    type: String,
    trim: true,
    lowercase: true
  },
  services: [{
    name: String,
    description: String,
    quantity: Number,
    unit_price: Number,
    total: Number
  }],
  subtotal: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'TND', 'DLY'],
    default: 'TND'
  },
  tva_rate: {
    type: Number
  },
  tva_amount: {
    type: Number
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  timbre_fiscal: {
    type: Number
  },
  retenue_source_rate: {
    type: Number
  },
  retenue_source_amount: {
    type: Number
  },
  total_amount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'مسودة'
  },
  issue_date: {
    type: Date,
    default: Date.now
  },
  due_date: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'invoices'
});

invoiceSchema.index({ invoice_number: 1 });
invoiceSchema.index({ client_id: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ issue_date: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;