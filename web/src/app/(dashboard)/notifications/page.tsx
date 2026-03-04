'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { notificationApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

const ICONS: Record<string, string> = {
  grade: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2',
  attendance: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  assignment: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13',
  announcement: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  session: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  system: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};
const ICON_COLORS: Record<string, string> = {
  grade: 'text-blue-500 bg-blue-50',
  attendance: 'text-emerald-500 bg-emerald-50',
  assignment: 'text-violet-500 bg-violet-50',
  announcement: 'text-sky-500 bg-sky-50',
  session: 'text-teal-500 bg-teal-50',
  system: 'text-slate-500 bg-slate-50',
};

export default function NotificationsPage() {
  const { user, locale } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    if (!user?.id) { setLoading(false); return; }
    notificationApi.list(user.id).then((res: any) => {
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unread_count || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadNotifications(); }, [user?.id]);

  const getTitle = (n: any) => {
    if (locale === 'ru' && n.title_ru) return n.title_ru;
    if (locale === 'kk' && n.title_kk) return n.title_kk;
    return n.title_en || n.title || '';
  };

  const getMessage = (n: any) => {
    if (locale === 'ru' && n.message_ru) return n.message_ru;
    if (locale === 'kk' && n.message_kk) return n.message_kk;
    return n.message_en || n.message || '';
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      loadNotifications();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await notificationApi.markAllRead(user.id);
      loadNotifications();
      toast(locale === 'ru' ? 'Все прочитано' : 'All marked as read', 'success');
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.delete(id);
      loadNotifications();
    } catch {}
  };

  const iconPath = (type: string) => ICONS[type] || ICONS.system;
  const iconColor = (type: string) => ICON_COLORS[type] || ICON_COLORS.system;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{t.nav.notifications}</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount} {locale === 'ru' ? 'новых' : 'new'}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium transition">
            {locale === 'ru' ? 'Прочитать всё' : 'Mark all as read'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">{t.common.loading}</div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-slate-400 text-sm">{locale === 'ru' ? 'Нет уведомлений' : 'No notifications yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n._id || n.id}
              className={`bg-white border rounded-xl p-4 flex items-start gap-3 group transition hover:shadow-sm ${
                n.is_read ? 'border-slate-200' : 'border-brand-200 bg-brand-50/30'
              }`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor(n.type)}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPath(n.type)} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{getTitle(n)}</p>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{getMessage(n)}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">{n.created_at?.slice(0, 16)?.replace('T', ' ')}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                {!n.is_read && (
                  <button onClick={() => handleMarkRead(n._id || n.id)} className="p-1 hover:bg-slate-100 rounded-lg" title="Mark as read">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                <button onClick={() => handleDelete(n._id || n.id)} className="p-1 hover:bg-red-50 rounded-lg" title="Delete">
                  <svg className="w-4 h-4 text-slate-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
