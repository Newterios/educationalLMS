import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/lib/toast';

export const metadata: Metadata = {
  title: 'EDULMS',
  description: 'Education Management System',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
