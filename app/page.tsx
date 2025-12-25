"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          // User is authenticated, go to dashboard
          router.push('/dashboard/workflows');
        } else {
          // Not authenticated, go to login
          router.push('/login');
        }
      })
      .catch(() => {
        // Error, go to login
        router.push('/login');
      });
  }, [router]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg animate-pulse">
          C
        </div>
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}
