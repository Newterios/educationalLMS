'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { courseApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function CoursesPage() {
  const { locale, canManageCourse, isStudent, user } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState({ title_en: '', code: '', credits: 3, description_en: '' });

  const loadCourses = () => {
    const userId = isStudent() && user?.id ? user.id : undefined;
    courseApi.list(userId).then((res: any) => { setCourses(res?.courses || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, [user?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await courseApi.create(newCourse);
      toast('Course created', 'success');
      setShowCreate(false);
      setNewCourse({ title_en: '', code: '', credits: 3, description_en: '' });
      loadCourses();
    } catch {
      toast('Failed to create course', 'error');
    }
  };

  const filtered = courses.filter((c: any) => {
    const q = search.toLowerCase();
    return !q || (c.title_en || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.courses.title}</h1>
        {canManageCourse() && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
            + {t.common.create}
          </button>
        )}
      </div>

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder={t.courses.search} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />

      {showCreate && canManageCourse() && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-4">{t.common.create}</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input type="text" value={newCourse.title_en} onChange={(e) => setNewCourse({ ...newCourse, title_en: e.target.value })}
                  placeholder="Introduction to CS" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                <input type="text" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  placeholder="CS201" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea value={newCourse.description_en} onChange={(e) => setNewCourse({ ...newCourse, description_en: e.target.value })}
                placeholder="Course description..." rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition">{t.common.save}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition">{t.common.cancel}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t.common.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{t.common.no_data}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c: any, idx: number) => {
            const colors = [
              { bg: 'from-blue-50 to-indigo-50', border: 'border-l-blue-500', hover: 'hover:shadow-blue-100', bar: 'bg-blue-500' },
              { bg: 'from-emerald-50 to-teal-50', border: 'border-l-emerald-500', hover: 'hover:shadow-emerald-100', bar: 'bg-emerald-500' },
              { bg: 'from-purple-50 to-violet-50', border: 'border-l-purple-500', hover: 'hover:shadow-purple-100', bar: 'bg-purple-500' },
              { bg: 'from-amber-50 to-orange-50', border: 'border-l-amber-500', hover: 'hover:shadow-amber-100', bar: 'bg-amber-500' },
              { bg: 'from-rose-50 to-pink-50', border: 'border-l-rose-500', hover: 'hover:shadow-rose-100', bar: 'bg-rose-500' },
              { bg: 'from-cyan-50 to-sky-50', border: 'border-l-cyan-500', hover: 'hover:shadow-cyan-100', bar: 'bg-cyan-500' },
            ];
            const color = colors[idx % colors.length];

            const totalWeeks = 15;
            const createdDate = c.created_at ? new Date(c.created_at) : null;
            const now = new Date();
            const weeksElapsed = createdDate ? Math.floor((now.getTime() - createdDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 0;
            const progress = c.is_published ? Math.min(Math.round((weeksElapsed / totalWeeks) * 100), 100) : 0;
            const hasStarted = progress > 0;

            return (
              <Link key={c.id} href={`/courses/${c.id}`}
                className={`bg-gradient-to-br ${color.bg} border border-slate-200/60 border-l-4 ${color.border} rounded-2xl p-6 hover:shadow-lg ${color.hover} transition-all duration-300 block group`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-base group-hover:text-brand-700 transition-colors truncate">{c.title_en}</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono tracking-wider">{c.code}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-3 ${c.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-200/80 text-slate-500'}`}>
                    {c.is_published ? t.courses.published : t.courses.draft}
                  </span>
                </div>
                {c.description_en && <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">{c.description_en}</p>}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">
                      {hasStarted
                        ? (locale === 'ru' ? 'Прогресс' : 'Progress')
                        : (locale === 'ru' ? 'Не начат' : 'Not started')}
                    </span>
                    {hasStarted && (
                      <span className="text-xs font-bold text-slate-700">{progress}%</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${hasStarted ? color.bar : 'bg-slate-300/50'}`}
                      style={{ width: `${hasStarted ? progress : 0}%` }}
                    />
                  </div>
                  {hasStarted && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {locale === 'ru'
                        ? `${Math.min(weeksElapsed, totalWeeks)} из ${totalWeeks} недель`
                        : `${Math.min(weeksElapsed, totalWeeks)} of ${totalWeeks} weeks`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-slate-200/50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <span>{c.credits || 0} {t.courses.credits}</span>
                  </div>
                  <div className="ml-auto text-xs text-brand-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {locale === 'ru' ? 'Открыть' : 'Open'}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
