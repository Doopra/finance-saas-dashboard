"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, 
  User, 
  Coins, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  Key,
  ShieldCheck,
  Building,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [geminiKey, setGeminiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCurrency(user.currency || 'NGN');
    }

    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setGeminiKey(storedKey);
        setHasStoredKey(true);
      }
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateSettings(name, currency);
      
      confetti({
        particleCount: 40,
        spread: 30,
        origin: { y: 0.8 }
      });

      setSuccess('Profile and currency configurations updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (geminiKey.trim()) {
        localStorage.setItem('gemini_api_key', geminiKey.trim());
        setHasStoredKey(true);
        confetti({
          particleCount: 50,
          spread: 40,
          colors: ['#10B981', '#3B82F6'],
          origin: { y: 0.8 }
        });
        setSuccess('Gemini AI API Key connected successfully! Generative statement parsing and context chat unlocked.');
      } else {
        localStorage.removeItem('gemini_api_key');
        setHasStoredKey(false);
        setSuccess('Gemini API Key removed. System reverted to high-fidelity rule-based parsing.');
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Failed to configure API key.');
    }
  };

  return (
    <DashboardLayout title="Settings & Profile">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile & Business Settings */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 lg:p-8 shadow-premium h-fit">
          <div className="flex items-center gap-2.5 mb-6">
            <Building className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Business Settings</h3>
          </div>

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

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 mb-2">Business / Trading Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] py-3 pl-11 pr-4 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 text-slate-900 dark:text-white"
                  placeholder="Trading Name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 mb-2">Display Currency</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Coins className="h-4.5 w-4.5" />
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] py-3 pl-11 pr-4 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                >
                  <option value="NGN">Nigerian Naira (₦ NGN)</option>
                  <option value="USD">United States Dollar ($ USD)</option>
                  <option value="EUR">Euro (€ EUR)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 text-xs transition-colors disabled:opacity-50 shadow-blue-glow"
            >
              {loading ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>Save Profile Settings</span>
              )}
            </button>
          </form>
        </div>

        {/* Gemini API Key Panel */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium flex flex-col justify-between h-fit">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Gemini API Key</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                hasStoredKey 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {hasStoredKey ? 'Connected' : 'Offline'}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-6">
              Paste a Gemini API Key to upgrade your text parses and visual screenshot OCRs to full generative analysis.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                  placeholder="AIzaSy..."
                />
              </div>

              {/* Security note */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-100 dark:border-slate-800/40 flex gap-2.5 text-[10px] text-slate-500 leading-normal">
                <ShieldCheck className="h-4.5 w-4.5 text-blue-600 dark:text-blue-500 shrink-0" />
                <span>
                  **Sandbox Storage**: Keys are stored locally in your browser's private state, never sent to our servers. Calls are routed directly to Gemini API hosts!
                </span>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-xs transition-colors shadow-blue-glow"
                >
                  Save API Key
                </button>
                {hasStoredKey && (
                  <button
                    type="button"
                    onClick={() => { setGeminiKey(''); localStorage.removeItem('gemini_api_key'); setHasStoredKey(false); }}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-650 px-3.5 py-2.5 text-xs font-semibold transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
