const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const {
    username,
    password,
    business_name,
    owner_name,
    city,
    market_area,
    trade_category,
    phone
  } = req.body;

  if (!username || !password || !business_name) {
    return res.status(400).json({
      success: false,
      message: 'Username, password, and business name are required'
    });
  }

  try {
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Username is already registered. Please choose another or sign in.'
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      username: username.trim(),
      password: hashedPassword,
      business_name: business_name.trim(),
      owner_name: owner_name ? owner_name.trim() : '',
      city: city || 'Peshawar',
      market_area: market_area || 'General Market',
      trade_category: trade_category || 'Hardware & Tools',
      phone: phone || '',
      community_opt_in: false,
      role: 'trader'
    });

    req.session.user = {
      id: newUser._id.toString(),
      username: newUser.username,
      business_name: newUser.business_name,
      owner_name: newUser.owner_name,
      city: newUser.city,
      market_area: newUser.market_area,
      trade_category: newUser.trade_category,
      phone: newUser.phone,
      community_opt_in: newUser.community_opt_in,
      role: newUser.role
    };

    return res.status(201).json({
      success: true,
      message: 'Business account created successfully!',
      user: req.session.user
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Save in session
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      business_name: user.business_name,
      owner_name: user.owner_name,
      city: user.city,
      market_area: user.market_area,
      trade_category: user.trade_category,
      phone: user.phone,
      community_opt_in: user.community_opt_in,
      role: user.role
    };

    return res.json({
      success: true,
      message: 'Logged in successfully',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (req.session && req.session.user) {
    try {
      const user = await User.findById(req.session.user.id).select('-password');
      if (user) {
        req.session.user = {
          id: user._id.toString(),
          username: user.username,
          business_name: user.business_name,
          owner_name: user.owner_name,
          city: user.city,
          market_area: user.market_area,
          trade_category: user.trade_category,
          phone: user.phone,
          community_opt_in: user.community_opt_in,
          role: user.role
        };
        return res.json({ success: true, user: req.session.user });
      }
    } catch (e) {}
  }
  return res.status(401).json({ success: false, message: 'Not authenticated' });
});

// PUT /api/auth/profile
router.put('/profile', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { business_name, owner_name, city, market_area, trade_category, phone, community_opt_in } = req.body;
  const userId = req.session.user.id;

  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        ...(business_name && { business_name }),
        ...(owner_name !== undefined && { owner_name }),
        ...(city && { city }),
        ...(market_area && { market_area }),
        ...(trade_category && { trade_category }),
        ...(phone !== undefined && { phone }),
        ...(community_opt_in !== undefined && { community_opt_in })
      },
      { new: true }
    ).select('-password');

    req.session.user = {
      id: updated._id.toString(),
      username: updated.username,
      business_name: updated.business_name,
      owner_name: updated.owner_name,
      city: updated.city,
      market_area: updated.market_area,
      trade_category: updated.trade_category,
      phone: updated.phone,
      community_opt_in: updated.community_opt_in,
      role: updated.role
    };

    return res.json({ success: true, message: 'Profile updated', user: req.session.user });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;
