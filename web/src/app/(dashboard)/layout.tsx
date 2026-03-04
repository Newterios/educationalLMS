'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getTranslations, localeNames, type Locale } from '@/i18n';
import { notificationApi } from '@/lib/api';

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', roles: [] as string[] },
  { key: 'courses', href: '/courses', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', roles: [] as string[] },
  { key: 'schedule', href: '/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['superadmin','rector','admin','dean','head_of_department','professor','teacher','practice_teacher','teaching_assistant','student','curator'] },
  { key: 'grades', href: '/grades', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', roles: ['superadmin','rector','admin','dean','head_of_department','professor','teacher','practice_teacher','teaching_assistant','student','curator','parent','external_reviewer'] },
  { key: 'attendance', href: '/attendance', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['superadmin','rector','admin','dean','head_of_department','professor','teacher','practice_teacher','teaching_assistant','student','curator','parent'] },
  { key: 'news', href: '/news', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z', roles: [] as string[] },
  { key: 'notifications', href: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', roles: [] as string[] },
  { key: 'analytics', href: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: ['superadmin','rector','admin','dean','head_of_department','curator','accountant','hr'] },
  { key: 'admin', href: '/admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', roles: ['superadmin','rector','admin'] },
];

function NavIcon({ d }: { d: string }) {
  return (<svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);
}

function AvatarBubble({ user, size = 'sm' }: { user: any; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  const [imgError, setImgError] = useState(false);
  if (user?.avatar_url && !imgError) {
    return <img src={user.avatar_url} alt="" className={`${s} rounded-full object-cover border border-slate-200`} onError={() => setImgError(true)} />;
  }
  return (
    <div className={`${s} bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-full flex items-center justify-center font-semibold`}>
      {user?.first_name?.[0] || 'U'}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, locale, setLocale, sidebarOpen, toggleSidebar, logout, mounted, hydrate, isAdmin } = useStore();
  const t = getTranslations(locale);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/login');
  }, [mounted, isAuthenticated, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = () => {
      notificationApi.list(user.id).then((res) => {
        setUnreadCount((res as any)?.unread_count || 0);
      }).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = () => { logout(); router.push('/login'); };

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  const role = (user?.role_name || '').toLowerCase();
  const visibleNav = navItems.filter((item) => {
    if (item.roles.length === 0) return true;
    return item.roles.includes(role);
  });

  const renderNavLinks = (showLabels: boolean, closeFn?: () => void) => (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {visibleNav.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const label = (t.nav as any)[item.key] || item.key;
        const isNotif = item.key === 'notifications';
        return (
          <Link key={item.key} href={item.href}
            onClick={closeFn}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition relative ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <NavIcon d={item.icon} />
            {showLabels && <span>{label}</span>}
            {isNotif && unreadCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (showLabels: boolean, closeFn?: () => void) => (
    <div className="p-3 border-t border-slate-200 space-y-2">
      {showLabels && (
        <>
          <Link href="/profile" onClick={closeFn}
            className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition">
            <AvatarBubble user={user} size="sm" />
            <div className="min-w-0">
              <p className="text-xs text-slate-600 truncate font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-brand-600">{user?.role_name || 'User'}</p>
            </div>
          </Link>
          <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600">
            {Object.entries(localeNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
          </select>
        </>
      )}
      <button onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition w-full">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {showLabels && <span>{t.nav.logout}</span>}
      </button>
    </div>
  );

  const renderSidebarHeader = (showLabels: boolean, showClose?: boolean) => (
    <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-200 flex-shrink-0">
      <div className="w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 64 64" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
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
      {showLabels && <span className="text-lg font-semibold text-slate-900">EDULMS</span>}
      {showClose && (
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg transition">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  const desktopMargin = sidebarOpen ? '15rem' : '4rem';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderSidebarHeader(true, true)}
        {renderNavLinks(true, () => setMobileOpen(false))}
        {renderFooter(true, () => setMobileOpen(false))}
      </aside>

      <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 flex-col transition-all duration-200 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
        {renderSidebarHeader(sidebarOpen)}
        {renderNavLinks(sidebarOpen)}
        {renderFooter(sidebarOpen)}
      </aside>

      <div className="flex-1 min-w-0 transition-all duration-200"
        style={{ marginLeft: isMobile ? 0 : desktopMargin }}>
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => isMobile ? setMobileOpen(true) : toggleSidebar()}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/profile" className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition">
            <AvatarBubble user={user} size="sm" />
            <span className="text-sm text-slate-700 hidden sm:block">{user?.first_name} {user?.last_name}</span>
          </Link>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
