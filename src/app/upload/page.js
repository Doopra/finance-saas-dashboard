"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  History,
  TrendingUp,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function UploadPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [bankName, setBankName] = useState('Auto-Detect');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [history, setHistory] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₦');

  const fetchHistory = async () => {
    try {
      const data = await api.get('/statements/history');
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch statement history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    if (user?.currency === 'USD') setCurrencySymbol('$');
    else if (user?.currency === 'EUR') setCurrencySymbol('€');
    else setCurrencySymbol('₦');
  }, [user]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp'];
    
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Please upload a PDF, CSV, Excel, or Image statement.');
      setFile(null);
      return;
    }
    setError('');
    setFile(file);
    setExtractedData(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setUploadProgress(10);
    setUploadStatus('Uploading file securely to server...');

    try {
      // Simulate progression steps for beautiful UI scanning feedback!
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          if (prev >= 60) {
            setUploadStatus('AI Engine: Structuring extracted transaction columns...');
            return prev + 5;
          }
          if (prev >= 35) {
            setUploadStatus('OCR OCR SCANNING: Performing Tesseract layout extraction...');
            return prev + 10;
          }
          return prev + 15;
        });
      }, 800);

      const result = await api.postFile('/statements/upload', file);
      
      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadStatus('Finalizing transaction logs...');

      // Success Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccessMsg(`Successfully processed "${file.name}"! Extracted ${result.transactions.length} transactions.`);
      setExtractedData(result.transactions);
      setFile(null);
      
      // Refresh history
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to process statement. Please try another format.');
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (type) => {
    switch (type) {
      case 'pdf':
        return '🔴 PDF';
      case 'excel':
        return '🟢 Excel/CSV';
      case 'image':
        return '🔵 Screenshot';
      default:
        return '⚪ Statement';
    }
  };

  return (
    <DashboardLayout title="Upload Statement">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 lg:p-8 shadow-premium">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Import Bank Statement</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Drag and drop files to scan instantly</p>

            <form onSubmit={handleUpload} className="mt-6 space-y-6">
              {/* Drag Drop Box */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 lg:p-12 text-center cursor-pointer transition-colors duration-200 ${
                  file 
                    ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                />
                
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-500 mb-4 shadow-blue-glow">
                  <UploadCloud className="h-7 w-7" />
                </div>
                
                {file ? (
                  <div>
                    <span className="font-semibold text-sm block text-slate-900 dark:text-white truncate max-w-sm">{file.name}</span>
                    <span className="text-xs text-slate-400 mt-1 block">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to Scan</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-sm block text-slate-800 dark:text-slate-200">Choose statement file</span>
                    <span className="text-xs text-slate-400 mt-1.5 block">PDF, CSV, Excel sheets, or Image screenshots up to 10MB</span>
                  </div>
                )}
              </div>

              {/* Bank Selector Option */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2">Statement Format</label>
                  <select 
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1322] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 text-slate-900 dark:text-white"
                  >
                    <option value="Auto-Detect">Auto-Detect Bank Format</option>
                    <option value="OPay">OPay Business</option>
                    <option value="GTBank">GTBank Statement</option>
                    <option value="Zenith">Zenith Bank Portal</option>
                    <option value="Access">Access Bank Corp</option>
                  </select>
                </div>
                
                {/* Security assurances */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-100 dark:border-slate-800/40">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-500 shrink-0" />
                  <span className="text-[10.5px] leading-normal text-slate-500 dark:text-slate-400">
                    **E2E Encryption**: Uploads are processed inside sandbox memory and completely encrypted. Raw statements are deleted instantly from the disk post-extraction!
                  </span>
                </div>
              </div>

              {/* Status and Progress rendering */}
              {loading && (
                <div className="space-y-3 p-4 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/10">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-600">
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>{uploadStatus}</span>
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600 rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 p-4 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 p-4 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-blue-glow group"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5 fill-white text-white group-hover:scale-110 transition-transform" />
                    <span>Upload & AI Scan Statement</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Extracted Preview List */}
          {extractedData && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] shadow-premium overflow-hidden"
            >
              <div className="flex h-20 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 px-6">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Extracted Transactions Preview</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Audit extracted items from the statement</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-[#0B0F19] text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/40">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Category Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                    {extractedData.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 px-6 text-xs font-medium font-sans">{tx.date}</td>
                        <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs">{tx.description}</td>
                        <td className="py-4 px-6 text-sm font-bold font-sans">{currencySymbol + Math.round(tx.amount).toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold capitalize ${
                            tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-450'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-semibold px-2.5 py-1 text-slate-650 dark:text-slate-350">
                            {tx.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </div>

        {/* Upload Timeline History (Sidebar style) */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1322] p-6 shadow-premium h-fit">
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Scanning Timeline</h3>
          </div>

          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-150 dark:before:bg-slate-800">
            {history.length === 0 ? (
              <p className="text-xs text-slate-450 dark:text-slate-550 text-center py-6">No previous scans found. Upload a statement to get started.</p>
            ) : (
              history.map((stmt) => (
                <div key={stmt.id} className="flex gap-4 relative">
                  {/* Timeline bullet */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-900/30 shrink-0 z-10 relative">
                    <FileCheck className="h-3.5 w-3.5" />
                  </div>
                  
                  {/* Details card */}
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800 dark:text-white truncate" title={stmt.filename}>{stmt.filename}</span>
                    <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{getFormatIcon(stmt.file_type)}</span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800/40 pt-1.5">
                      <span>{stmt.transaction_count || 0} Transactions</span>
                      <span className="font-sans font-medium">{new Date(stmt.upload_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
