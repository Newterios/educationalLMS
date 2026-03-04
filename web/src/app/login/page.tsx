'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getTranslations, localeNames, type Locale } from '@/i18n';
import { authApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale, setUser, setTokens } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res: any = await authApi.login(email, password);
      const userData = { ...res.user, permissions: res.permissions || [] };
      setUser(userData);
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      toast('Login successful', 'success');
      router.push('/dashboard');
    } catch {
      toast('Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4">
            <svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 48 L32 42 L56 48 L56 16 L32 10 L8 16 Z" fill="#e8f5e9" stroke="#2e7d52" strokeWidth="2" strokeLinejoin="round"/>
              <line x1="32" y1="10" x2="32" y2="42" stroke="#2e7d52" strokeWidth="2"/>
              <path d="M10 17 L30 11.5 L30 41 L10 47 Z" fill="#f1f8f2"/>
              <path d="M34 11.5 L54 17 L54 47 L34 41 Z" fill="#f1f8f2"/>
              <circle cx="20" cy="28" r="7" fill="#c8e6c9" stroke="#2e7d52" strokeWidth="1.2"/>
              <path d="M20 28 L20 21 A7 7 0 0 1 26.06 24.5 Z" fill="#2e7d52"/>
              <path d="M20 28 L26.06 24.5 A7 7 0 0 1 24.5 33.5 Z" fill="#66bb6a"/>
              <rect x="38" y="30" width="4" height="8" rx="0.5" fill="#a5d6a7" stroke="#2e7d52" strokeWidth="0.8"/>
              <rect x="43" y="25" width="4" height="13" rx="0.5" fill="#66bb6a" stroke="#2e7d52" strokeWidth="0.8"/>
              <rect x="48" y="20" width="4" height="18" rx="0.5" fill="#2e7d52" strokeWidth="0.8"/>
              <polyline points="38,36 41,32 45,34 49,28 52,30" fill="none" stroke="#1b5e20" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M46 10 Q46 6 50 6 Q54 6 54 10 Q57 10 57 13 Q57 16 54 16 L47 16 Q44 16 44 13 Q44 10 46 10Z" fill="#c8e6c9" stroke="#2e7d52" strokeWidth="1.2"/>
              <path d="M55 8 Q57 6 59 8" fill="none" stroke="#66bb6a" strokeWidth="1" strokeLinecap="round"/>
              <path d="M56 6 Q58.5 3.5 61 6" fill="none" stroke="#66bb6a" strokeWidth="1" strokeLinecap="round"/>
              <ellipse cx="32" cy="54" rx="20" ry="3" fill="#2e7d52" opacity="0.15"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.auth.welcome}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t.auth.login_subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-end mb-6">
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500">
              {Object.entries(localeNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
            </select>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.auth.email}</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                placeholder="name@university.edu" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.auth.password}</label>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                placeholder="Enter your password" required />
            </div>
            <button id="login-submit" type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition disabled:opacity-50">
              {loading ? t.common.loading : t.auth.login}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-slate-500 text-sm">
          {t.auth.no_account}{' '}
          <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">{t.auth.register}</Link>
        </p>
      </div>
    </div>
  );
}
