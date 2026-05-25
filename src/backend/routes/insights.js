const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Helper: Calculate average and standard deviation for Z-score anomaly detection
const getAnomalies = (transactions) => {
  const debits = transactions.filter(t => t.type === 'debit');
  if (debits.length < 5) return [];

  const amounts = debits.map(t => t.amount);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Return transactions that are more than 2.2 standard deviations above the average
  return debits.filter(t => t.amount > (avg + 2.2 * stdDev)).map(t => ({
    id: t.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    average: Math.round(avg),
    deviation: Math.round((t.amount - avg) / stdDev)
  }));
};

// Helper: Find duplicates (same date, amount, and highly similar descriptions)
const getDuplicates = (transactions) => {
  const duplicates = [];
  const checked = new Set();

  for (let i = 0; i < transactions.length; i++) {
    if (checked.has(transactions[i].id)) continue;
    
    const matches = [];
    const t1 = transactions[i];

    for (let j = i + 1; j < transactions.length; j++) {
      const t2 = transactions[j];
      if (t1.date === t2.date && Math.abs(t1.amount - t2.amount) < 0.01 && t1.type === t2.type) {
        // Compare descriptions (basic keyword check)
        const words1 = t1.description.toLowerCase().split(/\s+/);
        const words2 = t2.description.toLowerCase().split(/\s+/);
        const common = words1.filter(w => words2.includes(w) && w.length > 2);
        
        if (common.length > 0) {
          matches.push(t2);
          checked.add(t2.id);
        }
      }
    }

    if (matches.length > 0) {
      duplicates.push({
        base: t1,
        matches
      });
      checked.add(t1.id);
    }
  }

  return duplicates;
};

// Helper: Linear regression cash flow forecast (3 months out)
const getCashFlowForecast = (monthlyData) => {
  if (monthlyData.length < 2) {
    return [
      { month: 'Next Month (Forecast)', inflow: 0, outflow: 0 },
      { month: 'Month +2 (Forecast)', inflow: 0, outflow: 0 },
      { month: 'Month +3 (Forecast)', inflow: 0, outflow: 0 }
    ];
  }

  const n = monthlyData.length;
  const x = Array.from({ length: n }, (_, i) => i); // time indices
  
  const yIn = monthlyData.map(m => m.inflow);
  const yOut = monthlyData.map(m => m.outflow);

  const getSlopeAndIntercept = (xs, ys) => {
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((sum, val, idx) => sum + val * ys[idx], 0);
    const sumXX = xs.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? ys[0] : intercept };
  };

  const inModel = getSlopeAndIntercept(x, yIn);
  const outModel = getSlopeAndIntercept(x, yOut);

  const forecast = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Find current month index
  const lastMonthName = monthlyData[n - 1].month.split(' ')[0];
  let lastMonthIdx = monthNames.indexOf(lastMonthName);
  if (lastMonthIdx === -1) lastMonthIdx = new Date().getMonth();

  for (let i = 1; i <= 3; i++) {
    const targetIdx = (n - 1) + i;
    const projectedIn = Math.max(0, Math.round(inModel.slope * targetIdx + inModel.intercept));
    const projectedOut = Math.max(0, Math.round(outModel.slope * targetIdx + outModel.intercept));
    
    const nextMonthName = monthNames[(lastMonthIdx + i) % 12];
    const yearSuffix = new Date().getFullYear() + Math.floor((lastMonthIdx + i) / 12);

    forecast.push({
      month: `${nextMonthName} ${yearSuffix} (Projected)`,
      inflow: projectedIn,
      outflow: projectedOut,
      net: projectedIn - projectedOut,
      isForecast: true
    });
  }

  return forecast;
};

