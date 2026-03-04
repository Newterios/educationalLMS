'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { analyticsApi, courseApi } from '@/lib/api';

export default function DashboardPage() {
  const { user, locale } = useStore();
  const t = getTranslations(locale);
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.overview().catch(() => null),
      courseApi.list().catch(() => ({ courses: [] })),
    ]).then(([overview, courseData]) => {
      setStats(overview);
      setCourses((courseData as any)?.courses || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.welcome_message}, {user?.first_name || 'User'}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.dashboard.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-medium capitalize">
            {user?.role_name || 'user'}
          </span>
          {(user?.permissions?.length || 0) > 0 && (
            <span className="text-[10px] text-slate-400">{user?.permissions?.length} {locale === 'ru' ? 'прав' : 'permissions'}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.dashboard.total_courses, value: stats?.total_courses ?? courses.length, color: 'bg-brand-50 text-brand-700' },
          { label: t.dashboard.average_gpa, value: stats?.average_gpa?.toFixed(2) ?? '—', color: 'bg-blue-50 text-blue-700' },
          { label: t.dashboard.attendance_rate, value: stats?.attendance_rate ? `${stats.attendance_rate}%` : '—', color: 'bg-green-50 text-green-700' },
          { label: t.dashboard.pending_tasks, value: stats?.pending_tasks ?? '—', color: 'bg-warm-50 text-warm-700' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{t.dashboard.my_courses}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">{t.common.loading}</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-slate-400">{t.dashboard.no_courses}</div>
          ) : (
            courses.slice(0, 5).map((c: any) => (
              <a key={c.id} href={`/courses/${c.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition">
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.title || c.name_en}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.code}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.is_published ? t.courses.published : t.courses.draft}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
