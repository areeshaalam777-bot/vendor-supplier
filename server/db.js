const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Transaction = require('./models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier_scorecard';

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('[MongoDB] Connected successfully to database');
    await seedInitialData();
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
  }
}

async function seedInitialData() {
  try {
    let adminCheck = await User.findOne({ username: 'admin' });
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    if (!adminCheck) {
      const defaultUser = await User.create({
        username: 'admin',
        email: 'admin@scorecard.pk',
        password: hashedPassword,
        business_name: 'Khyber Hardware & Industrial Store',
        owner_name: 'Ali Khan',
        city: 'Peshawar',
        market_area: 'Namak Mandi',
        trade_category: 'Hardware & Tools',
        phone: '0300-5912345',
        community_opt_in: true,
        role: 'admin'
      });

      console.log('[MongoDB] Created default admin account: admin / admin123');

      // Seed suppliers for admin
      const s1 = await Supplier.create({
        user_id: defaultUser._id,
        name: 'Pak Fasteners & Tools Co.',
        phone: '0312-9844123',
        city: 'Lahore',
        market_area: 'Shah Alam Market',
        category: 'Hardware & Tools',
        payment_terms: '15 Days Credit',
        notes: 'Main distributor for high tensile bolts and tools. High volume partner.'
      });

      const s2 = await Supplier.create({
        user_id: defaultUser._id,
        name: 'Peshawar Sanitary & Pipe Mill',
        phone: '0333-9182736',
        city: 'Peshawar',
        market_area: 'Khyber Bazar / G.T Road',
        category: 'Sanitary & Pipes',
        payment_terms: 'Cash on Delivery',
        notes: 'Local PVC and GI pipe supplier. Occasional wall-thickness variance.'
      });

      const s3 = await Supplier.create({
        user_id: defaultUser._id,
        name: 'Indus Industrial Steel Mills',
        phone: '0301-4455667',
        city: 'Rawalpindi',
        market_area: 'I-9 Industrial Area',
        category: 'Raw Materials',
        payment_terms: '50% Advance, 50% on Delivery',
        notes: 'Structural steel and angle iron supplier. Delivers via heavy truck.'
      });

      const s4 = await Supplier.create({
        user_id: defaultUser._id,
        name: 'Al-Madina Electric & Wires',
        phone: '0321-7788990',
        city: 'Karachi',
        market_area: 'Bolton Market / Saddar',
        category: 'Electronics',
        payment_terms: 'Cash on Delivery',
        notes: 'Copper wiring, breakers, and distribution boxes. Transport via Daewoo Cargo.'
      });

      // Seed realistic transactions
      await Transaction.create([
        {
          user_id: defaultUser._id,
          supplier_id: s1._id,
          item_description: 'High-Tensile Hex Bolts M12 (Box of 500)',
          category: 'Hardware & Tools',
          quantity_ordered: 20,
          quantity_received: 20,
          promised_date: '2026-07-10',
          actual_date: '2026-07-10',
          quality_rating: 5,
          has_dispute: 0,
          dispute_status: 'None',
          dispute_notes: 'Delivered exactly on time via cargo. Perfect quality.',
          amount_pkr: 85000
        },
        {
          user_id: defaultUser._id,
          supplier_id: s1._id,
          item_description: 'Masonry Drill Bits 8mm/10mm (Sets)',
          category: 'Hardware & Tools',
          quantity_ordered: 50,
          quantity_received: 50,
          promised_date: '2026-07-25',
          actual_date: '2026-07-26',
          quality_rating: 4,
          has_dispute: 0,
          dispute_status: 'None',
          dispute_notes: '1 day cargo delay due to rain on motorway. Good packing.',
          amount_pkr: 62000
        },
        {
          user_id: defaultUser._id,
          supplier_id: s1._id,
          item_description: 'Heavy Duty Angle Grinders 850W',
          category: 'Hardware & Tools',
          quantity_ordered: 15,
          quantity_received: 12,
          promised_date: '2026-08-08',
          actual_date: '2026-08-08',
          quality_rating: 3,
          has_dispute: 1,
          dispute_reason: 'Short Delivery',
          dispute_status: 'Resolved',
          dispute_notes: '3 boxes short in parcel. Contacted owner, adjusted next bill by PKR 21,000.',
          amount_pkr: 105000
        },
        {
          user_id: defaultUser._id,
          supplier_id: s2._id,
          item_description: 'PVC Pipes 4-inch Class B (10ft lengths)',
          category: 'Sanitary & Pipes',
          quantity_ordered: 200,
          quantity_received: 200,
          promised_date: '2026-07-05',
          actual_date: '2026-07-06',
          quality_rating: 4,
          has_dispute: 0,
          dispute_status: 'None',
          dispute_notes: 'Standard first order.',
          amount_pkr: 180000
        },
        {
          user_id: defaultUser._id,
          supplier_id: s2._id,
          item_description: 'PPRC Fittings & Elbows 25mm (Bags)',
          category: 'Sanitary & Pipes',
          quantity_ordered: 40,
          quantity_received: 32,
          promised_date: '2026-07-22',
          actual_date: '2026-07-25',
          quality_rating: 2,
          has_dispute: 1,
          dispute_reason: 'Short Delivery',
          dispute_status: 'Unresolved',
          dispute_notes: '8 bags missing. Stock ran out at factory, supplier did not reimburse.',
          amount_pkr: 76000
        },
        {
          user_id: defaultUser._id,
          supplier_id: s2._id,
          item_description: 'GI Pipe Nipples 1-inch (Bundles)',
          category: 'Sanitary & Pipes',
          quantity_ordered: 50,
          quantity_received: 45,
          promised_date: '2026-08-12',
          actual_date: '2026-08-18',
          quality_rating: 2,
          has_dispute: 1,
          dispute_reason: 'Late Arrival',
          dispute_status: 'Open',
          dispute_notes: 'Promised Thursday delivery, arrived 6 days late after followups.',
          amount_pkr: 95000
        },
        {
          user_id: defaultUser._id,
          supplier_id: s3._id,
          item_description: 'Deformed Steel Rebar Grade 60 (Tons)',
          category: 'Raw Materials',
          quantity_ordered: 5,
          quantity_received: 5,
          promised_date: '2026-08-01',
          actual_date: '2026-08-02',
          quality_rating: 5,
          has_dispute: 0,
          dispute_status: 'None',
          dispute_notes: 'Delivered via flatbed truck. Lab test certificate provided.',
          amount_pkr: 1250000
        }
      ]);

      // Seed a 2nd anonymous user for community aggregate demo
      const otherUser = await User.create({
        username: 'peshawar_workshop',
        password: bcrypt.hashSync('trader2026', 10),
        business_name: 'Pak Industry Engineering Works',
        owner_name: 'Rashid Mehmood',
        city: 'Peshawar',
        market_area: 'Small Industrial Estate',
        trade_category: 'Hardware & Tools',
        phone: '0345-9988776',
        community_opt_in: true,
        role: 'trader'
      });

      const otherSupplier = await Supplier.create({
        user_id: otherUser._id,
        name: 'Pak Fasteners & Tools Co.',
        phone: '0312-9844123', // Matches phone number for community pool!
        city: 'Lahore',
        market_area: 'Shah Alam Market',
        category: 'Hardware & Tools',
        payment_terms: '30 Days Credit',
        notes: 'Network verified supplier.'
      });

      for (let i = 0; i < 5; i++) {
        await Transaction.create({
          user_id: otherUser._id,
          supplier_id: otherSupplier._id,
          item_description: 'Industrial Hex Socket Cap Screws Grade 8.8',
          category: 'Hardware & Tools',
          quantity_ordered: 50,
          quantity_received: 50,
          promised_date: `2026-06-0${i+1}`,
          actual_date: `2026-06-0${i+1}`,
          quality_rating: 5,
          has_dispute: 0,
          dispute_status: 'None',
          dispute_notes: 'Order completed smoothly.',
          amount_pkr: 65000
        });
      }

      console.log('[MongoDB] Seeded initial Pakistani SME suppliers and community benchmark records.');
    } else {
      if (adminCheck.role !== 'admin') {
        adminCheck.role = 'admin';
        await adminCheck.save();
        console.log('[MongoDB] Updated existing admin role to "admin"');
      }
    }
  } catch (err) {
    console.error('[MongoDB] Seeding error:', err.message);
  }
}

module.exports = {
  connectDB,
  User,
  Supplier,
  Transaction
};