// GET Financial Insights Analysis
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY date ASC', [req.userId]);
    
    if (transactions.length === 0) {
      return res.json({
        summary: "You don't have any financial transactions on record. Please upload a bank statement to generate insights!",
        healthScore: 100,
        anomalies: [],
        duplicates: [],
        forecast: [],
        kpis: { totalIncome: 0, totalExpenses: 0, netProfit: 0, grossMargin: 0 }
      });
    }

    // 1. Calculations for KPIs
    let totalIncome = 0;
    let totalExpenses = 0;
    let productPurchases = 0;
    let miscellaneous = 0;

    transactions.forEach(t => {
      if (t.type === 'credit') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
        if (t.category === 'Product Purchases') {
          productPurchases += t.amount;
        } else if (t.category === 'Miscellaneous Expenses') {
          miscellaneous += t.amount;
        }
      }
    });

    const netProfit = totalIncome - totalExpenses;
    const grossMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    // 2. Anomaly and Duplicate Detection
    const anomalies = getAnomalies(transactions);
    const duplicates = getDuplicates(transactions);

    // 3. Assemble Monthly Totals for Trend & Forecast
    const monthlyMap = {};
    transactions.forEach(t => {
      // Extract YYYY-MM
      const monthKey = t.date.substring(0, 7); 
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, inflow: 0, outflow: 0 };
      }
      if (t.type === 'credit') {
        monthlyMap[monthKey].inflow += t.amount;
      } else {
        monthlyMap[monthKey].outflow += t.amount;
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    
    // Map dates to friendly names "Month YYYY"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const friendlyMonthlyData = sortedMonths.map(m => {
      const parts = m.month.split('-');
      const monthIdx = parseInt(parts[1]) - 1;
      return {
        month: `${monthNames[monthIdx]} ${parts[0]}`,
        inflow: Math.round(m.inflow),
        outflow: Math.round(m.outflow),
        net: Math.round(m.inflow - m.outflow)
      };
    });

    // Linear regression forecast
    const forecast = getCashFlowForecast(friendlyMonthlyData);

    // 4. Calculate Financial Health Score (0 - 100)
    // Formula components:
    // - Profitability: Net margin ratio (50 points)
    // - Operations: Product expenses ratio (ideally product purchases should cover bulk of outflow, not misc) (30 points)
    // - Liquidity: Positive cash months ratio (20 points)
    let marginPoints = Math.max(0, Math.min(50, Math.round(((totalIncome - totalExpenses) / (totalIncome || 1)) * 50)));
    if (totalIncome === 0) marginPoints = 0;
    
    const miscRatio = totalExpenses > 0 ? miscellaneous / totalExpenses : 0;
    const expensePoints = Math.round((1 - miscRatio) * 30); // penalize heavy miscellaneous spending

    const positiveMonths = friendlyMonthlyData.filter(m => m.net > 0).length;
    const liquidityPoints = friendlyMonthlyData.length > 0 
      ? Math.round((positiveMonths / friendlyMonthlyData.length) * 20) 
      : 20;

    const healthScore = Math.min(100, Math.max(10, marginPoints + expensePoints + liquidityPoints));

    // 5. Generate Financial Summaries (Rule-Based & cached AI templates)
    const formattedIncome = totalIncome.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    const formattedExpenses = totalExpenses.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    const formattedProfit = netProfit.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    
    let summary = `Your business has generated ${formattedIncome} in total revenue and spent ${formattedExpenses} on operational costs, giving you an estimated net profit of ${formattedProfit} (Margin: ${grossMargin}%). `;
    
    if (netProfit < 0) {
      summary += "⚠️ Warning: Your business is currently operating at a net loss. Consider reducing Miscellaneous Expenses or increasing sales prices to improve your cash flow.";
    } else if (miscRatio > 0.40) {
      summary += "💡 Cost Saving: Over 40% of your expenses fall under Miscellaneous Expenses. Review pos charges, personal transfers, and unclassified transfers to optimize your margins.";
    } else {
      summary += "🎉 Stable Performance: Your cash inflows are strong and properly managed. Keep bulk-buying inventory under Product Purchases to maintain stable margins!";
    }

    res.json({
      summary,
      healthScore,
      kpis: {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfit),
        grossMargin,
        productPurchases: Math.round(productPurchases),
        miscellaneous: Math.round(miscellaneous)
      },
      anomalies,
      duplicates,
      monthlyTrends: friendlyMonthlyData,
      forecast
    });

  } catch (err) {
    console.error('Insights calculation error:', err);
    res.status(500).json({ error: 'Server error calculating business insights.' });
  }
});

