const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'finance_app_super_secret_key_12345';

// Register User
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email, and password.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email.toLowerCase(), passwordHash]
    );

    const userId = result.id;

    // Seed default settings and some mock transactions for immediate wow factor!
    // We will do seeding upon registration for a custom demo user if they registers as "demo@finance.com" or similar!
    // But even standard registration gets a JWT token instantly.
    const token = jwt.sign({ userId, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase(),
        currency: 'NGN'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        settings: JSON.parse(user.settings || '{}')
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get User Profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, currency, settings FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    res.json({
      ...user,
      settings: JSON.parse(user.settings || '{}')
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error retrieving profile.' });
  }
});

// Update Settings
router.put('/settings', authMiddleware, async (req, res) => {
  const { name, currency, settings } = req.body;

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedName = name || user.name;
    const updatedCurrency = currency || user.currency;
    
    let currentSettings = JSON.parse(user.settings || '{}');
    if (settings) {
      currentSettings = { ...currentSettings, ...settings };
    }

    await db.run(
      'UPDATE users SET name = ?, currency = ?, settings = ? WHERE id = ?',
      [updatedName, updatedCurrency, JSON.stringify(currentSettings), req.userId]
    );

    res.json({
      message: 'Settings updated successfully.',
      user: {
        id: req.userId,
        name: updatedName,
        email: user.email,
        currency: updatedCurrency,
        settings: currentSettings
      }
    });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error updating settings.' });
  }
});

module.exports = router;
