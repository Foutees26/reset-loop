import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  title: 'Reset Loop',
  description: 'A low-energy daily reset app for daily momentum.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
