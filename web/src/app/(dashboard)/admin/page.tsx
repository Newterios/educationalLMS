'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { userApi, notificationApi, courseApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

const CATEGORY_LABELS: Record<string, { en: string; ru: string }> = {
  courses: { en: 'Courses', ru: 'Курсы' },
  grades: { en: 'Grades', ru: 'Оценки' },
  attendance: { en: 'Attendance', ru: 'Посещаемость' },
  assessments: { en: 'Tests & Quizzes', ru: 'Тесты' },
  users: { en: 'User Management', ru: 'Пользователи' },
  admin: { en: 'Administration', ru: 'Администрирование' },
  analytics: { en: 'Analytics', ru: 'Аналитика' },
  finance: { en: 'Finance', ru: 'Финансы' },
  notifications: { en: 'Notifications', ru: 'Уведомления' },
  media: { en: 'Media & Files', ru: 'Медиа и файлы' },
};

const CATEGORY_COLORS: Record<string, string> = {
  courses: 'bg-blue-50 text-blue-700 border-blue-200',
  grades: 'bg-amber-50 text-amber-700 border-amber-200',
  attendance: 'bg-green-50 text-green-700 border-green-200',
  assessments: 'bg-purple-50 text-purple-700 border-purple-200',
  users: 'bg-sky-50 text-sky-700 border-sky-200',
  admin: 'bg-red-50 text-red-700 border-red-200',
  analytics: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  finance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  notifications: 'bg-orange-50 text-orange-700 border-orange-200',
  media: 'bg-teal-50 text-teal-700 border-teal-200',
};

