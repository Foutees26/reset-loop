'use client';

import Link from 'next/link';
import { Home, Activity, Settings } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-40 mx-auto w-full max-w-xl border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <Link href="/dashboard/home" className="flex flex-col items-center gap-1 text-slate-700 hover:text-primary">
          <Home className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Home</span>
        </Link>
        <Link href="/progress" className="flex flex-col items-center gap-1 text-slate-700 hover:text-primary">
          <Activity className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Progress</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-slate-700 hover:text-primary">
          <Settings className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
