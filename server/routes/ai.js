const express = require('express');
const router = express.Router();
const { Supplier, Transaction, User } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { calculateSupplierScores } = require('../scoring');

// Helper to format currency
const formatPKR = (amount) => `PKR ${(amount || 0).toLocaleString('en-PK')}`;

// POST /api/ai/dispute-notice - Format structured WhatsApp Dispute Reconciliation notice
router.post('/dispute-notice', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    const tx = await Transaction.findOne({ _id: transaction_id, user_id: userId })
      .populate('supplier_id')
      .lean();

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Dispute transaction not found' });
    }

    const supplier = tx.supplier_id;
    const user = await User.findById(userId).lean();

    // Get historical stats for this supplier
    const allTxs = await Transaction.find({ user_id: userId, supplier_id: supplier._id })
      .sort({ actual_date: 1 })
      .lean();
    const score = calculateSupplierScores(allTxs);

    // Build structured WhatsApp message
    const orderQty = tx.quantity_ordered;
    const recQty = tx.quantity_received;
    const shortQty = orderQty > recQty ? orderQty - recQty : 0;
    const isLate = tx.actual_date > tx.promised_date;

    const message = `*COMMERCIAL RECONCILIATION NOTICE*
*To:* ${supplier.name}
*From:* ${user.business_name} (${user.owner_name || 'Accounts Department'})
*Market:* ${user.market_area || user.city}
*Date:* ${new Date().toLocaleDateString('en-GB')}

Assalam-o-Alaikum,

We are contacting you regarding Order Record ref *#REC-${tx._id.toString().slice(-6).toUpperCase()}* logged in our private ledger:

📦 *ORDER & DELIVERY DETAILS:*
• *Item:* ${tx.item_description}
• *Quantity Ordered:* ${orderQty} units
• *Quantity Received:* ${recQty} units ${shortQty > 0 ? `(⚠️ Shortfall of ${shortQty} units)` : ''}
• *Promised Delivery:* ${tx.promised_date}
• *Actual Delivery:* ${tx.actual_date} ${isLate ? `(⚠️ Delayed)` : ''}
• *Invoice Value:* ${formatPKR(tx.amount_pkr)}

⚠️ *DISPUTE REASON & TRADER LOG:*
• *Issue Category:* ${tx.dispute_reason || 'Variance in delivery'}
• *Dispute Status:* ${tx.dispute_status}
• *Inspector Notes:* "${tx.dispute_notes || 'Pending reconciliation of delivery shortfall/defects.'}"

📊 *SUPPLIER PERFORMANCE RECORD (HISTORICAL):*
• *Total Deliveries Completed:* ${score.total_transactions}
• *Historical On-Time Rate:* ${score.on_time_rate}%
• *Quantity Accuracy Rate:* ${score.accuracy_rate}%
• *Current Reliability Grade:* ${score.grade} (${score.composite_score}/100)

🤝 *ACTION REQUESTED:*
Please verify this variance with your dispatch team and confirm either:
1. Credit note / bill adjustment for the shortage/delay, OR
2. Dispatch of the balance ${shortQty > 0 ? shortQty + ' units' : 'replacement goods'} via priority cargo.

_Generated from ${user.business_name}'s Supplier Reliability Scorecard Ledger._`;

    res.json({
      success: true,
      data: {
        formatted_message: message,
        supplier_name: supplier.name,
        supplier_phone: supplier.phone,
        transaction_id: tx._id.toString()
      }
    });
  } catch (error) {
    console.error('Error creating WhatsApp dispute notice:', error);
    res.status(500).json({ success: false, message: 'Failed to generate dispute notice' });
  }
});

// GET /api/ai/monthly-digest - 30-second monthly reliability summary
router.get('/monthly-digest', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).lean();
    const suppliers = await Supplier.find({ user_id: userId }).lean();

    // Optimize N+1 query: Fetch all transactions for this user once
    const allTransactions = await Transaction.find({ user_id: userId }).sort({ actual_date: 1 }).lean();
    
    // Group transactions by supplier_id
    const txsBySupplier = {};
    allTransactions.forEach(tx => {
      const sId = tx.supplier_id.toString();
      if (!txsBySupplier[sId]) txsBySupplier[sId] = [];
      txsBySupplier[sId].push(tx);
    });

    const evaluations = suppliers.map(s => {
      const txs = txsBySupplier[s._id.toString()] || [];
      return {
        supplier_name: s.name,
        scorecard: calculateSupplierScores(txs)
      };
    });

    const topPerformer = [...evaluations].sort((a, b) => b.scorecard.composite_score - a.scorecard.composite_score)[0];
    const atRiskList = evaluations.filter(e => e.scorecard.risk_status === 'Deteriorating');

    const digest = {
      period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      business_name: user.business_name,
      total_active_suppliers: suppliers.length,
      top_performing_supplier: topPerformer ? {
        name: topPerformer.supplier_name,
        grade: topPerformer.scorecard.grade,
        score: topPerformer.scorecard.composite_score
      } : null,
      deteriorating_suppliers: atRiskList.map(a => ({
        name: a.supplier_name,
        grade: a.scorecard.grade,
        score: a.scorecard.composite_score,
        alert: 'Recent deliveries showed delayed timing or quantity variance.'
      })),
      recommendation: atRiskList.length > 0 
        ? `Consider shifting 25-30% volume away from ${atRiskList.map(a => a.supplier_name).join(', ')} until delivery punctuality stabilizes.`
        : 'All suppliers are currently operating within acceptable delivery tolerances.'
    };

    res.json({ success: true, data: digest });
  } catch (error) {
    console.error('Error generating monthly digest:', error);
    res.status(500).json({ success: false, message: 'Failed to generate monthly digest' });
  }
});

module.exports = router;