function RolesPermissionEditor({ roles, locale, toast }: { roles: any[]; locale: string; toast: (msg: string, type?: any) => void }) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.listPermissions().then((res: any) => setAllPermissions(res?.permissions || [])).catch(() => {});
  }, []);

  const toggleRole = async (roleId: string) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      return;
    }
    setExpandedRole(roleId);
    setLoadingPerms(true);
    try {
      const res: any = await userApi.getRolePermissions(roleId);
      const permIds = new Set<string>((res?.permissions || []).map((p: any) => p.id as string));
      setRolePerms(permIds);
    } catch { setRolePerms(new Set()); }
    setLoadingPerms(false);
  };

  const handleTogglePerm = async (roleId: string, permId: string) => {
    const newSet = new Set(rolePerms);
    if (newSet.has(permId)) newSet.delete(permId);
    else newSet.add(permId);
    setRolePerms(newSet);
    setSaving(true);
    try {
      await userApi.updateRolePermissions(roleId, Array.from(newSet));
      toast(locale === 'ru' ? 'Права обновлены' : 'Permissions updated', 'success');
    } catch {
      toast(locale === 'ru' ? 'Ошибка обновления' : 'Failed to update', 'error');
    }
    setSaving(false);
  };

  const grouped = allPermissions.reduce((acc: Record<string, any[]>, p: any) => {
    const cat = p.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  const permCount = (roleId: string) => {
    if (expandedRole === roleId) return rolePerms.size;
    return '...';
  };

  return (
    <div className="divide-y divide-slate-100">
      {roles.map((r: any) => (
        <div key={r.id}>
          <button onClick={() => toggleRole(r.id)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition text-left">
            <div className="flex items-center gap-3">
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedRole === r.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <div>
                <span className="text-sm font-medium text-slate-900">{locale === 'ru' ? (r.display_name_ru || r.name) : (r.display_name_en || r.name)}</span>
                <span className="text-xs text-slate-400 ml-2">({r.name})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {expandedRole === r.id ? `${rolePerms.size}/${allPermissions.length}` : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_system ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {r.is_system ? 'System' : 'Custom'}
              </span>
            </div>
          </button>

          {expandedRole === r.id && (
            <div className="px-5 pb-4 pt-1">
              {loadingPerms ? (
                <p className="text-xs text-slate-400 py-2">{locale === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([cat, perms]) => {
                    const label = CATEGORY_LABELS[cat] || { en: cat, ru: cat };
                    const color = CATEGORY_COLORS[cat] || 'bg-slate-50 text-slate-700 border-slate-200';
                    return (
                      <div key={cat}>
                        <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded border mb-2 ${color}`}>
                          {locale === 'ru' ? label.ru : label.en}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                          {(perms as any[]).map((p: any) => (
                            <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                              <input type="checkbox" checked={rolePerms.has(p.id)} disabled={saving}
                                onChange={() => handleTogglePerm(r.id, p.id)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                              <span className="text-xs text-slate-700">{locale === 'ru' ? (p.name_ru || p.code) : (p.name_en || p.code)}</span>
                              <span className="text-[10px] text-slate-400 ml-auto font-mono">{p.code}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { user, locale } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterRole, setFilterRole] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifTarget, setNotifTarget] = useState<'all' | 'role' | 'user' | 'group'>('all');
  const [notifRole, setNotifRole] = useState('');
  const [notifGroupId, setNotifGroupId] = useState('');
  const [notifUserId, setNotifUserId] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('announcement');
  const [notifSending, setNotifSending] = useState(false);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupYear, setNewGroupYear] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [addUserSearch, setAddUserSearch] = useState('');

  const [showBatchEnroll, setShowBatchEnroll] = useState(false);
  const [batchGroupId, setBatchGroupId] = useState('');
  const [batchCourseId, setBatchCourseId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const loadData = () => {
    Promise.all([
      userApi.list({ role: filterRole || undefined, group_id: filterGroup || undefined, search: filterSearch || undefined }).catch(() => ({ users: [] })),
      userApi.roles().catch(() => ({ roles: [] })),
      userApi.groups().catch(() => ({ groups: [] })),
      courseApi.list().catch(() => ({ courses: [] })),
      userApi.list().catch(() => ({ users: [] })),
    ]).then(([u, r, g, c, all]) => {
      let userList = (u as any)?.users || [];
      if (userList.length === 0 && user) userList = [user];
      setUsers(userList);
      setAllUsers((all as any)?.users || []);
      setRoles((r as any)?.roles || []);
      setGroups((g as any)?.groups || []);
      setCourses((c as any)?.courses || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, [user, filterRole, filterGroup, filterSearch]);

  useEffect(() => {
    if (selectedGroup) {
      const members = allUsers.filter((u: any) => u.group_id === selectedGroup.id);
      setGroupMembers(members);
    }
  }, [selectedGroup, allUsers]);

  const handleRoleChange = async (userId: string, roleName: string) => {
    try {
      await userApi.updateRole(userId, roleName);
      toast(`Role changed to ${roleName}`, 'success');
      loadData();
    } catch {
      toast('Failed to change role', 'error');
    }
  };

  const handleAddToGroup = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      await userApi.setUserGroup(userId, selectedGroup.id);
      toast(locale === 'ru' ? 'Пользователь добавлен в группу' : 'User added to group', 'success');
      setAddUserSearch('');
      loadData();
    } catch {
      toast('Failed to add user', 'error');
    }
  };

  const handleRemoveFromGroup = async (userId: string) => {
    try {
      await userApi.setUserGroup(userId, null);
      toast(locale === 'ru' ? 'Пользователь удалён из группы' : 'User removed from group', 'success');
      loadData();
    } catch {
      toast('Failed to remove user', 'error');
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    try {
      let targetUserIds: string[] = [];
      if (notifTarget === 'all') {
        targetUserIds = allUsers.map((u: any) => u.id);
      } else if (notifTarget === 'role') {
        targetUserIds = allUsers.filter((u: any) => (u.role || u.role_name) === notifRole).map((u: any) => u.id);
      } else if (notifTarget === 'group') {
        const groupUsers = await userApi.list({ group_id: notifGroupId });
        targetUserIds = (groupUsers.users || []).map((u: any) => u.id);
      } else {
        targetUserIds = [notifUserId];
      }

      if (targetUserIds.length === 0) {
        toast('No users found for selected target', 'error');
        setNotifSending(false);
        return;
      }

      if (targetUserIds.length === 1) {
        await notificationApi.create({
          user_id: targetUserIds[0], type: notifType,
          title_en: notifTitle, title_ru: notifTitle, title_kk: notifTitle,
          message_en: notifMessage, message_ru: notifMessage, message_kk: notifMessage,
        });
      } else {
        await notificationApi.createBulk({
          user_ids: targetUserIds, type: notifType,
          title_en: notifTitle, title_ru: notifTitle,
          message_en: notifMessage, message_ru: notifMessage,
        });
      }

      toast(`Sent to ${targetUserIds.length} user(s)`, 'success');
      setNotifTitle('');
      setNotifMessage('');
      setShowNotifForm(false);
    } catch {
      toast('Failed to send', 'error');
    }
    setNotifSending(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await userApi.createGroup({ name: newGroupName, year: newGroupYear ? parseInt(newGroupYear) : undefined });
      toast('Group created', 'success');
      setNewGroupName('');
      setNewGroupYear('');
      setShowCreateGroup(false);
      loadData();
    } catch {
      toast('Failed to create group', 'error');
    }
  };

  const handleBatchEnroll = async () => {
    if (!batchGroupId || !batchCourseId) return;
    setEnrolling(true);
    try {
      const groupUsers = await userApi.list({ group_id: batchGroupId });
      const userIds = (groupUsers.users || []).map((u: any) => u.id);
      if (userIds.length === 0) {
        toast('No users in this group', 'error');
        setEnrolling(false);
        return;
      }
      let enrolled = 0;
      for (const uid of userIds) {
        try {
          await courseApi.enroll(batchCourseId, uid, 'student');
          enrolled++;
        } catch { /* already enrolled */ }
      }
      toast(`Enrolled ${enrolled}/${userIds.length} students`, 'success');
      setShowBatchEnroll(false);
    } catch {
      toast('Batch enrollment failed', 'error');
    }
    setEnrolling(false);
  };

  const getGroupName = (gid: string) => groups.find((g: any) => g.id === gid)?.name || '';

  const addableUsers = addUserSearch.trim().length > 0
    ? allUsers.filter((u: any) =>
        !groupMembers.some((m: any) => m.id === u.id) &&
        (`${u.first_name} ${u.last_name} ${u.email}`).toLowerCase().includes(addUserSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.title}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">{t.admin.users}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : allUsers.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">{t.admin.roles}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : roles.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">{locale === 'ru' ? 'Группы' : 'Groups'}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : groups.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">{locale === 'ru' ? 'Курсы' : 'Courses'}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : courses.length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            {locale === 'ru' ? 'Группы студентов' : 'Student Groups'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowBatchEnroll(!showBatchEnroll); setShowCreateGroup(false); }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              {locale === 'ru' ? 'Записать в курс' : 'Enroll to course'}
            </button>
            <button onClick={() => { setShowCreateGroup(!showCreateGroup); setShowBatchEnroll(false); }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              {showCreateGroup ? t.common.cancel : '+ ' + (locale === 'ru' ? 'Группа' : 'Group')}
            </button>
          </div>
        </div>

        {showCreateGroup && (
          <div className="p-5 border-b border-slate-100 flex items-end gap-3 bg-slate-50/50">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Название' : 'Name'}</label>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. SE-2301" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Год' : 'Year'}</label>
              <input type="number" value={newGroupYear} onChange={(e) => setNewGroupYear(e.target.value)}
                placeholder="2024" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
            </div>
            <button onClick={handleCreateGroup} className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
              {locale === 'ru' ? 'Создать' : 'Create'}
            </button>
          </div>
        )}

        {showBatchEnroll && (
          <div className="p-5 border-b border-slate-100 bg-blue-50/40 space-y-3">
            <p className="text-xs font-semibold text-blue-700">{locale === 'ru' ? 'Записать всю группу в курс' : 'Enroll entire group to a course'}</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Группа' : 'Group'}</label>
                <select value={batchGroupId} onChange={(e) => setBatchGroupId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select group...</option>
                  {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}{g.year ? ` (${g.year})` : ''}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Курс' : 'Course'}</label>
                <select value={batchCourseId} onChange={(e) => setBatchCourseId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select course...</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title_en || c.title_ru} ({c.code})</option>)}
                </select>
              </div>
              <button onClick={handleBatchEnroll} disabled={!batchGroupId || !batchCourseId || enrolling}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                {enrolling ? '...' : (locale === 'ru' ? 'Записать' : 'Enroll')}
              </button>
            </div>
          </div>
        )}

        {groups.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {groups.map((g: any) => {
              const memberCount = allUsers.filter((u: any) => u.group_id === g.id).length;
              const isSelected = selectedGroup?.id === g.id;
              return (
                <div key={g.id}>
                  <button onClick={() => setSelectedGroup(isSelected ? null : g)}
                    className={`w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition ${isSelected ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium text-slate-900">{g.name}</span>
                      {g.year && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{g.year}</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${memberCount > 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-400'}`}>
                      {memberCount} {locale === 'ru' ? 'чел.' : 'users'}
                    </span>
                  </button>

                  {isSelected && (
                    <div className="px-5 pb-4 bg-blue-50/30 border-t border-blue-100">
                      <div className="pt-3 pb-2">
                        <div className="relative">
                          <input
                            value={addUserSearch}
                            onChange={(e) => setAddUserSearch(e.target.value)}
                            placeholder={locale === 'ru' ? 'Поиск пользователя для добавления...' : 'Search user to add...'}
                            className="w-full px-3 py-2 pl-9 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {addableUsers.length > 0 && (
                          <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {addableUsers.map((u: any) => (
                              <button key={u.id} onClick={() => handleAddToGroup(u.id)}
                                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-blue-50 transition text-sm">
                                <div>
                                  <span className="font-medium text-slate-900">{u.first_name} {u.last_name}</span>
                                  <span className="text-slate-400 ml-2 text-xs">{u.email}</span>
                                </div>
                                <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                  {locale === 'ru' ? 'Добавить' : 'Add'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {addUserSearch.trim().length > 0 && addableUsers.length === 0 && (
                          <p className="text-xs text-slate-400 mt-2 text-center">
                            {locale === 'ru' ? 'Не найдено пользователей' : 'No users found'}
                          </p>
                        )}
                      </div>

                      {groupMembers.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 mb-2">
                            {locale === 'ru' ? 'Участники группы' : 'Group members'} ({groupMembers.length})
                          </p>
                          {groupMembers.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                                  {m.first_name?.[0]}{m.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{m.first_name} {m.last_name}</p>
                                  <p className="text-xs text-slate-400">{m.email} · {m.role || 'student'}</p>
                                </div>
                              </div>
                              <button onClick={() => handleRemoveFromGroup(m.id)}
                                className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                                title={locale === 'ru' ? 'Удалить из группы' : 'Remove from group'}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-sm text-slate-400 py-3">
                          {locale === 'ru' ? 'В группе пока нет участников. Найдите пользователя выше и добавьте.' : 'No members yet. Search and add users above.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 text-center text-sm text-slate-400">{locale === 'ru' ? 'Нет групп' : 'No groups yet'}</div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {(t.admin as any).send_notification || 'Send Notification'}
          </h2>
          <button onClick={() => setShowNotifForm(!showNotifForm)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            {showNotifForm ? t.common.cancel : t.common.create}
          </button>
        </div>

        {showNotifForm && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all' as const, label: locale === 'ru' ? 'Все' : 'All Users', icon: 'A' },
                  { key: 'role' as const, label: locale === 'ru' ? 'По роли' : 'By Role', icon: 'R' },
                  { key: 'group' as const, label: locale === 'ru' ? 'По группе' : 'By Group', icon: 'G' },
                  { key: 'user' as const, label: locale === 'ru' ? 'Пользователь' : 'Specific User', icon: 'U' },
                ].map((opt) => (
                  <button key={opt.key} onClick={() => setNotifTarget(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition ${notifTarget === opt.key ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[10px] font-bold">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {notifTarget === 'role' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={notifRole} onChange={(e) => setNotifRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select role...</option>
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.name}>{r.name} ({allUsers.filter((u: any) => (u.role || u.role_name) === r.name).length})</option>
                  ))}
                </select>
              </div>
            )}

            {notifTarget === 'group' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{locale === 'ru' ? 'Группа' : 'Group'}</label>
                <select value={notifGroupId} onChange={(e) => setNotifGroupId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select group...</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}{g.year ? ` (${g.year})` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {notifTarget === 'user' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                <select value={notifUserId} onChange={(e) => setNotifUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select user...</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={notifType} onChange={(e) => setNotifType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="announcement">Announcement</option>
                <option value="system">System</option>
                <option value="grade">Grade</option>
                <option value="attendance">Attendance</option>
                <option value="assignment">Assignment</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Notification title..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Notification message..." />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                {notifTarget === 'all' && `Will send to ${allUsers.length} users`}
                {notifTarget === 'role' && notifRole && `Will send to ${allUsers.filter((u: any) => (u.role || u.role_name) === notifRole).length} ${notifRole}(s)`}
                {notifTarget === 'group' && notifGroupId && `Will send to group "${getGroupName(notifGroupId)}"`}
                {notifTarget === 'user' && notifUserId && `Will send to 1 user`}
              </p>
              <button onClick={handleSendNotification}
                disabled={notifSending || !notifTitle.trim() || !notifMessage.trim() ||
                  (notifTarget === 'role' && !notifRole) ||
                  (notifTarget === 'group' && !notifGroupId) ||
                  (notifTarget === 'user' && !notifUserId)}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {notifSending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <h2 className="font-semibold text-slate-900">{t.admin.users}</h2>
          <div className="flex flex-wrap gap-2">
            <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={locale === 'ru' ? 'Поиск...' : 'Search...'}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="">{locale === 'ru' ? 'Все роли' : 'All roles'}</option>
              {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="">{locale === 'ru' ? 'Все группы' : 'All groups'}</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {(filterRole || filterGroup || filterSearch) && (
              <button onClick={() => { setFilterRole(''); setFilterGroup(''); setFilterSearch(''); }}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-2">
                {locale === 'ru' ? 'Сбросить' : 'Clear'}
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">{t.common.loading}</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">{t.common.no_data}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t.auth.email}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Группа' : 'Group'}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u: any, i: number) => (
                  <tr key={u.id || i} className={`hover:bg-slate-50 transition ${u.id === user?.id ? 'bg-brand-50/30' : ''}`}>
                    <td className="px-5 py-3 text-sm text-slate-900">
                      {u.first_name} {u.last_name}
                      {u.id === user?.id && <span className="ml-2 text-xs text-brand-600 font-medium">(You)</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-5 py-3 text-center">
                      {u.group_name ? (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{u.group_name}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <select
                        value={u.role || u.role_name || 'student'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === user?.id}
                        className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 ${u.id === user?.id ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
                        {roles.map((r: any) => (<option key={r.id} value={r.name}>{r.name}</option>))}
                        {roles.length === 0 && <option value={u.role || 'student'}>{u.role || 'student'}</option>}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {roles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              {locale === 'ru' ? 'Роли и права доступа (RBAC)' : 'Roles & Permissions (RBAC)'}
            </h2>
          </div>
          <RolesPermissionEditor roles={roles} locale={locale} toast={toast} />
        </div>
      )}
    </div>
  );
}
