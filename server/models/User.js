const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  business_name: { type: String, required: true, trim: true },
  owner_name: { type: String, default: '', trim: true },
  city: { type: String, default: 'Peshawar' },
  market_area: { type: String, default: 'Namak Mandi' },
  trade_category: { type: String, default: 'Hardware & Tools' },
  phone: { type: String, default: '' },
  community_opt_in: { type: Boolean, default: false },
  role: { type: String, default: 'trader' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
