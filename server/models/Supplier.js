const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  city: { type: String, default: 'Peshawar' },
  market_area: { type: String, default: '' },
  category: { type: String, default: 'Hardware & Tools' },
  payment_terms: { type: String, default: 'Cash on Delivery' },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Supplier', supplierSchema);
