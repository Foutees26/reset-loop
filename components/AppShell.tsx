'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import BottomNav from './BottomNav';
import { logoutBrowserUser } from '../lib/browserUser';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isOpeningScreen = pathname === '/';

  function logout() {
    logoutBrowserUser();
    router.push('/');
  }

  return (
    <main className="min-h-screen">
      <div className={`mx-auto flex min-h-screen max-w-2xl flex-col px-4 sm:px-6 ${isOpeningScreen ? 'pb-8 pt-8' : 'pb-28 pt-5 sm:pt-8'}`}>
        {!isOpeningScreen && (
          <header className="mb-5 grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
            <span aria-hidden="true" />
            <div className="flex justify-center">
              <Image
                src="/logos/Landscape%20logo.png"
                alt="Reset Loop"
                width={290}
                height={74}
                priority
                className="h-auto w-56 sm:w-72"
              />
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 w-11 items-center justify-center rounded-3xl border border-white/75 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition hover:text-slate-950"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </header>
        )}
        {children}
      </div>
      {!isOpeningScreen && <BottomNav />}
    </main>
  );
}
