"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Tags, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  Bookmark,
  Shuffle
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function CategoriesPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState('Product Purchases');
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    try {
      const data = await api.get('/transactions/rules');
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!pattern.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await api.post('/transactions/rules', { pattern, category });
      
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 }
      });

      setSuccess(`Rule registered! Automatically categorized and updated ${result.appliedCount} existing transactions matching "${pattern}".`);
      setPattern('');
      fetchRules();
      
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message || 'Failed to register category rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await api.delete(`/transactions/rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
      setSuccess('Categorization rule deleted successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to delete rule.');
    }
  };

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
    <DashboardLayout title="Category Rules Manager">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Rule Editor (Sidebar style) */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Shuffle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Register Category Trigger</h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-6">
            Force certain keyword descriptions inside statement uploads to map to a specific category.
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 p-4 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 p-4 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2">Description Keyword</label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 text-slate-900 dark:text-white"
                placeholder="e.g. AMINA WHOLESALE"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2">Map to Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
              >
                <option value="Product Purchases">Product Purchases</option>
                <option value="Sales Income">Sales Income</option>
                <option value="Miscellaneous Expenses">Miscellaneous Expenses</option>
              </select>
            </div>

            {/* AI Notice */}
            <div className="p-3 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/10 flex gap-2 text-[10.5px] text-blue-600 leading-normal">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                **Retroactive Trigger**: Applying a new rule will search your entire transaction archive and automatically re-categorize similar items instantly!
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || !pattern.trim()}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-colors disabled:opacity-40 shadow-blue-glow"
            >
              {submitting ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Plus className="h-4.5 w-4.5" />
                  <span>Register Rule</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Dynamic Rules Timeline Registry */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] shadow-premium">
          <div className="flex h-20 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Triggers Rule Registry</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Found {rules.length} custom AI preference rules</p>
            </div>
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-[#0B0F19] text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/40">
                  <th className="py-4 px-6">Description pattern match</th>
                  <th className="py-4 px-6">AI Target Category</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-4 px-6 text-right">Delete Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-sm">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-sm text-slate-450 dark:text-slate-550">
                      No custom rules registered yet. Add a rule or correct a transaction in the feed to seed triggers!
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white">
                        {rule.pattern}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${getCategoryColor(rule.category)}`}>
                          {rule.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {/* Users can't delete seeded rules for user ID 1 (demo user rules) to keep demo stable, but can delete others! */}
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-650 dark:hover:text-red-500 rounded-lg transition-colors ml-auto flex"
                          title="Delete Trigger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
