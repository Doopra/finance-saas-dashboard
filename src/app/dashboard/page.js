"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  ChevronRight, 
  Filter, 
  Plus, 
  Tags, 
  Smartphone, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  
  // Correction modal states
  const [selectedTx, setSelectedTx] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  const fetchDashboardData = async () => {
    try {
      // Fetch insights
      const insights = await api.get('/insights');
      setData(insights);

      // Fetch recent transactions
      const txData = await api.get('/transactions?limit=8');
      setTransactions(txData.transactions);

      // Currency check
      if (user?.currency === 'USD') setCurrencySymbol('$');
      else if (user?.currency === 'EUR') setCurrencySymbol('€');
      else setCurrencySymbol('₦');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleCorrectCategory = async () => {
    if (!selectedTx || !newCategory) return;
    setUpdating(true);
    try {
      const result = await api.put(`/transactions/${selectedTx.id}`, { category: newCategory });
      
      // Update transaction list locally
      setTransactions(prev => prev.map(t => t.id === selectedTx.id ? result.transaction : t));
      
      // Handle auto-learning feedback
      if (result.autoLearning && result.autoLearning.learnedCount > 0) {
        // Confetti burst for awesome user interaction!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
        setSuccessToast(result.autoLearning.message);
      } else {
        setSuccessToast('AI category preference registered successfully!');
      }

      // Re-fetch insights to update totals
      const insights = await api.get('/insights');
      setData(insights);

      setTimeout(() => setSuccessToast(null), 5000);
      setSelectedTx(null);
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setUpdating(false);
    }
  };

  const formatAmount = (amt) => {
    return currencySymbol + Math.round(amt).toLocaleString();
  };

  // Color mappings
  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Product Purchases':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/20';
      case 'Sales Income':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20';
      case 'Miscellaneous Expenses':
      default:
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/20';
    }
  };

  const getHealthColor = (score) => {
    if (score >= 70) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 40) return 'text-amber-500 stroke-amber-500';
    return 'text-red-500 stroke-red-500';
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">Assembling your workspace...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || { totalIncome: 0, totalExpenses: 0, netProfit: 0, grossMargin: 0, productPurchases: 0, miscellaneous: 0 };
  const healthScore = data?.healthScore || 0;

  return (
    <DashboardLayout title="Financial Dashboard">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 right-8 z-50 flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 text-white p-4 shadow-xl border border-slate-800"
          >
            <Sparkles className="h-5 w-5 text-blue-400 shrink-0" />
            <span className="text-sm font-medium">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Banner */}
      <div className="mb-8 rounded-2xl bg-white dark:bg-[#151C2C] border border-slate-200/60 dark:border-slate-850 p-6 lg:p-8 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-[circle_at_right] from-blue-50/50 dark:from-blue-950/20 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hi, {user?.name || 'Business Owner'} 👋
          </h2>
          <p className="mt-2 text-sm lg:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            {data?.summary || 'Upload your statement to view automated cash flow margins and category breakdowns.'}
          </p>
        </div>
        
        {/* Dynamic score summary */}
        <div className="flex items-center gap-4 shrink-0 bg-slate-50 dark:bg-[#0E1322] border border-slate-100 dark:border-slate-800 p-4 rounded-xl relative z-10">
          <div className="relative flex h-14 w-14 items-center justify-center font-display font-bold text-lg">
            <svg className="absolute h-full w-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className={`${getHealthColor(healthScore)}`} strokeDasharray={`${healthScore}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="text-slate-850 dark:text-white">{healthScore}%</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Financial Health</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Fair / Stable' : 'Action Required'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        
        {/* Total Inflow */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#0E1322] p-5 shadow-premium hover:shadow-premium-hover transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sales Inflow</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              {formatAmount(kpis.totalIncome)}
            </span>
            <span className="block mt-1 text-[11px] font-semibold text-slate-450 dark:text-slate-550">
              Total sales revenue alert
            </span>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#0E1322] p-5 shadow-premium hover:shadow-premium-hover transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Expenses Outflow</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              {formatAmount(kpis.totalExpenses)}
            </span>
            <span className="block mt-1 text-[11px] font-semibold text-slate-450 dark:text-slate-550">
              Inventory & operational bills
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#0E1322] p-5 shadow-premium hover:shadow-premium-hover transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Net profit</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              kpis.netProfit >= 0 
                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
            }`}>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`font-display font-extrabold text-2xl tracking-tight ${
              kpis.netProfit >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatAmount(kpis.netProfit)}
            </span>
            <span className="block mt-1 text-[11px] font-semibold text-slate-455 dark:text-slate-555">
              Net balance variance
            </span>
          </div>
        </div>

        {/* Gross Margin */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#0E1322] p-5 shadow-premium hover:shadow-premium-hover transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Margin ratio</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              {kpis.grossMargin}%
            </span>
            <span className="block mt-1 text-[11px] font-semibold text-slate-450 dark:text-slate-550">
              Inflow to outflow efficiency
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Cash Flow Trends Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Cash Flow Trends</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Inflow revenue vs expense outflow</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.monthlyTrends || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    border: 'none',
                    fontSize: '12px'
                  }} 
                />
                <Legend iconType="circle" fontSize={12} iconSize={8} />
                <Bar name="Sales Inflow" dataKey="inflow" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar name="Expenses Outflow" dataKey="outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium flex flex-col">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Spending Portfolios</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Portions of operational expenses</p>

          <div className="mt-6 space-y-5 flex-1 flex flex-col justify-center">
            {/* Product Purchases Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Product Purchases</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatAmount(kpis.productPurchases)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${kpis.totalExpenses > 0 ? (kpis.productPurchases / kpis.totalExpenses) * 100 : 0}%` }}
                />
              </div>
              <span className="block text-[10px] text-slate-400 mt-1 font-medium">
                {kpis.totalExpenses > 0 ? ((kpis.productPurchases / kpis.totalExpenses) * 100).toFixed(0) : 0}% of total outflows.
              </span>
            </div>

            {/* Miscellaneous Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Miscellaneous Expenses</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatAmount(kpis.miscellaneous)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${kpis.totalExpenses > 0 ? (kpis.miscellaneous / kpis.totalExpenses) * 100 : 0}%` }}
                />
              </div>
              <span className="block text-[10px] text-slate-400 mt-1 font-medium">
                {kpis.totalExpenses > 0 ? ((kpis.miscellaneous / kpis.totalExpenses) * 100).toFixed(0) : 0}% of total outflows.
              </span>
            </div>
          </div>
          
          {/* Action indicator */}
          <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-[#0E1322] border border-slate-100 dark:border-slate-800/60 flex items-center gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 text-blue-600 dark:text-blue-500 shrink-0" />
            <span className="text-[10.5px] font-medium leading-normal text-slate-500 dark:text-slate-400">
              AI remembers category edits and dynamically updates historical matches to correct these ratios!
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] shadow-premium">
        <div className="flex h-20 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Recent Statements ledger</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Quick lookup of extracted files</p>
          </div>
          <button 
            onClick={() => router.push('/upload')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#0E1322] px-3.5 py-2 text-xs font-semibold text-slate-650 dark:text-slate-350 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Statement</span>
          </button>
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-[#0B0F19] text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/40">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Inflow/Outflow</th>
                <th className="py-4 px-6">Category Badge</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-slate-450 dark:text-slate-550">
                    No transactions found. Upload your first statement on the statement page!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-6 text-xs font-medium font-sans whitespace-nowrap">{tx.date}</td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold font-sans">{formatAmount(tx.amount)}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold capitalize ${
                        tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tx.type === 'credit' ? 'bg-emerald-500' : 'bg-slate-450 dark:bg-slate-650'}`} />
                        {tx.type === 'credit' ? 'inflow' : 'outflow'}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${getCategoryColor(tx.category)}`}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button 
                        onClick={() => { setSelectedTx(tx); setNewCategory(tx.category); }}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 transition-colors ml-auto"
                      >
                        <Tags className="h-3.5 w-3.5" />
                        <span>AI Correction</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Correction Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151C2C] border border-slate-250 dark:border-slate-800 p-6 shadow-2xl"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">AI Category Override</h3>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Correct the classification of this description pattern.</p>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0E1322] border border-slate-100 dark:border-slate-800/60 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Statement entry</span>
              <p className="text-sm font-semibold text-slate-850 dark:text-white leading-normal">{selectedTx.description}</p>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <span className="text-slate-400">Amount: {formatAmount(selectedTx.amount)}</span>
                <span className="text-slate-400">Date: {selectedTx.date}</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2">Reclassify to category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 text-slate-900 dark:text-white"
              >
                <option value="Product Purchases">Product Purchases (Stock/Inventory/Wholesale)</option>
                <option value="Sales Income">Sales Income (Revenue/Invoice Deposits)</option>
                <option value="Miscellaneous Expenses">Miscellaneous Expenses (Charges/Fees/Transfers)</option>
              </select>
            </div>

            {/* Smart Learning Note */}
            <div className="mt-4 flex gap-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 p-3 text-[11px] text-blue-700 dark:text-blue-400">
              <Sparkles className="h-4.5 w-4.5 shrink-0" />
              <span>
                **AI Auto-Learn**: Saving this correction will automatically train the categorizer and reclassify **all other identical or similar descriptions** in your transaction history!
              </span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTx(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-450"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleCorrectCategory}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                disabled={updating}
              >
                {updating ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Save & Auto-Learn</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </DashboardLayout>
  );
}