// POST Contextual Financial Chat Assistant
router.post('/chat', authMiddleware, async (req, res) => {
  const { message, history = [] } = req.body;
  const userGeminiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

  if (!message) {
    return res.status(400).json({ error: 'Please provide a message.' });
  }

  try {
    // 1. Gather all statistics from DB to build contextual prompts or rule replies
    const transactions = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [req.userId]);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let productPurchases = 0;
    let miscellaneous = 0;
    const categoryBreakdown = {};

    transactions.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      if (t.type === 'credit') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
        if (t.category === 'Product Purchases') {
          productPurchases += t.amount;
        } else if (t.category === 'Miscellaneous Expenses') {
          miscellaneous += t.amount;
        }
      }
    });

    const netProfit = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;
    const currency = '₦';

    // 2. Dual Mode Assistant
    if (userGeminiKey) {
      // Real Gemini Mode: Contextual financial prompt engineering
      try {
        const genAI = new GoogleGenerativeAI(userGeminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const context = `
          You are Mkpong Ai FinApp, a world-class financial advisor for an African business owner.
          Below is a summary of the business's actual transaction data extracted from their uploaded bank statements:
          
          - Total Revenue: ${currency}${totalIncome.toLocaleString()}
          - Total Expenses: ${currency}${totalExpenses.toLocaleString()}
          - Net Profit: ${currency}${netProfit.toLocaleString()}
          - Gross Profit Margin: ${margin}%
          - Total spent on Product Purchases (stock/supplier/wholesale): ${currency}${productPurchases.toLocaleString()}
          - Total spent on Miscellaneous Expenses (transfers, POS, airtime): ${currency}${miscellaneous.toLocaleString()}
          - Total transaction count: ${transactions.length}
          
          Category breakdown:
          ${JSON.stringify(categoryBreakdown)}

          Recent Transactions (up to 15):
          ${JSON.stringify(transactions.slice(0, 15).map(t => ({ date: t.date, desc: t.description, amt: t.amount, type: t.type, cat: t.category })))}

          User's Question: "${message}"

          Instructions:
          - Use actual numbers from the data provided. Be extremely helpful and direct.
          - Speak professionally, encouragingly, and clearly. Keep it concise.
          - Offer advice on saving money (e.g. reducing miscellaneous spending or improving supply pricing).
        `;

        const result = await model.generateContent(context);
        const reply = result.response.text().trim();
        return res.json({ reply });
      } catch (err) {
        console.error('Gemini Chat call failed, falling back to local NLP:', err);
      }
    }

    // 3. High-Fidelity Local NLP Fallback Engine
    // Looks for keywords: stock, product, buy, spend, sales, profit, margin, revenue, summary
    const cleanMsg = message.toLowerCase();
    let reply = "";

    if (cleanMsg.includes('summary') || cleanMsg.includes('how am i doing') || cleanMsg.includes('overview') || cleanMsg.includes('status')) {
      reply = `Hello! Here is your quick business financial summary:
      
📈 **Total Inflows (Revenue)**: ${currency}${totalIncome.toLocaleString()}
📉 **Total Outflows (Expenses)**: ${currency}${totalExpenses.toLocaleString()}
💼 **Net Profit**: ${currency}${netProfit.toLocaleString()} (Estimated Profit Margin: **${margin}%**)

👜 *Stock Purchases*: You spent **${currency}${productPurchases.toLocaleString()}** restocking products.
🌀 *Misc spending*: You spent **${currency}${miscellaneous.toLocaleString()}** on POS fees, transfers, and airtime.

Overall, your business is in ${netProfit >= 0 ? 'good health' : 'need of cash flow adjustments'}. What specific analytics or savings tips would you like to review?`;
    } 
    
    else if (cleanMsg.includes('product') || cleanMsg.includes('stock') || cleanMsg.includes('supplier') || cleanMsg.includes('inventory') || cleanMsg.includes('wholesale')) {
      reply = `You have spent a total of **${currency}${productPurchases.toLocaleString()}** on **Product Purchases** (inventory/wholesale stock). This represents **${totalExpenses > 0 ? ((productPurchases / totalExpenses) * 100).toFixed(0) : 0}%** of your total outflows. 
      
Purchasing inventory in bulk is a great way to reduce costs. Let me know if you would like me to compile a list of your top wholesale transactions!`;
    } 
    
    else if (cleanMsg.includes('sales') || cleanMsg.includes('revenue') || cleanMsg.includes('income') || cleanMsg.includes('earn') || cleanMsg.includes('made')) {
      const topSales = transactions.filter(t => t.type === 'credit').sort((a, b) => b.amount - a.amount).slice(0, 3);
      let topSalesStr = topSales.map(t => `- **${currency}${t.amount.toLocaleString()}** on ${t.date} (${t.description})`).join('\n');
      
      reply = `Your total sales revenue is **${currency}${totalIncome.toLocaleString()}**. 
      
Your highest inflows are:
${topSalesStr || '- No large sales records found.'}

Weekly sales are averaging **${currency}(${(totalIncome / 4).toFixed(0)})**. Consider launching promotional discounts on slower sales days to keep inflows steady!`;
    } 
    
    else if (cleanMsg.includes('miscellaneous') || cleanMsg.includes('misc') || cleanMsg.includes('transfer') || cleanMsg.includes('charges') || cleanMsg.includes('pos')) {
      const pct = totalExpenses > 0 ? ((miscellaneous / totalExpenses) * 100).toFixed(0) : 0;
      reply = `You have spent **${currency}${miscellaneous.toLocaleString()}** on **Miscellaneous Expenses** (transfers, POS terminal withdrawals, bank commissions, airtime). This represents **${pct}%** of your total expenses.
      
💡 **Savings Recommendation**: Try to minimize POS card withdrawals and bank transfers where possible, as accumulated transaction fees represent a minor cash drain. Moving transactions to high-volume corporate accounts can reduce processing fees by 15-20%.`;
    } 
    
    else if (cleanMsg.includes('profit') || cleanMsg.includes('margin') || cleanMsg.includes('net') || cleanMsg.includes('lose') || cleanMsg.includes('gain')) {
      reply = `Your net profit is **${currency}${netProfit.toLocaleString()}** on a revenue of **${currency}${totalIncome.toLocaleString()}**. 
      
This gives you an estimated gross profit margin of **${margin}%**. 
- A margin above **50%** is excellent for product-based SMEs!
- A margin below **25%** suggests you may need to renegotiate prices with your wholesale suppliers or raise retail prices.`;
    } 
    
    else {
      // General response
      reply = `Hi! I'm your AI Financial Assistant. I can help analyze the financial data you uploaded. 
      
You can ask me questions like:
- *"Give me a business summary"*
- *"How much did I spend on stock?"*
- *"What is my sales revenue?"*
- *"Show me miscellaneous spending recommendations"*
- *"What is my estimated profit margin?"*

What would you like to investigate in your bank statement records today?`;
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Server error processing chat assistant message.' });
  }
});

module.exports = router;
