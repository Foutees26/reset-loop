import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  applicationName: 'Reset Loop',
  title: 'Reset Loop',
  description: 'A low-energy daily reset app for daily momentum.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Reset Loop',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
