const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Helper to sanitize keywords for rule matching
const sanitizeKeyword = (str) => {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
};

// GET Transactions (with filters)
router.get('/', authMiddleware, async (req, res) => {
  const { category, type, startDate, endDate, search, limit = 50, offset = 0 } = req.query;

  let queryStr = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [req.userId];

  if (category) {
    queryStr += ' AND category = ?';
    params.push(category);
  }

  if (type) {
    queryStr += ' AND type = ?';
    params.push(type);
  }

  if (startDate) {
    queryStr += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    queryStr += ' AND date <= ?';
    params.push(endDate);
  }

  if (search) {
    queryStr += ' AND description LIKE ?';
    params.push(`%${search}%`);
  }

  // Count total matching for pagination
  let countQueryStr = queryStr.replace('SELECT *', 'SELECT COUNT(*) as total');
  const totalCountResult = await db.get(countQueryStr, params);
  const total = totalCountResult ? totalCountResult.total : 0;

  // Add sorting and pagination
  queryStr += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  try {
    const transactions = await db.query(queryStr, params);
    
    // Also calculate totals for filtered data
    const summarySql = `
      SELECT 
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as totalInflow,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as totalOutflow
      FROM transactions 
      WHERE user_id = ?
      ${category ? 'AND category = ?' : ''}
      ${type ? 'AND type = ?' : ''}
      ${startDate ? 'AND date >= ?' : ''}
      ${endDate ? 'AND date <= ?' : ''}
      ${search ? 'AND description LIKE ?' : ''}
    `;
    
    const summaryParams = [req.userId];
    if (category) summaryParams.push(category);
    if (type) summaryParams.push(type);
    if (startDate) summaryParams.push(startDate);
    if (endDate) summaryParams.push(endDate);
    if (search) summaryParams.push(`%${search}%`);

    const summaryResult = await db.get(summarySql, summaryParams);

    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      summary: {
        totalInflow: summaryResult.totalInflow || 0,
        totalOutflow: summaryResult.totalOutflow || 0,
        netCashFlow: (summaryResult.totalInflow || 0) - (summaryResult.totalOutflow || 0)
      }
    });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Server error retrieving transactions.' });
  }
});

// POST Manual Transaction
router.post('/', authMiddleware, async (req, res) => {
  const { date, description, amount, type, category, bank_name } = req.body;

  if (!date || !description || amount === undefined || !type || !category) {
    return res.status(400).json({ error: 'Please provide all required transaction fields.' });
  }

  try {
    const result = await db.run(
      `INSERT INTO transactions (user_id, date, description, amount, type, category, original_category, bank_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, date, description, amount, type, category, category, bank_name || 'Manual Entry']
    );

    const newTx = await db.get('SELECT * FROM transactions WHERE id = ?', [result.id]);
    res.status(201).json(newTx);
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Server error saving transaction.' });
  }
});

// PUT Edit Transaction & Auto-Learning
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { category, date, description, amount, type, bank_name } = req.body;

  try {
    const originalTx = await db.get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!originalTx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const updatedCategory = category || originalTx.category;
    const updatedDate = date || originalTx.date;
    const updatedDescription = description || originalTx.description;
    const updatedAmount = amount !== undefined ? amount : originalTx.amount;
    const updatedType = type || originalTx.type;
    const updatedBank = bank_name || originalTx.bank_name;

    // Update the transaction in db
    await db.run(
      `UPDATE transactions 
       SET category = ?, date = ?, description = ?, amount = ?, type = ?, bank_name = ? 
       WHERE id = ? AND user_id = ?`,
      [updatedCategory, updatedDate, updatedDescription, updatedAmount, updatedType, updatedBank, id, req.userId]
    );

    let learnedCount = 0;
    let ruleAdded = false;

    // AUTO-LEARNING: If category was changed, learn this rule!
    if (category && category !== originalTx.category) {
      // Formulate a keyword pattern from description
      // Extract main words, ignoring numbers and special characters
      const cleanDesc = sanitizeKeyword(updatedDescription);
      
      // If we have a significant keyword (longer than 3 characters)
      if (cleanDesc.length > 3) {
        // Look for similar descriptions. We can take a snippet or the full text
        // Let's create an auto-learning rule for this description pattern
        const pattern = cleanDesc;

        // Save rule in category_rules table
        await db.run(
          `INSERT OR REPLACE INTO category_rules (user_id, pattern, category) VALUES (?, ?, ?)`,
          [req.userId, pattern, updatedCategory]
        );
        ruleAdded = true;

        // Apply rule to all other transactions with similar descriptions!
        // We look for descriptions containing the pattern keywords
        const updateResult = await db.run(
          `UPDATE transactions 
           SET category = ? 
           WHERE user_id = ? 
           AND id != ?
           AND (LOWER(description) LIKE ? OR ? LIKE '%' || LOWER(description) || '%')`,
          [updatedCategory, req.userId, id, `%${pattern}%`, pattern]
        );

        learnedCount = updateResult.changes || 0;
      }
    }

    const updatedTx = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);

    res.json({
      transaction: updatedTx,
      autoLearning: {
        ruleAdded,
        learnedCount,
        message: learnedCount > 0 
          ? `AI auto-learned this correction and updated ${learnedCount} other transactions matching similar descriptions!`
          : ruleAdded 
            ? 'AI registered this category preference for future uploads!' 
            : null
      }
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Server error updating transaction.' });
  }
});

// DELETE Transaction
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Server error deleting transaction.' });
  }
});

// GET Category Rules
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const rules = await db.query('SELECT * FROM category_rules WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rules);
  } catch (err) {
    console.error('Fetch rules error:', err);
    res.status(500).json({ error: 'Server error retrieving rules.' });
  }
});

// POST Category Rule
router.post('/rules', authMiddleware, async (req, res) => {
  const { pattern, category } = req.body;

  if (!pattern || !category) {
    return res.status(400).json({ error: 'Please provide pattern and category.' });
  }

  try {
    const cleanPattern = sanitizeKeyword(pattern);
    const result = await db.run(
      'INSERT OR REPLACE INTO category_rules (user_id, pattern, category) VALUES (?, ?, ?)',
      [req.userId, cleanPattern, category]
    );

    // Apply rule immediately to existing transactions
    const updateResult = await db.run(
      `UPDATE transactions 
       SET category = ? 
       WHERE user_id = ? 
       AND LOWER(description) LIKE ?`,
      [category, req.userId, `%${cleanPattern}%`]
    );

    res.status(201).json({
      id: result.id,
      pattern: cleanPattern,
      category,
      appliedCount: updateResult.changes || 0
    });
  } catch (err) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Server error creating rule.' });
  }
});

// DELETE Category Rule
router.delete('/rules/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.run('DELETE FROM category_rules WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rule not found.' });
    }
    res.json({ message: 'Rule deleted successfully.' });
  } catch (err) {
    console.error('Delete rule error:', err);
    res.status(500).json({ error: 'Server error deleting rule.' });
  }
});

module.exports = router;
