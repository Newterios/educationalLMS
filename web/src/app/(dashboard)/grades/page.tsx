'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { gradeApi, courseApi } from '@/lib/api';

export default function GradesPage() {
  const { locale, user, isStudent } = useStore();
  const t = getTranslations(locale);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = isStudent() ? user?.id : null;

  useEffect(() => {
    const userId = isStudent() && user?.id ? user.id : undefined;
    courseApi.list(userId).then((res: any) => {
      const list = res?.courses || [];
      setCourses(list);
      if (list.length > 0) setSelectedCourse(list[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!selectedCourse) return;
    gradeApi.gradebook(selectedCourse).then((res: any) => {
      setGrades(res?.grades || []);
    }).catch(() => setGrades([]));
  }, [selectedCourse]);

  const visibleGrades = studentId
    ? grades.filter((g: any) => g.user_id === studentId)
    : grades;

  const chartData = visibleGrades.reduce((acc: any[], g: any) => {
    if (!acc.find((x: any) => x.name === g.component)) {
      const pct = g.max_score ? Math.round((g.score / g.max_score) * 100) : 0;
      acc.push({ name: g.component, score: g.score, maxScore: g.max_score, pct });
    }
    return acc;
  }, []);

  const barColor = (pct: number) => pct >= 80 ? '#22c55e' : pct >= 60 ? '#0ea5e9' : '#ef4444';

  const totalEarned = visibleGrades.reduce((sum: number, g: any) => {
    if (!g.max_score || !g.weight) return sum;
    return sum + (g.score / g.max_score) * g.weight;
  }, 0);
  const totalWeight = visibleGrades.reduce((sum: number, g: any) => sum + (g.weight || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.grades.title}</h1>
      </div>

      <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}
        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
        {courses.map((c: any) => (
          <option key={c.id} value={c.id}>{c.title_en}{c.code ? ` (${c.code})` : ''}</option>
        ))}
      </select>

      {studentId && chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {locale === 'ru' ? 'Мои оценки' : 'My Grades'}
            </h3>
            {totalWeight > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-medium">
                  {locale === 'ru' ? 'Итоговый балл' : 'Total Score'}
                </p>
                <p className={`text-2xl font-black ${totalEarned >= 80 ? 'text-green-600' : totalEarned >= 60 ? 'text-sky-600' : 'text-red-500'}`}>
                  {Math.round(totalEarned * 10) / 10}
                  <span className="text-sm text-slate-400 font-normal">/{totalWeight}</span>
                </p>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                formatter={(value: any, _: any, props: any) => [
                  `${props.payload.score}/${props.payload.maxScore} — ${value}%`,
                  locale === 'ru' ? 'Оценка' : 'Score',
                ]}
                labelStyle={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={barColor(entry.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className={`grid gap-3 ${chartData.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
            {chartData.map((g: any, i: number) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-[11px] text-slate-500 font-medium truncate mb-1">{g.name}</p>
                <p className={`text-xl font-black ${barColor(g.pct) === '#22c55e' ? 'text-green-600' : barColor(g.pct) === '#0ea5e9' ? 'text-sky-600' : 'text-red-500'}`}>
                  {g.pct}%
                </p>
                <p className="text-[10px] text-slate-400">{g.score}/{g.maxScore}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">{t.common.loading}</div>
        ) : visibleGrades.length === 0 ? (
          <div className="p-8 text-center text-slate-400">{t.common.no_data}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {!studentId && (
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {locale === 'ru' ? 'Студент' : 'Student'}
                  </th>
                )}
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.grades.component}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t.grades.score}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t.grades.percentage}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.grades.comment}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t.grades.date}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleGrades.map((g: any, i: number) => {
                const pct = g.max_score ? Math.round(g.score / g.max_score * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    {!studentId && (
                      <td className="px-5 py-3 text-sm text-slate-700 font-medium">{g.first_name} {g.last_name}</td>
                    )}
                    <td className="px-5 py-3 text-sm text-slate-900">{g.component}</td>
                    <td className="px-5 py-3 text-center text-sm">
                      <span className="font-medium">{g.score}</span>
                      <span className="text-slate-400">/{g.max_score}</span>
                    </td>
                    <td className={`px-5 py-3 text-center text-sm font-medium ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-sky-600' : 'text-red-600'}`}>
                      {pct}%
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 max-w-xs truncate">{g.comment || '—'}</td>
                    <td className="px-5 py-3 text-right text-sm text-slate-400">{g.graded_at?.slice(0, 10) || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
