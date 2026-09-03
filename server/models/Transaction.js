const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  item_description: { type: String, required: true, trim: true },
  category: { type: String, default: 'Hardware & Tools' },
  quantity_ordered: { type: Number, required: true },
  quantity_received: { type: Number, required: true },
  promised_date: { type: String, required: true },
  actual_date: { type: String, required: true },
  quality_rating: { type: Number, default: 5, min: 1, max: 5 },
  has_dispute: { type: Number, default: 0 },
  dispute_reason: { type: String, default: null },
  dispute_status: { type: String, default: 'None' }, // 'None', 'Open', 'Resolved', 'Unresolved'
  dispute_notes: { type: String, default: '' },
  amount_pkr: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
