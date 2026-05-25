"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B0F19]">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="relative flex h-14 w-14 mx-auto items-center justify-center">
          <div className="absolute h-full w-full rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
          <div className="absolute h-full w-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="mt-6 font-display font-bold text-lg text-slate-800 dark:text-slate-200">
          Launching Mkpong Ai FinApp
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">Securing environment & loading profiles...</p>
      </div>
    </div>
  );
}
