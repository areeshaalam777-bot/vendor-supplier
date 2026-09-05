const express = require('express');
const router = express.Router();
const { Supplier, Transaction } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { calculateSupplierScores } = require('../scoring');

// All transaction routes require authentication
router.use(requireAuth);

// GET /api/transactions - Filterable transaction ledger
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { supplier_id, category, has_dispute, dispute_status, search } = req.query;

    const query = { user_id: userId };

    if (supplier_id) {
      query.supplier_id = supplier_id;
    }

    if (category) {
      query.category = category;
    }

    if (has_dispute !== undefined && has_dispute !== '') {
      query.has_dispute = Number(has_dispute);
    }

    if (dispute_status) {
      query.dispute_status = dispute_status;
    }

    if (search) {
      query.$or = [
        { item_description: { $regex: search, $options: 'i' } },
        { dispute_notes: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(query)
      .populate('supplier_id', 'name phone market_area city category')
      .sort({ actual_date: -1, _id: -1 })
      .lean();

    const formatted = transactions.map(t => ({
      ...t,
      id: t._id.toString(),
      supplier_name: t.supplier_id ? t.supplier_id.name : 'Unknown Supplier',
      supplier_phone: t.supplier_id ? t.supplier_id.phone : '',
      supplier_market: t.supplier_id ? t.supplier_id.market_area : '',
      supplier_category: t.supplier_id ? t.supplier_id.category : ''
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve transactions' });
  }
});

// POST /api/transactions - Quick <2 min transaction logger
router.post('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      supplier_id,
      item_description,
      category,
      quantity_ordered,
      quantity_received,
      promised_date,
      actual_date,
      quality_rating,
      has_dispute,
      dispute_reason,
      dispute_status,
      dispute_notes,
      amount_pkr
    } = req.body;

    if (!supplier_id || !item_description || quantity_ordered === undefined || !promised_date || !actual_date) {
      return res.status(400).json({
        success: false,
        message: 'Supplier, Item description, Quantity ordered, Promised date, and Actual date are required'
      });
    }

    // Verify supplier belongs to user
    const supplier = await Supplier.findOne({ _id: supplier_id, user_id: userId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found in your registry' });
    }

    const isDispute = has_dispute === 1 || has_dispute === '1' || has_dispute === true ? 1 : 0;
    const statusDispute = isDispute ? (dispute_status || 'Open') : 'None';

    const created = await Transaction.create({
      user_id: userId,
      supplier_id: supplier._id,
      item_description: item_description.trim(),
      category: category || 'Hardware & Tools',
      quantity_ordered: parseFloat(quantity_ordered),
      quantity_received: quantity_received !== undefined && quantity_received !== '' ? parseFloat(quantity_received) : parseFloat(quantity_ordered),
      promised_date,
      actual_date,
      quality_rating: quality_rating ? parseInt(quality_rating) : 5,
      has_dispute: isDispute,
      dispute_reason: isDispute ? (dispute_reason || 'Other') : null,
      dispute_status: statusDispute,
      dispute_notes: dispute_notes ? dispute_notes.trim() : '',
      amount_pkr: amount_pkr ? parseFloat(amount_pkr) : 0
    });

    res.status(201).json({
      success: true,
      message: 'Transaction logged and supplier reliability scorecard updated!',
      data: {
        ...created.toObject(),
        id: created._id.toString(),
        supplier_name: supplier.name,
        supplier_phone: supplier.phone
      }
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to record transaction' });
  }
});

// PUT /api/transactions/:id - Update transaction or resolve dispute
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const txId = req.params.id;
    const { dispute_status, dispute_notes, quality_rating } = req.body;

    const updated = await Transaction.findOneAndUpdate(
      { _id: txId, user_id: userId },
      {
        ...(dispute_status && { dispute_status }),
        ...(dispute_notes !== undefined && { dispute_notes }),
        ...(quality_rating !== undefined && { quality_rating })
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Transaction record not found' });
    }

    res.json({ success: true, message: 'Transaction updated successfully', data: updated });
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ success: false, message: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const txId = req.params.id;

    const deleted = await Transaction.findOneAndDelete({ _id: txId, user_id: userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, message: 'Transaction removed from ledger' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to delete transaction' });
  }
});

// GET /api/transactions/summary/stats - High-level metrics for dashboard
router.get('/summary/stats', async (req, res) => {
  try {
    const userId = req.session.user.id;

    const totalSuppliers = await Supplier.countDocuments({ user_id: userId });
    const totalTransactions = await Transaction.countDocuments({ user_id: userId });
    const totalDisputes = await Transaction.countDocuments({
      user_id: userId,
      has_dispute: 1,
      dispute_status: { $ne: 'Resolved' }
    });

    const mongoose = require('mongoose');
    let totalSpendPKR = 0;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const spendAgg = await Transaction.aggregate([
        { $match: { user_id: userObjectId } },
        { $group: { _id: null, total: { $sum: '$amount_pkr' } } }
      ]);
      totalSpendPKR = spendAgg.length > 0 ? (spendAgg[0].total || 0) : 0;
    }

    // Calculate overall portfolio reliability score
    const allTxs = await Transaction.find({ user_id: userId }).lean();
    const overallScorecard = calculateSupplierScores(allTxs);

    // Count deteriorating suppliers
    const suppliers = await Supplier.find({ user_id: userId }).lean();
    let atRiskCount = 0;

    await Promise.all(suppliers.map(async s => {
      const sTxs = await Transaction.find({ user_id: userId, supplier_id: s._id }).sort({ actual_date: 1 }).lean();
      const sc = calculateSupplierScores(sTxs);
      if (sc.risk_status === 'Deteriorating' || sc.composite_score < 60) {
        atRiskCount++;
      }
    }));

    res.json({
      success: true,
      data: {
        totalSuppliers,
        totalTransactions,
        openDisputes: totalDisputes,
        totalSpendPKR,
        averageReliability: overallScorecard.composite_score,
        overallGrade: overallScorecard.grade,
        atRiskSuppliers: atRiskCount,
        punctualityScore: overallScorecard.punctuality_score,
        qualityScore: overallScorecard.quality_score,
        accuracyScore: overallScorecard.quantity_score
      }
    });
  } catch (error) {
    console.error('Error getting summary stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats' });
  }
});

module.exports = router;
