import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import BottomNav from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'Reset Loop',
  description: 'A low-energy daily reset app for daily momentum.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
            {children}
          </div>
          <BottomNav />
        </main>
      </body>
    </html>
  );
}
