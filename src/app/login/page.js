"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0B0F19]">
      {/* Decorative Left Column - Stripe Style */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 dark:bg-blue-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#3b82f6,transparent_60%)] animate-pulse" />
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-black/10 to-transparent" />
        
        <div className="relative z-10 max-w-lg text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-8">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl leading-tight mb-4">
            AI-Powered Wealth & Financial Intelligence
          </h1>
          <p className="text-blue-100 font-sans leading-relaxed text-base">
            Upload your monthly statements and let our intelligent engine structure operations, auto-learn expenses, and compile rich business analytics instantly.
          </p>
          
          <div className="mt-12 flex gap-8">
            <div>
              <span className="block font-display font-bold text-2xl">98%</span>
              <span className="text-blue-200 text-xs uppercase tracking-wider font-semibold">OCR Accuracy</span>
            </div>
            <div className="border-l border-white/20 pl-8">
              <span className="block font-display font-bold text-2xl">₦2.4B+</span>
              <span className="text-blue-200 text-xs uppercase tracking-wider font-semibold">Processed</span>
            </div>
            <div className="border-l border-white/20 pl-8">
              <span className="block font-display font-bold text-2xl">&lt; 3s</span>
              <span className="text-blue-200 text-xs uppercase tracking-wider font-semibold">AI Insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Logo Mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white">Mkpong Ai FinApp</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your business portfolio
          </p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 p-4 text-sm text-red-700 dark:text-red-400"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151C2C] py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-slate-900 dark:text-white"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
                <Link href="/login" className="text-xs font-medium text-blue-600 dark:text-blue-500 hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151C2C] py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-slate-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 transition-colors disabled:opacity-50 shadow-blue-glow group"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            New to Mkpong Ai?{' '}
            <Link href="/register" className="font-semibold text-blue-600 dark:text-blue-500 hover:underline">
              Create free account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
