'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { analyticsApi, courseApi, userApi } from '@/lib/api';

export default function AnalyticsPage() {
  const { user, locale, canViewAnalytics } = useStore();
  const t = getTranslations(locale);
  const [overview, setOverview] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canViewAnalytics()) return;
    Promise.all([
      analyticsApi.overview().catch(() => null),
      courseApi.list().catch(() => ({ courses: [] })),
      userApi.list().catch(() => ({ users: [] })),
    ]).then(([o, c, u]) => {
      setOverview(o);
      setCourses((c as any)?.courses || []);
      setUsers((u as any)?.users || []);
      setLoading(false);
    });
  }, []);

  const role = (user?.role_name || user?.role || '').toLowerCase();
  const isRu = locale === 'ru';

  const pageTitle = isRu ? 'Аналитика' : 'Analytics';
  const roleLabel = isRu
    ? { dean: 'Деканат — Обзор факультета', curator: 'Куратор — Группа', accountant: 'Финансы — Обзор', hr: 'HR — Кадры', admin: 'Системная аналитика' }
    : { dean: 'Faculty Overview', curator: 'Curator — Group', accountant: 'Finance Overview', hr: 'HR — Staff', admin: 'System Analytics' };

  const subtitle = (roleLabel as any)[role] || (roleLabel as any)['admin'] || '';

  if (!canViewAnalytics()) {
    return (
      <div className="p-8 text-center text-slate-400">
        {isRu ? 'У вас нет доступа к аналитике' : 'You do not have access to analytics'}
      </div>
    );
  }

  const getRoleName = (u: any) => (u.role_name || u.role || '').toLowerCase();
  const totalStudents = users.filter((u: any) => getRoleName(u) === 'student').length;
  const totalTeachers = users.filter((u: any) => ['teacher', 'professor', 'practice_teacher'].includes(getRoleName(u))).length;
  const totalStaff = users.filter((u: any) => !['student', 'guest', 'parent'].includes(getRoleName(u))).length;
  const publishedCourses = courses.filter((c: any) => c.is_published).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">{t.common.loading}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-500">{isRu ? 'Студенты' : 'Students'}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalStudents}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-500">{isRu ? 'Преподаватели' : 'Teachers'}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalTeachers}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-500">{isRu ? 'Всего курсов' : 'Total Courses'}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{courses.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-500">{isRu ? 'Опубликовано' : 'Published'}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{publishedCourses}</p>
            </div>
          </div>

          {(role === 'dean' || role === 'head_of_department') && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
                {isRu ? 'Курсы факультета' : 'Faculty Courses'}
              </h2>
              <div className="divide-y divide-slate-100">
                {courses.slice(0, 10).map((c: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-slate-700">{c.title || c.title_en} <span className="text-slate-400">({c.code})</span></span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.is_published ? (isRu ? 'Опубликован' : 'Published') : (isRu ? 'Черновик' : 'Draft')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {role === 'curator' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3">
                {isRu ? 'Ваши студенты' : 'Your Students'}
              </h2>
              <div className="divide-y divide-slate-100">
                {users.filter((u: any) => getRoleName(u) === 'student').slice(0, 15).map((u: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-slate-700">{u.first_name} {u.last_name}</span>
                    <span className="text-xs text-slate-400">{u.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(role === 'accountant') && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3">
                {isRu ? 'Финансовый обзор' : 'Financial Overview'}
              </h2>
              <p className="text-sm text-slate-500">
                {isRu ? 'Модуль финансовой аналитики будет доступен в ближайших обновлениях.' : 'Financial analytics module coming in upcoming updates.'}
              </p>
            </div>
          )}

          {role === 'hr' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3">
                {isRu ? 'Кадровая аналитика' : 'Staff Analytics'}
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                {isRu ? `Всего преподавателей: ${totalTeachers}` : `Total teaching staff: ${totalTeachers}`}
              </p>
              <div className="divide-y divide-slate-100">
                {users.filter((u: any) => ['teacher', 'professor', 'practice_teacher', 'teaching_assistant'].includes(getRoleName(u))).slice(0, 10).map((u: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-slate-700">{u.first_name} {u.last_name}</span>
                    <span className="text-xs text-slate-400">{getRoleName(u)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-4">
              {isRu ? 'Распределение по ролям' : 'Users by Role'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(
                users.reduce((acc: Record<string, number>, u: any) => {
                  const rn = getRoleName(u) || 'unassigned';
                  acc[rn] = (acc[rn] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([roleName, count]) => {
                const colorMap: Record<string, string> = {
                  admin: 'bg-red-50 border-red-100',
                  superadmin: 'bg-red-50 border-red-100',
                  student: 'bg-blue-50 border-blue-100',
                  teacher: 'bg-green-50 border-green-100',
                  professor: 'bg-emerald-50 border-emerald-100',
                  curator: 'bg-purple-50 border-purple-100',
                  dean: 'bg-indigo-50 border-indigo-100',
                  hr: 'bg-pink-50 border-pink-100',
                  accountant: 'bg-amber-50 border-amber-100',
                  librarian: 'bg-teal-50 border-teal-100',
                  parent: 'bg-orange-50 border-orange-100',
                  rector: 'bg-violet-50 border-violet-100',
                  head_of_department: 'bg-cyan-50 border-cyan-100',
                  practice_teacher: 'bg-lime-50 border-lime-100',
                  teaching_assistant: 'bg-sky-50 border-sky-100',
                  external_reviewer: 'bg-rose-50 border-rose-100',
                  guest: 'bg-slate-50 border-slate-100',
                };
                const bgClass = colorMap[roleName] || 'bg-slate-50 border-slate-100';
                const labelMap: Record<string, string> = {
                  admin: isRu ? 'Администратор' : 'Administrator',
                  superadmin: isRu ? 'Суперадмин' : 'Super Admin',
                  student: isRu ? 'Студент' : 'Student',
                  teacher: isRu ? 'Преподаватель' : 'Teacher',
                  professor: isRu ? 'Профессор' : 'Professor',
                  curator: isRu ? 'Куратор' : 'Curator',
                  dean: isRu ? 'Декан' : 'Dean',
                  hr: 'HR',
                  accountant: isRu ? 'Бухгалтер' : 'Accountant',
                  librarian: isRu ? 'Библиотекарь' : 'Librarian',
                  parent: isRu ? 'Родитель' : 'Parent',
                  rector: isRu ? 'Ректор' : 'Rector',
                  head_of_department: isRu ? 'Зав. кафедрой' : 'Head of Dept.',
                  practice_teacher: isRu ? 'Практик' : 'Practice Teacher',
                  teaching_assistant: isRu ? 'Ассистент' : 'Teaching Assistant',
                  external_reviewer: isRu ? 'Рецензент' : 'External Reviewer',
                  guest: isRu ? 'Гость' : 'Guest',
                  unassigned: isRu ? 'Без роли' : 'Unassigned',
                };
                return (
                  <div key={roleName} className={`rounded-lg px-3 py-2.5 border ${bgClass}`}>
                    <p className="text-xs text-slate-600 font-medium">{labelMap[roleName] || roleName}</p>
                    <p className="text-lg font-bold text-slate-900">{count as number}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-4">
              {isRu ? 'Все пользователи' : 'All Users'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-2 px-3">{isRu ? 'Имя' : 'Name'}</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-2 px-3">Email</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-2 px-3">{isRu ? 'Роль' : 'Role'}</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase py-2 px-3">{isRu ? 'Группа' : 'Group'}</th>
                    <th className="text-center text-xs font-medium text-slate-500 uppercase py-2 px-3">{isRu ? 'Статус' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u: any) => {
                    const rn = getRoleName(u);
                    const roleColors: Record<string, string> = {
                      admin: 'bg-red-50 text-red-700',
                      superadmin: 'bg-red-50 text-red-700',
                      student: 'bg-blue-50 text-blue-700',
                      teacher: 'bg-green-50 text-green-700',
                      professor: 'bg-emerald-50 text-emerald-700',
                      curator: 'bg-purple-50 text-purple-700',
                      dean: 'bg-indigo-50 text-indigo-700',
                    };
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 text-sm text-slate-900">{u.first_name} {u.last_name}</td>
                        <td className="py-2.5 px-3 text-sm text-slate-500">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[rn] || 'bg-slate-100 text-slate-600'}`}>
                            {rn}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-400">{u.group_name || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {u.is_active ? (isRu ? 'Активен' : 'Active') : (isRu ? 'Неактивен' : 'Inactive')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
