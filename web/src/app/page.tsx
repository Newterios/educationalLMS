'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, mounted, hydrate } = useStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!mounted) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [mounted, isAuthenticated, router]);

  return <div className="min-h-screen bg-slate-50" />;
}
