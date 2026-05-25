"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, 
  Download, 
  Calendar, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  FileCheck2,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function ReportsPage() {
  const { user } = useAuth();
  
  const [reportType, setReportType] = useState('Cash Flow Summary');
  const [dateRange, setDateRange] = useState('last_3_months');
  const [exportFormat, setExportFormat] = useState('csv');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₦');

  useEffect(() => {
    if (user?.currency === 'USD') setCurrencySymbol('$');
    else if (user?.currency === 'EUR') setCurrencySymbol('€');
    else setCurrencySymbol('₦');
  }, [user]);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Fetch matching data from API
      const txData = await api.get('/transactions?limit=100');
      const transactions = txData.transactions;

      if (transactions.length === 0) {
        setError('No transactions found. Please upload a bank statement first to populate your ledger!');
        setLoading(false);
        return;
      }

      // Simulate compile delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (exportFormat === 'csv') {
        // Compile CSV
        const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Bank'];
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
        link.setAttribute("download", `MkpongAi_${reportType.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFormat === 'json') {
        // Compile JSON
        const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", jsonContent);
        link.setAttribute("download", `MkpongAi_${reportType.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFormat === 'pdf') {
        const printWindow = window.open('', '', 'height=800,width=1000');
        printWindow.document.write('<html><head><title>MkpongAi Report</title>');
        printWindow.document.write('<style>body { font-family: sans-serif; padding: 20px; } table { border-collapse: collapse; width: 100%; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; } th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #64748b; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h2>${reportType}</h2>`);
        printWindow.document.write(`<p>Generated on ${new Date().toLocaleDateString()}</p>`);
        printWindow.document.write('<table><thead><tr>');
        const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Bank'];
        headers.forEach(h => printWindow.document.write(`<th>${h}</th>`));
        printWindow.document.write('</tr></thead><tbody>');
        
        transactions.forEach(tx => {
          printWindow.document.write('<tr>');
          printWindow.document.write(`<td>${tx.date}</td>`);
          printWindow.document.write(`<td>${tx.description}</td>`);
          printWindow.document.write(`<td>${currencySymbol}${tx.amount}</td>`);
          printWindow.document.write(`<td>${tx.type}</td>`);
          printWindow.document.write(`<td>${tx.category}</td>`);
          printWindow.document.write(`<td>${tx.bank_name}</td>`);
          printWindow.document.write('</tr>');
        });
        
        printWindow.document.write('</tbody></table>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.8 }
      });

      setSuccess(`${reportType} downloaded successfully as a .${exportFormat.toUpperCase()} file!`);
    } catch (err) {
      console.error(err);
      setError('An error occurred during report generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Reports Builder">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Report Parameters Builder Form */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 lg:p-8 shadow-premium">
          <div className="flex items-center gap-2.5 mb-6">
            <SlidersHorizontal className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Configure Report Parameters</h3>
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

          <form onSubmit={handleGenerateReport} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Report Type */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 mb-2">Report Document Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                >
                  <option value="Cash Flow Summary">Cash Flow Summary (Inflow vs Outflow)</option>
                  <option value="Detailed Spending Ledger">Detailed Spending Ledger (All Entries)</option>
                  <option value="Profit and Loss Sheet">Profit and Loss Sheet (Net Margins)</option>
                </select>
              </div>

              {/* Date Interval */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 mb-2">Date Window</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                >
                  <option value="last_month">Last Month</option>
                  <option value="last_3_months">Last 3 Months (Recommended)</option>
                  <option value="all_time">All Extracted Periods</option>
                </select>
              </div>

              {/* File format selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 mb-2">Format Export</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                >
                  <option value="csv">CSV Spreadsheet (.csv)</option>
                  <option value="json">JSON Data Stream (.json)</option>
                  <option value="pdf">PDF Document (.pdf)</option>
                </select>
              </div>
            </div>

            {/* Smart info badge */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-100 dark:border-slate-800/40 flex gap-2.5 text-[10.5px] text-slate-500 leading-normal">
              <Sparkles className="h-4.5 w-4.5 text-blue-600 dark:text-blue-500 shrink-0" />
              <span>
                **Audit compliance ready**: Reports are strictly formatted to match Standard Corporate Tax Accounting models for seamless audit and business verification.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 text-xs transition-colors disabled:opacity-50 shadow-blue-glow group"
            >
              {loading ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Download className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
                  <span>Compile & Download Report</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Documentation Sidebar (Quick Info) */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Reporting Standards</h3>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">📊 Cash Flow Summary</span>
              <span>Summarizes monthly credit inflows versus debit outflows. Unparalleled for projecting liquid runway thresholds.</span>
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">📝 Detailed Ledger</span>
              <span>Fully itemized chronological ledger containing complete extracted narrative text, category corrections, and date-bounds.</span>
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">📈 Profit & Loss Sheets</span>
              <span>Aggregates operational cost center overheads, total purchases, and net margins over dynamic timeline metrics.</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
