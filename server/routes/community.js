const express = require('express');
const router = express.Router();
const { Supplier, Transaction, User } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { calculateSupplierScores } = require('../scoring');

// Helper to normalize Pakistani phone numbers
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('92') && cleaned.length > 10) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

// GET /api/community/suppliers - Blinded community aggregate benchmark records
router.get('/suppliers', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const { category, city, min_score, search } = req.query;

    // Check how many transactions the current user has contributed
    const myTransactionCount = await Transaction.countDocuments({ user_id: currentUserId });
    const isUnlocked = myTransactionCount >= 3; // Network unlock threshold: 3+ transactions

    // Get all transactions across opted-in traders
    const optedInUsers = await User.find({ community_opt_in: true }).select('_id').lean();
    const optedInIds = optedInUsers.map(u => u._id);

    const allSuppliers = await Supplier.find({ user_id: { $in: optedInIds } }).lean();

    // Group suppliers across multiple traders by normalized phone number or exact name
    const groupedSuppliers = {};

    for (const sup of allSuppliers) {
      const normPhone = normalizePhone(sup.phone);
      const key = normPhone || sup.name.trim().toLowerCase();

      if (!groupedSuppliers[key]) {
        groupedSuppliers[key] = {
          representative_name: sup.name,
          phone: sup.phone,
          normalized_phone: normPhone,
          city: sup.city,
          market_area: sup.market_area,
          category: sup.category,
          contributor_user_ids: new Set(),
          supplier_record_ids: []
        };
      }

      groupedSuppliers[key].contributor_user_ids.add(sup.user_id.toString());
      groupedSuppliers[key].supplier_record_ids.push(sup._id);
    }

    const aggregateList = [];

    for (const key of Object.keys(groupedSuppliers)) {
      const group = groupedSuppliers[key];
      const allGroupTxs = await Transaction.find({
        supplier_id: { $in: group.supplier_record_ids }
      }).sort({ actual_date: 1 }).lean();

      if (allGroupTxs.length === 0) continue;

      const score = calculateSupplierScores(allGroupTxs);
      const contributorCount = group.contributor_user_ids.size;

      // Filter options
      if (category && group.category !== category) continue;
      if (city && group.city !== city) continue;
      if (min_score && score.composite_score < parseFloat(min_score)) continue;
      if (search) {
        const q = search.toLowerCase();
        const matchName = group.representative_name.toLowerCase().includes(q);
        const matchCity = group.city.toLowerCase().includes(q);
        const matchMarket = (group.market_area || '').toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchMarket) continue;
      }

      // Check if current trader uses this supplier
      const myTransactionsForThisSupplier = await Transaction.find({
        user_id: currentUserId,
        supplier_id: { $in: group.supplier_record_ids }
      }).sort({ actual_date: 1 }).lean();

      const myScore = myTransactionsForThisSupplier.length > 0 
        ? calculateSupplierScores(myTransactionsForThisSupplier) 
        : null;

      // Blinded record
      aggregateList.push({
        id: key,
        supplier_name: group.representative_name,
        city: group.city,
        market_area: group.market_area,
        category: group.category,
        total_deliveries_tracked: score.total_transactions,
        contributing_traders_count: contributorCount,
        network_grade: score.grade,
        network_grade_label: score.grade_label,
        network_composite_score: score.composite_score,
        network_punctuality: score.punctuality_score,
        network_on_time_rate: score.on_time_rate,
        network_accuracy: score.quantity_score,
        network_accuracy_rate: score.accuracy_rate,
        network_quality: score.quality_score,
        network_quality_stars: score.avg_quality_stars,
        network_dispute_rate: score.dispute_rate,
        network_risk_status: score.risk_status,
        my_personal_experience: myScore ? {
          deliveries_logged: myScore.total_transactions,
          personal_grade: myScore.grade,
          personal_score: myScore.composite_score
        } : null
      });
    }

    // Sort by network composite score descending
    aggregateList.sort((a, b) => b.network_composite_score - a.network_composite_score);

    res.json({
      success: true,
      meta: {
        is_unlocked: isUnlocked,
        contributions_needed: Math.max(0, 3 - myTransactionCount),
        total_verified_suppliers_in_network: aggregateList.length
      },
      data: aggregateList
    });
  } catch (error) {
    console.error('Error loading community intelligence:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve community benchmarks' });
  }
});

module.exports = router;
