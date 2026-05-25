"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UploadCloud, 
  BarChart3, 
  BrainCircuit, 
  FileText, 
  Settings, 
  Tags, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ShieldAlert, 
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';

export default function DashboardLayout({ children, title }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Sync theme
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Sync Gemini key status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('gemini_api_key');
      setHasApiKey(!!key);
    }
  }, [pathname]);

  const toggleTheme = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Statement', href: '/upload', icon: UploadCloud },
    { name: 'Transaction Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'AI Insights', href: '/insights', icon: BrainCircuit, badge: 'Smart' },
    { name: 'Reports Builder', href: '/reports', icon: FileText },
    { name: 'Category Management', href: '/categories', icon: Tags },
    { name: 'Settings & Profile', href: '/settings', icon: Settings },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50 dark:bg-[#080B11]">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand Logo */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/60">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-blue-glow animate-pulse">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display font-bold text-lg leading-none block text-slate-900 dark:text-white">Mkpong Ai</span>
              <span className="font-sans font-medium text-xs tracking-wider uppercase block text-blue-600 dark:text-blue-500">FinApp</span>
            </div>
          </Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5 text-slate-500 hover:text-slate-900" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-blue-glow' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card / Bottom details */}
        <div className="border-t border-slate-100 dark:border-slate-800/60 p-4 bg-slate-50/50 dark:bg-[#0B0F19]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/30 text-blue-600 dark:text-blue-400 font-display font-semibold text-sm">
                {getInitials(user?.name)}
              </div>
              <div className="overflow-hidden">
                <span className="font-semibold text-sm block truncate text-slate-900 dark:text-white">{user?.name || 'Business Owner'}</span>
                <span className="text-[11px] text-slate-500 block truncate">{user?.email || 'demo@finance.com'}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </button>
            <h1 className="font-display text-lg lg:text-xl font-bold text-slate-900 dark:text-white">{title || 'Financial Portal'}</h1>
          </div>

          {/* Header Indicators / Controls */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* AI Engine Status Badge */}
            <div className={`hidden md:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              hasApiKey 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
            }`}>
              <Zap className={`h-3.5 w-3.5 ${hasApiKey ? 'fill-emerald-500 text-emerald-500' : 'text-amber-500'}`} />
              <span>AI Mode: {hasApiKey ? 'Gemini Pro' : 'Local NLP Engine'}</span>
            </div>

            {/* Bank Security Badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              <span className="hidden sm:inline">Bank-Level Security</span>
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* Dynamic Inner View Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-8 bg-slate-50/50 dark:bg-[#080B11] stripe-glow">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
