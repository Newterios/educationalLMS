'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { attendanceApi, courseApi, sessionApi } from '@/lib/api';

const TYPE_LABELS: Record<string, Record<string, string>> = {
  en: { lecture: 'Lecture', practice: 'Practice', lab: 'Lab', introduction: 'Introduction', custom: 'Custom' },
  ru: { lecture: 'Лекция', practice: 'Практика', lab: 'Лабораторная', introduction: 'Ознакомление', custom: 'Другое' },
  kk: { lecture: 'Лекция', practice: 'Практика', lab: 'Зертханалық', introduction: 'Танысу', custom: 'Басқа' },
};

export default function AttendancePage() {
  const { user, locale } = useStore();
  const t = getTranslations(locale);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'this_course' | 'all_courses'>('this_course');

  const typeLabel = (type: string, custom?: string) => {
    if (type === 'custom' && custom) return custom;
    return (TYPE_LABELS[locale] || TYPE_LABELS.en)[type] || type;
  };

  useEffect(() => {
    courseApi.list().then((res: any) => {
      const list = res?.courses || [];
      setCourses(list);
      if (list.length > 0) setSelectedCourse(list[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    Promise.all([
      sessionApi.list(selectedCourse).catch(() => ({ sessions: [] })),
      attendanceApi.course(selectedCourse).catch(() => ({ records: [] })),
    ]).then(([sessRes, attRes]) => {
      setSessions((sessRes as any)?.sessions || []);
      setRecords((attRes as any)?.records || []);
    });
  }, [selectedCourse]);

  const statusStyle: Record<string, string> = {
    present: 'bg-green-50 text-green-700 border-green-200',
    absent: 'bg-red-50 text-red-600 border-red-200',
    late: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    excused: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const getStatusForDate = (date: string) => {
    if (!user?.id) return null;
    const record = records.find(r => r.date?.slice(0, 10) === date && r.user_id === user.id);
    return record?.status || null;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days_en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days_ru = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months_en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months_ru = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const days = locale === 'ru' ? days_ru : days_en;
    const months = locale === 'ru' ? months_ru : months_en;
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const parts = t.replace(/Z$/, '').split(/[T ]/);
    const time = parts.length > 1 ? parts[1] : parts[0];
    return time.slice(0, 5);
  };

  const getPoints = (status: string | null) => {
    if (status === 'present') return '2 / 2';
    if (status === 'late') return '1 / 2';
    if (status === 'absent') return '0 / 2';
    return '? / 2';
  };

  const takenSessions = sessions.filter(s => {
    const status = getStatusForDate(s.date);
    return status && status !== 'absent';
  });

  const totalPoints = sessions.reduce((sum, s) => {
    const status = getStatusForDate(s.date);
    if (status === 'present') return sum + 2;
    if (status === 'late') return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">{t.attendance.title}</h1>

      <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}
        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
        {courses.map((c: any) => (<option key={c.id} value={c.id}>{c.title_en || c.title} ({c.code})</option>))}
      </select>

      <div className="flex gap-1 border-b border-slate-200">
        {(['this_course', 'all_courses'] as const).map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {key === 'this_course' ? (locale === 'ru' ? 'Этот курс' : 'This course') : (locale === 'ru' ? 'Все курсы' : 'All courses')}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">{t.common.loading}</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {locale === 'ru' ? 'Нет запланированных занятий' : 'No scheduled sessions'}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Дата' : 'Date'}</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Описание' : 'Description'}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Статус' : 'Status'}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Баллы' : 'Points'}</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Примечание' : 'Remarks'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s: any, i: number) => {
                  const status = getStatusForDate(s.date);
                  const isPast = new Date(s.date) <= new Date();
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-slate-900">{formatDate(s.date)}</div>
                        <div className="text-xs text-slate-400">{formatTime(s.start_time)} - {formatTime(s.end_time)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-medium ${
                          s.type === 'lecture' ? 'text-violet-700' :
                          s.type === 'practice' ? 'text-blue-700' :
                          s.type === 'lab' ? 'text-emerald-700' :
                          'text-slate-700'
                        }`}>{typeLabel(s.type, s.custom_type_name)}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {status ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusStyle[status] || 'bg-slate-100 text-slate-500'}`}>
                            {(t.attendance as any)[status] || status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{isPast ? '?' : '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center text-sm font-medium text-slate-600">{getPoints(status)}</td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {s.room && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{s.room}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex gap-6 text-sm text-slate-600">
              <div>{locale === 'ru' ? 'Пройдено занятий' : 'Taken sessions'}: <span className="font-semibold text-slate-900">{takenSessions.length}</span></div>
              <div>{locale === 'ru' ? 'Баллы' : 'Points'}: <span className="font-semibold text-slate-900">{totalPoints} / {sessions.length * 2}</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
