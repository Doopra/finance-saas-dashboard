"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Tags,
  RefreshCw
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  Legend, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { motion } from 'framer-motion';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currencySymbol, setCurrencySymbol] = useState('₦');

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Build filter query string
      let endpoint = `/transactions?limit=${limit}&offset=${offset}`;
      if (search) endpoint += `&search=${search}`;
      if (category) endpoint += `&category=${category}`;
      if (type) endpoint += `&type=${type}`;
      if (startDate) endpoint += `&startDate=${startDate}`;
      if (endDate) endpoint += `&endDate=${endDate}`;

      const txData = await api.get(endpoint);
      setTransactions(txData.transactions);
      setTotalCount(txData.pagination.total);

      // Fetch general insights for portfolios
      const insightsData = await api.get('/insights');
      setInsights(insightsData);

      if (user?.currency === 'USD') setCurrencySymbol('$');
      else if (user?.currency === 'EUR') setCurrencySymbol('€');
      else setCurrencySymbol('₦');
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [category, type, startDate, endDate, offset, limit, user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchAnalyticsData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setType('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const formatAmount = (amt) => {
    return currencySymbol + Math.round(amt).toLocaleString();
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    // Construct CSV Headers
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Bank Name'];
    const rows = transactions.map(tx => [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount,
      tx.type,
      tx.category,
      tx.bank_name
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MkpongAi_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Portfolio charts structure
  const pieData = insights ? [
    { name: 'Product Purchases', value: insights.kpis.productPurchases, color: '#2563EB' },
    { name: 'Miscellaneous Expenses', value: insights.kpis.miscellaneous, color: '#F59E0B' },
    { name: 'Sales Income (Inflow)', value: insights.kpis.totalIncome, color: '#10B981' }
  ].filter(item => item.value > 0) : [];

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

  return (
    <DashboardLayout title="Transactions & Analytics">
      
      {/* Dynamic Filter Drawer Header */}
      <div className="mb-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-5 shadow-premium">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          {/* Search bar */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Search narratives</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-405">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0E1322] py-2.5 pl-10 pr-4 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                placeholder="Search vendor, POS, transfer name..."
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
            >
              <option value="">All Categories</option>
              <option value="Product Purchases">Product Purchases</option>
              <option value="Sales Income">Sales Income</option>
              <option value="Miscellaneous Expenses">Miscellaneous Expenses</option>
            </select>
          </div>

          {/* Inflow Outflow Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Cash Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
            >
              <option value="">Inflow & Outflow</option>
              <option value="credit">Inflow (Credit)</option>
              <option value="debit">Outflow (Debit)</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-3 py-2 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white font-sans"
            />
          </div>

          {/* Submit and reset */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-xs transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#0E1322] text-slate-500 transition-colors"
              title="Reset Filters"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Product Stocking Cycle Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Product Purchasing Trends</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Wholesale and stock expenses over time</p>
          </div>

          <div className="h-72 w-full mt-6">
            {insights?.monthlyTrends && insights.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={insights.monthlyTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <ChartTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      border: 'none',
                      fontSize: '12px'
                    }} 
                  />
                  <Area type="monotone" name="Outflow Expenses" dataKey="outflow" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorStock)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No trend history available.</div>
            )}
          </div>
        </div>

        {/* Portfolio Pie Chart */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium flex flex-col">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Portfolio Breakdown</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Asset & spending allocations</p>

          <div className="h-48 w-full mt-6 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      border: 'none',
                      fontSize: '11px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-450 dark:text-slate-550">No allocation data to display.</div>
            )}
          </div>

          <div className="mt-4 space-y-2 flex-1 justify-center flex flex-col">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatAmount(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Structured Ledger Table */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] shadow-premium">
        <div className="flex h-20 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Structured Statement Ledger</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Found {totalCount} matching transactions</p>
          </div>
          {transactions.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#0E1322] px-3.5 py-2 text-xs font-semibold text-slate-650 dark:text-slate-350 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-[#0B0F19] text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/40">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Narrative Description</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Direction</th>
                <th className="py-4 px-6">AI Category</th>
                <th className="py-4 px-6">Bank Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-slate-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-slate-450 dark:text-slate-550">
                    No matching records found. Try modifying your search or filter tags!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-6 text-xs font-medium font-sans whitespace-nowrap">{tx.date}</td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white max-w-sm truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold font-sans">{formatAmount(tx.amount)}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold capitalize ${
                        tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-450'
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
                    <td className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-450 whitespace-nowrap">{tx.bank_name || 'Generic Bank'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer */}
        {totalCount > limit && (
          <div className="flex h-16 items-center justify-between border-t border-slate-100 dark:border-slate-800/60 px-6 text-xs font-semibold text-slate-500">
            <span>Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} transactions</span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(prev => Math.max(0, prev - limit))}
                className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#0E1322] px-4 py-2 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={offset + limit >= totalCount}
                onClick={() => setOffset(prev => prev + limit)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#0E1322] px-4 py-2 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}
