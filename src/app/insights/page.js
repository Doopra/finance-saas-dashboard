"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  BrainCircuit, 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  AlertTriangle, 
  FileWarning, 
  CheckCircle2, 
  Lightbulb, 
  ArrowUpRight, 
  CalendarDays,
  Coins
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function InsightsPage() {
  const { user } = useAuth();
  const chatBottomRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  
  // Chat states
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hello! I am your AI Financial Assistant. I can help analyze your statement data. Try asking me for a 'business summary' or 'how much did I spend on stock last month?'" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const fetchInsights = async () => {
    try {
      const insights = await api.get('/insights');
      setData(insights);
      
      if (user?.currency === 'USD') setCurrencySymbol('$');
      else if (user?.currency === 'EUR') setCurrencySymbol('€');
      else setCurrencySymbol('₦');
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [user]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const handleSendChat = async (e, customPrompt = '') => {
    if (e) e.preventDefault();
    const prompt = customPrompt || chatInput;
    if (!prompt.trim() || chatLoading) return;

    // Append user message
    setChatHistory(prev => [...prev, { role: 'user', content: prompt }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const result = await api.post('/insights/chat', { 
        message: prompt,
        history: chatHistory.slice(-6) // send last 6 messages for basic history tracking
      });

      // Append assistant message
      setChatHistory(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      console.error('Chat failed:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Apologies, I encountered an issue querying the database. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatAmount = (amt) => {
    return currencySymbol + Math.round(amt).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500 font-medium">Consulting AI business insights...</p>
        </div>
      </div>
    );
  }

  // Combine monthly trends and forecasts for beautiful prediction charting!
  const monthlyTrends = data?.monthlyTrends || [];
  const forecast = data?.forecast || [];
  const fullChartData = [...monthlyTrends, ...forecast];

  const anomalies = data?.anomalies || [];
  const duplicates = data?.duplicates || [];

  const suggestedQuestions = [
    "Give me a business summary",
    "How much did I spend on stock?",
    "What is my estimated profit margin?",
    "Show me miscellaneous spending recommendations"
  ];

  return (
    <DashboardLayout title="AI Financial Insights">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Analysis & Forecasts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Predictive Forecasting Chart */}
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Predictive Cash Flow Forecast</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">3-Month linear regression projections based on historical statement timelines</p>
            </div>

            <div className="h-72 w-full mt-6">
              {fullChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fullChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <ChartTooltip 
                      contentStyle={{ 
                        backgroundColor: '#1E293B', 
                        borderRadius: '12px', 
                        color: '#fff', 
                        border: 'none',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend fontSize={11} iconType="circle" iconSize={8} />
                    <Line name="Sales Inflows" type="monotone" dataKey="inflow" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line name="Expense Outflows" type="monotone" dataKey="outflow" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No cash flow projections available yet.</div>
              )}
            </div>
          </div>

          {/* AI Trigger Notifications & Risk Monitors */}
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-5">Intelligence Anomaly Trigger Alerts</h3>

            <div className="space-y-4">
              
              {/* Cash Flow Health Alert */}
              {data?.kpis.netProfit < 0 ? (
                <div className="flex gap-4 p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Overspending Net Loss Warning</h4>
                    <p className="text-xs text-red-650 dark:text-red-300 leading-relaxed mt-1">
                      Your business expenses outpaced sales income this month by **{formatAmount(Math.abs(data.kpis.netProfit))}**. Moving forward, bulk purchases of stock should be aligned strictly with sales inflows.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Positive Net Cash Flow Margin</h4>
                    <p className="text-xs text-emerald-650 dark:text-emerald-300 leading-relaxed mt-1">
                      Outstanding performance! Your business cash reserves grew by **{formatAmount(data?.kpis.netProfit)}** over this statement interval. Keep maintaining inventory bulk purchases to safeguard this margin.
                    </p>
                  </div>
                </div>
              )}

              {/* Unusual Transaction Outliers (Z-score) */}
              {anomalies.length > 0 && (
                <div className="flex gap-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
                  <FileWarning className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Unusual High-Value Debit Anomaly</h4>
                    <p className="text-xs text-amber-650 dark:text-amber-300 leading-normal mt-1">
                      AI identified {anomalies.length} transaction outlier(s) that are statistically higher than your average spending spikes:
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {anomalies.map((anom, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-white/40 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/30 dark:border-amber-900/20">
                          <span className="truncate max-w-[200px]">{anom.description}</span>
                          <span className="font-bold shrink-0">{formatAmount(anom.amount)} ({anom.deviation}x std dev)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Duplicate Transaction Warnings */}
              {duplicates.length > 0 && (
                <div className="flex gap-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Duplicate Transaction Warning</h4>
                    <p className="text-xs text-blue-650 dark:text-blue-300 leading-normal mt-1">
                      AI flagged similar transaction figures logged on identical dates. Check for double billing:
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-blue-700 dark:text-blue-450 font-medium">
                      {duplicates.map((dup, idx) => (
                        <li key={idx} className="bg-white/40 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200/30 dark:border-blue-900/20">
                          <div className="flex justify-between font-bold">
                            <span className="truncate max-w-[200px]">{dup.base.description}</span>
                            <span>{formatAmount(dup.base.amount)}</span>
                          </div>
                          <span className="block text-[10px] text-blue-550 dark:text-blue-400 mt-1">
                            Matches {dup.matches.length} other entry on {dup.base.date}.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Cost Saving Opportunity */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0E1322] border border-slate-200/60 dark:border-slate-800">
                <Lightbulb className="h-5 w-5 text-slate-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Cost-Saving Suggestions</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Reducing miscellaneous spending (POS terminal charges, bank commission charges, airtime fees) by using dedicated corporate banking lines can save your trading portfolio up to **18%** in transaction fee overheads monthly.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right 1 Column: Interactive AI Financial Assistant Chatbot */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] shadow-premium flex flex-col h-[75vh]">
          {/* Chat Header */}
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 dark:border-slate-800/60 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-500 border border-blue-200/30 dark:border-blue-900/20 animate-pulse">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">AI Financial Assistant</h3>
              <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-0.5">• active contextual engine</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-900/20 shrink-0">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}
                
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-blue-glow'
                    : 'bg-slate-50 dark:bg-[#0E1322] border border-slate-150 dark:border-slate-800/50 text-slate-800 dark:text-slate-200 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {chatLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-900/20 shrink-0">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="bg-slate-50 dark:bg-[#0E1322] border border-slate-150 dark:border-slate-800/50 rounded-2xl rounded-bl-none px-4 py-3 shrink-0 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-[#0E1322]/20 border-t border-slate-100 dark:border-slate-800/40 space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Suggested Questions</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(null, q)}
                  className="rounded-lg border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 bg-white dark:bg-[#0E1322] px-2.5 py-1.5 text-[10px] font-medium text-slate-650 dark:text-slate-400 transition-colors text-left truncate max-w-[280px]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Form Input */}
          <form onSubmit={handleSendChat} className="p-4 border-t border-slate-100 dark:border-slate-800/60 flex gap-2 bg-slate-50/50 dark:bg-[#0B0F19]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
              placeholder="Ask anything about your statement stats..."
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-blue-glow transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}
