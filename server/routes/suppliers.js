const express = require('express');
const router = express.Router();
const { Supplier, Transaction } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { calculateSupplierScores } = require('../scoring');

// All supplier routes require authentication
router.use(requireAuth);

// GET /api/suppliers - List with search, category filtering & computed 4D scorecards
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { search, category, city, risk } = req.query;

    const query = { user_id: userId };

    if (category) {
      query.category = category;
    }

    if (city) {
      query.city = city;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { market_area: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const rawSuppliers = await Supplier.find(query).sort({ _id: -1 }).lean();

    // Fetch transactions for each supplier and compute reliability metrics
    const suppliersWithScores = await Promise.all(rawSuppliers.map(async supplier => {
      const txs = await Transaction.find({ user_id: userId, supplier_id: supplier._id }).sort({ actual_date: 1 }).lean();
      const scorecard = calculateSupplierScores(txs);

      return {
        ...supplier,
        id: supplier._id.toString(),
        scorecard,
        transaction_count: txs.length
      };
    }));

    // Optional risk filter
    let filtered = suppliersWithScores;
    if (risk === 'Deteriorating') {
      filtered = suppliersWithScores.filter(s => s.scorecard.risk_status === 'Deteriorating');
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve suppliers' });
  }
});

// GET /api/suppliers/compare/matrix - Side-by-side comparison matrix
router.get('/compare/matrix', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { category } = req.query;

    const query = { user_id: userId };
    if (category) query.category = category;

    const suppliers = await Supplier.find(query).lean();

    const comparisonList = await Promise.all(suppliers.map(async s => {
      const txs = await Transaction.find({ user_id: userId, supplier_id: s._id }).sort({ actual_date: 1 }).lean();
      const score = calculateSupplierScores(txs);
      return {
        id: s._id.toString(),
        name: s.name,
        phone: s.phone,
        city: s.city,
        market_area: s.market_area,
        category: s.category,
        payment_terms: s.payment_terms,
        composite_score: score.composite_score,
        grade: score.grade,
        grade_label: score.grade_label,
        punctuality_score: score.punctuality_score,
        on_time_rate: score.on_time_rate,
        avg_delay_days: score.avg_delay_days,
        quantity_score: score.quantity_score,
        accuracy_rate: score.accuracy_rate,
        quality_score: score.quality_score,
        avg_quality_stars: score.avg_quality_stars,
        dispute_score: score.dispute_score,
        dispute_rate: score.dispute_rate,
        dispute_count: score.dispute_count,
        risk_status: score.risk_status,
        total_transactions: score.total_transactions
      };
    }));

    // Sort by composite score descending
    comparisonList.sort((a, b) => b.composite_score - a.composite_score);

    res.json({ success: true, data: comparisonList });
  } catch (error) {
    console.error('Error loading comparison matrix:', error);
    res.status(500).json({ success: false, message: 'Failed to generate comparison matrix' });
  }
});

// GET /api/suppliers/:id - Single supplier details with full timeline & scorecard
router.get('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const supplier = await Supplier.findOne({ _id: req.params.id, user_id: userId }).lean();
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const transactions = await Transaction.find({ user_id: userId, supplier_id: supplier._id })
      .sort({ actual_date: -1, _id: -1 })
      .lean();
    
    const scorecard = calculateSupplierScores(transactions);

    res.json({
      success: true,
      data: {
        ...supplier,
        id: supplier._id.toString(),
        scorecard,
        transactions: transactions.map(t => ({ ...t, id: t._id.toString() }))
      }
    });
  } catch (error) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve supplier details' });
  }
});

// POST /api/suppliers - Create supplier
router.post('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, phone, city, market_area, category, payment_terms, notes } = req.body;

    if (!name || !name.trim() || !phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name and phone number are required' });
    }

    const created = await Supplier.create({
      user_id: userId,
      name: name.trim(),
      phone: phone.trim(),
      city: city || 'Peshawar',
      market_area: market_area ? market_area.trim() : '',
      category: category || 'Hardware & Tools',
      payment_terms: payment_terms || 'Cash on Delivery',
      notes: notes ? notes.trim() : ''
    });

    res.status(201).json({
      success: true,
      message: 'Supplier registered successfully',
      data: {
        ...created.toObject(),
        id: created._id.toString(),
        scorecard: calculateSupplierScores([]),
        transaction_count: 0
      }
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, message: 'Failed to register supplier' });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const supplierId = req.params.id;
    const { name, phone, city, market_area, category, payment_terms, notes } = req.body;

    const updated = await Supplier.findOneAndUpdate(
      { _id: supplierId, user_id: userId },
      {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(city !== undefined && { city }),
        ...(market_area !== undefined && { market_area: market_area.trim() }),
        ...(category !== undefined && { category }),
        ...(payment_terms !== undefined && { payment_terms }),
        ...(notes !== undefined && { notes: notes.trim() })
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: { ...updated, id: updated._id.toString() }
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOneAndDelete({ _id: supplierId, user_id: userId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Cascade delete transactions
    await Transaction.deleteMany({ supplier_id: supplierId, user_id: userId });

    res.json({ success: true, message: 'Supplier record and all transaction logs deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
});

module.exports = router;
