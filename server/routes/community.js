// server/routes/community.js
// Full replacement — adds the two routes the frontend already calls
// (/overview and /supplier/:id) and fixes the unlock threshold to
// match the spec: 30+ transactions WITH THAT SPECIFIC SUPPLIER,
// not 3 transactions total across all suppliers.

const express = require('express');
const router = express.Router();
const { Supplier, Transaction, User } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { calculateSupplierScores } = require('../scoring');

const UNLOCK_THRESHOLD = 30; // spec Section 2.1 / 4.2: 30+ transactions, per supplier

// Helper to normalize Pakistani phone numbers
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('92') && cleaned.length > 10) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

// Groups every opted-in trader's suppliers into blinded community pools,
// keyed by normalized phone (falls back to lowercase name if no phone).
async function buildCommunityGroups() {
  const optedInUsers = await User.find({ community_opt_in: true }).select('_id').lean();
  const optedInIds = optedInUsers.map(u => u._id);
  const allSuppliers = await Supplier.find({ user_id: { $in: optedInIds } }).lean();

  const groups = {};
  for (const sup of allSuppliers) {
    const normPhone = normalizePhone(sup.phone);
    const key = normPhone || sup.name.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        representative_name: sup.name,
        city: sup.city,
        market_area: sup.market_area,
        category: sup.category,
        contributor_user_ids: new Set(),
        supplier_record_ids: []
      };
    }
    groups[key].contributor_user_ids.add(sup.user_id.toString());
    groups[key].supplier_record_ids.push(sup._id);
  }
  return groups;
}

// GET /api/community/overview - unlock status + per-category benchmarks
// (this is what dashboard.js calls on every dashboard load / tab click)
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Count MY transactions per-supplier — unlock is per-supplier, not global
    const myTransactions = await Transaction.find({ user_id: userId }).lean();
    const perSupplierCounts = {};
    myTransactions.forEach(t => {
      const sid = t.supplier_id.toString();
      perSupplierCounts[sid] = (perSupplierCounts[sid] || 0) + 1;
    });
    const counts = Object.values(perSupplierCounts);
    const maxForAnySupplier = counts.length ? Math.max(...counts) : 0;
    const isUnlocked = maxForAnySupplier >= UNLOCK_THRESHOLD;

    // Build category benchmarks across the whole opted-in network
    const groups = await buildCommunityGroups();
    const categoryStats = {};

    for (const key of Object.keys(groups)) {
      const group = groups[key];
      const txs = await Transaction.find({ supplier_id: { $in: group.supplier_record_ids } }).lean();
      if (txs.length === 0) continue;

      const score = calculateSupplierScores(txs);
      const cat = group.category || 'Uncategorized';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { category: cat, sample_size: 0, scoreSum: 0, punctSum: 0, disputeSum: 0, n: 0 };
      }
      const c = categoryStats[cat];
      c.sample_size += score.total_transactions;
      c.scoreSum += score.composite_score;
      c.punctSum += score.on_time_rate;
      c.disputeSum += score.dispute_rate;
      c.n += 1;
    }

    const categoryBenchmarks = Object.values(categoryStats).map(c => {
      const avgScore = Math.round(c.scoreSum / c.n);
      let grade = 'D';
      if (avgScore >= 92) grade = 'A+';
      else if (avgScore >= 80) grade = 'A';
      else if (avgScore >= 68) grade = 'B';
      else if (avgScore >= 50) grade = 'C';
      return {
        category: c.category,
        sample_size: c.sample_size,
        average_reliability: avgScore,
        punctuality_rate: Math.round(c.punctSum / c.n),
        dispute_rate: Math.round(c.disputeSum / c.n),
        grade
      };
    }).sort((a, b) => b.average_reliability - a.average_reliability);

    res.json({
      success: true,
      data: {
        userContributionCount: maxForAnySupplier, // "contribute X more to unlock" is per-supplier
        isUnlocked,
        unlockThreshold: UNLOCK_THRESHOLD,
        categoryBenchmarks
      }
    });
  } catch (error) {
    console.error('Error loading community overview:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve community overview' });
  }
});

// GET /api/community/supplier/:id - blinded network score for one of MY suppliers
router.get('/supplier/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const mySupplier = await Supplier.findOne({ _id: req.params.id, user_id: userId }).lean();
    if (!mySupplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const myTxs = await Transaction.find({ user_id: userId, supplier_id: mySupplier._id })
      .sort({ actual_date: 1 }).lean();
    const myScore = calculateSupplierScores(myTxs);
    const isUnlocked = myTxs.length >= UNLOCK_THRESHOLD;

    if (!isUnlocked) {
      return res.json({
        success: true,
        data: {
          has_community_data: false,
          locked: true,
          supplier_name: mySupplier.name,
          contributions_logged: myTxs.length,
          contributions_needed: UNLOCK_THRESHOLD - myTxs.length
        }
      });
    }

    const groups = await buildCommunityGroups();
    const normPhone = normalizePhone(mySupplier.phone);
    const key = normPhone || mySupplier.name.trim().toLowerCase();
    const group = groups[key];

    if (!group || group.contributor_user_ids.size < 2) {
      // Unlocked for this user, but no other trader has scored this supplier yet
      return res.json({
        success: true,
        data: { has_community_data: false, locked: false, supplier_name: mySupplier.name }
      });
    }

    const groupTxs = await Transaction.find({ supplier_id: { $in: group.supplier_record_ids } }).lean();
    const communityScore = calculateSupplierScores(groupTxs);

    res.json({
      success: true,
      data: {
        has_community_data: true,
        supplier_name: mySupplier.name,
        contributing_businesses: group.contributor_user_ids.size,
        total_community_transactions: communityScore.total_transactions,
        communityScorecard: communityScore,
        privateScorecard: myScore
      }
    });
  } catch (error) {
    console.error('Error loading supplier community data:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve community data' });
  }
});

module.exports = router;