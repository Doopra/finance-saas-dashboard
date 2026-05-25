const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const statementRoutes = require('./routes/statements');
const insightRoutes = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: '*', // for easy local development and cross-testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create public static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/insights', insightRoutes);

// Database Seeding Helper for instant wow demonstration data
const seedDemoDataForUser = async (userId) => {
  try {
    const txCount = await db.get('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?', [userId]);
    if (txCount.count > 0) return; // already has data

    console.log(`Seeding demo financial transactions for user ID: ${userId}...`);

    // Create a demo statement record
    const statement = await db.run(
      'INSERT INTO statements (user_id, filename, file_type, status) VALUES (?, ?, ?, ?)',
      [userId, 'Opay_Business_Q1_Statement.pdf', 'pdf', 'completed']
    );
    const stmtId = statement.id;

    // Build 3 months of transactions (March, April, May 2026)
    const demoTxs = [
      // May 2026 Transactions
      { date: '2026-05-24', desc: 'TRANSFER FROM AMINA SALISU - SALES REVENUE', amt: 185000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-05-23', desc: 'POS DEPOSIT - INFLOW', amt: 245000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-05-22', desc: 'OPAY CORP TRANSFER TO SHUAIBU WHOLESALE LTD - STOCK INVENTORY', amt: 850000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-05-22', desc: 'TRANSFER FEE CHARGES', amt: 100, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-05-20', desc: 'AIRTIME RECHARGE - MTNN', amt: 5000, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-05-18', desc: 'POS DEPOSIT - INFLOW', amt: 120000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-05-16', desc: 'TRANSFER FROM CHIDI OBI - SALES INFLOW', amt: 320000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-05-15', desc: 'OPAY WHOLESALE CORP - BULK PRODUCT PURCHASES', amt: 650000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-05-14', desc: 'POS WITHDRAWAL FEE CHARGE', amt: 450, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-05-12', desc: 'TRANSFER FROM BELLO TRADING - SALES INFLOW', amt: 420000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-05-10', desc: 'OFFICE RENT & MAINTENANCE - PERSONAL ADJ', amt: 150000, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-05-08', desc: 'POS DEPOSIT - INFLOW', amt: 280000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-05-04', desc: 'ALIBABA STOCK CLEARANCE - PRODUCT STOCK', amt: 450000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-05-02', desc: 'AIRTIME RECHARGE - AIRTEL', amt: 3000, type: 'debit', cat: 'Miscellaneous Expenses' },

      // April 2026 Transactions
      { date: '2026-04-28', desc: 'TRANSFER FROM KELVIN NWOSU - SALES INFLOW', amt: 190000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-04-27', desc: 'POS DEPOSIT - INFLOW', amt: 310000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-04-25', desc: 'SHUAIBU WHOLESALE LTD - BULK PRODUCT PURCHASES', amt: 720000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-04-25', desc: 'TRANSFER FEE CHARGE', amt: 100, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-04-22', desc: 'POS DEPOSIT - INFLOW', amt: 150000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-04-20', desc: 'TRANSFER FROM FUNKE FABRICS - INFLOW', amt: 270000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-04-16', desc: 'DHL SHIPPING LOGISTICS - STOCK IMPORT', amt: 180000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-04-14', desc: 'POS WITHDRAWAL CHARGE', amt: 300, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-04-12', desc: 'POS DEPOSIT - INFLOW', amt: 235000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-04-10', desc: 'MTN AIRTIME TOPUP', amt: 10000, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-04-06', desc: 'WHOLESALE MARKET DEPO - PRODUCT PURCHASES', amt: 540000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-04-02', desc: 'INTERNET SUBSCRIPTION - SPECTRANET', amt: 18000, type: 'debit', cat: 'Miscellaneous Expenses' },

      // March 2026 Transactions
      { date: '2026-03-29', desc: 'TRANSFER FROM KELVIN NWOSU - SALES INFLOW', amt: 155000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-03-27', desc: 'POS DEPOSIT - INFLOW', amt: 180000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-03-25', desc: 'SHUAIBU WHOLESALE LTD - BULK PRODUCT PURCHASES', amt: 600000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-03-24', desc: 'TRANSFER FEE CHARGE', amt: 100, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-03-20', desc: 'POS DEPOSIT - INFLOW', amt: 120000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-03-18', desc: 'TRANSFER FROM FUNKE FABRICS - INFLOW', amt: 240000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-03-15', desc: 'DHL SHIPPING LOGISTICS - STOCK IMPORT', amt: 130000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-03-12', desc: 'POS WITHDRAWAL CHARGE', amt: 300, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-03-10', desc: 'POS DEPOSIT - INFLOW', amt: 195000, type: 'credit', cat: 'Sales Income' },
      { date: '2026-03-08', desc: 'MTN AIRTIME TOPUP', amt: 5000, type: 'debit', cat: 'Miscellaneous Expenses' },
      { date: '2026-03-05', desc: 'WHOLESALE MARKET DEPO - PRODUCT PURCHASES', amt: 480000, type: 'debit', cat: 'Product Purchases' },
      { date: '2026-03-02', desc: 'INTERNET SUBSCRIPTION - SPECTRANET', amt: 15000, type: 'debit', cat: 'Miscellaneous Expenses' }
    ];

    for (const tx of demoTxs) {
      await db.run(
        `INSERT INTO transactions (statement_id, user_id, date, description, amount, type, category, original_category, bank_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [stmtId, userId, tx.date, tx.desc, tx.amt, tx.type, tx.cat, tx.cat, 'OPay Business']
      );
    }

    console.log(`Successfully seeded ${demoTxs.length} transactions for user ${userId}.`);
  } catch (err) {
    console.error('Failed to seed demo data:', err);
  }
};

// Seed endpoint triggered on login/register if requested or auto-checked
app.post('/api/auth/seed', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  await seedDemoDataForUser(userId);
  res.json({ message: 'Demo data seeded successfully.' });
});

// Root check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected', port: PORT });
});

module.exports = app;
