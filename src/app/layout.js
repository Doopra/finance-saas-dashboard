import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: "Mkpong Ai FinApp | AI Business Financial Management",
  description: "Bank statement OCR parsing, automated transaction categorization, cash flow forecast, and AI financial assistant built for product traders and SMEs.",
  keywords: "finance, fintech, business, SME, Nigeria, bank statement, OCR, tesseract, gemini AI, cash flow forecasting",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="h-full bg-slate-50/50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 antialiased transition-colors duration-300">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
