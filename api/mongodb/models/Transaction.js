const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'visa_fee',
      'service_fee',
      'consultation_fee',
      'document_fee',
      'translation_fee',
      'embassy_fee',
      'office_supplies',
      'utilities',
      'salary',
      'rent',
      'marketing',
      'transport',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  montant: {
    type: Number,
    required: true
  },
  devise: {
    type: String,
    enum: ['USD', 'EUR', 'TND', 'DLY'],
    required: true
  },
  mode_paiement: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'check', 'other'],
    required: true
  },
  source_type: {
    type: String,
    enum: ['caisse', 'compte_bancaire', 'invoice', 'client']
  },
  source_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  date_transaction: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  }
}, {
  timestamps: true,
  collection: 'transactions'
});

transactionSchema.index({ type: 1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ date_transaction: -1 });
transactionSchema.index({ created_by: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;