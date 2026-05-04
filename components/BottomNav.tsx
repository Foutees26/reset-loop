'use client';

import Link from 'next/link';
import { Activity, Flower2, Home, Settings } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-40 mx-auto w-full max-w-2xl px-3 pb-3 sm:px-6">
      <div className="mx-auto flex items-center justify-between rounded-[28px] border border-white/75 bg-white/90 px-5 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <Link href="/dashboard/home" className="flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-slate-700 transition hover:bg-primarySoft hover:text-primary">
          <Home className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Home</span>
        </Link>
        <Link href="/progress" className="flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-slate-700 transition hover:bg-primarySoft hover:text-primary">
          <Activity className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Progress</span>
        </Link>
        <Link href="/calm-space" className="flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-slate-700 transition hover:bg-primarySoft hover:text-primary">
          <Flower2 className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Space</span>
        </Link>
        <Link href="/settings" className="flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-slate-700 transition hover:bg-primarySoft hover:text-primary">
          <Settings className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
