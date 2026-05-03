'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOpeningScreen = pathname === '/';

  return (
    <main className="min-h-screen">
      <div className={`mx-auto flex min-h-screen max-w-2xl flex-col px-4 sm:px-6 ${isOpeningScreen ? 'pb-8 pt-8' : 'pb-28 pt-5 sm:pt-8'}`}>
        {!isOpeningScreen && (
          <header className="mb-5 flex justify-center">
            <Image
              src="/logos/Landscape%20logo.png"
              alt="Reset Loop"
              width={290}
              height={74}
              priority
              className="h-auto w-56 sm:w-72"
            />
          </header>
        )}
        {children}
      </div>
      {!isOpeningScreen && <BottomNav />}
    </main>
  );
}
