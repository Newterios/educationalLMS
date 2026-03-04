'use client';
import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { scheduleApi, sessionApi, courseApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);
const DAY_NAMES_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS: Record<string, string> = {
  lecture: 'bg-violet-50 border-violet-200 text-violet-900',
  practice: 'bg-blue-50 border-blue-200 text-blue-900',
  lab: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  introduction: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  custom: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900',
};
const FALLBACK_COLORS = [
  'bg-rose-50 border-rose-200 text-rose-900',
  'bg-cyan-50 border-cyan-200 text-cyan-900',
  'bg-indigo-50 border-indigo-200 text-indigo-900',
];

const TYPE_LABELS: Record<string, Record<string, string>> = {
  en: { lecture: 'Lecture', practice: 'Practice', lab: 'Lab', introduction: 'Introduction', custom: 'Custom' },
  ru: { lecture: 'Лекция', practice: 'Практика', lab: 'Лаборат.', introduction: 'Ознаком.', custom: 'Другое' },
};

function getWeekDates(offset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMonthLabel(dates: Date[], locale: string) {
  const months_ru = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months = locale === 'ru' ? months_ru : months_en;
  const m1 = dates[0].getMonth();
  const m2 = dates[6].getMonth();
  const y = dates[0].getFullYear();
  if (m1 === m2) return `${months[m1]} ${y}`;
  return `${months[m1]} - ${months[m2]} ${y}`;
}

function timeToMinutes(t: string) {
  const parts = t.replace(/Z$/, '').split(/[T ]/);
  const time = parts.length > 1 ? parts[1] : parts[0];
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function SchedulePage() {
  const { user, locale, canManageCourse } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();
  const isManager = canManageCourse();

  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [recurringSchedule, setRecurringSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({
    course_id: '', day_of_week: 0, start_time: '09:00', end_time: '10:20', room: '', type: 'lecture', custom_type_name: ''
  });

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const dayNames = locale === 'ru' ? DAY_NAMES_RU : DAY_NAMES_EN;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMinutes = today.getHours() * 60 + today.getMinutes();

  const fromDate = weekDates[0].toISOString().slice(0, 10);
  const toDate = weekDates[6].toISOString().slice(0, 10);

  const loadData = () => {
    if (!user?.id) return;
    Promise.all([
      sessionApi.user(user.id, fromDate, toDate).catch(() => ({ sessions: [] })),
      scheduleApi.user(user.id).catch(() => ({ schedule: [] })),
    ]).then(([sessRes, schedRes]) => {
      setSessions((sessRes as any)?.sessions || []);
      setRecurringSchedule((schedRes as any)?.schedule || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, [user?.id, fromDate, toDate]);

  const combinedSlots = useMemo(() => {
    const result: any[] = [];

    sessions.forEach(s => {
      const sessionDate = new Date(s.date);
      const dayIdx = weekDates.findIndex(d => d.toISOString().slice(0, 10) === sessionDate.toISOString().slice(0, 10));
      if (dayIdx >= 0) {
        result.push({ ...s, dayIdx, isSession: true });
      }
    });

    const sessionDayMap = new Set(sessions.map(s => `${s.course_id}_${new Date(s.date).getDay()}`));
    recurringSchedule.forEach(slot => {
      const dow = slot.day_of_week;
      const jsDow = dow === 6 ? 0 : dow + 1;
      const dayIdx = weekDates.findIndex(d => d.getDay() === jsDow);
      if (dayIdx >= 0 && !sessionDayMap.has(`${slot.course_id}_${jsDow}`)) {
        result.push({ ...slot, dayIdx, isSession: false });
      }
    });

    return result;
  }, [sessions, recurringSchedule, weekDates]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleApi.create({ ...newSlot, created_by: user?.id });
      loadData();
      setShowAdd(false);
      setNewSlot({ course_id: '', day_of_week: 0, start_time: '09:00', end_time: '10:20', room: '', type: 'lecture', custom_type_name: '' });
      toast(locale === 'ru' ? 'Расписание добавлено' : 'Schedule slot added', 'success');
    } catch {
      toast(locale === 'ru' ? 'Этот курс уже есть в этот день' : 'This course already has a pair on this day', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scheduleApi.delete(id);
      loadData();
      toast(locale === 'ru' ? 'Удалено' : 'Deleted', 'success');
    } catch { toast('Failed to delete', 'error'); }
  };

  const typeLabels = TYPE_LABELS[locale] || TYPE_LABELS.en;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">
            {locale === 'ru' ? 'Сегодня' : 'Today'}
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900">{getMonthLabel(weekDates, locale)}</h1>
        </div>
        {isManager && (
          <button onClick={() => { setShowAdd(true); courseApi.list().then((r: any) => setCourses(r?.courses || [])); }}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition font-medium">
            + {locale === 'ru' ? 'Добавить пару' : 'Add Pair'}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={newSlot.course_id} onChange={(e) => setNewSlot({ ...newSlot, course_id: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required>
              <option value="">{locale === 'ru' ? 'Выберите курс' : 'Select course'}</option>
              {courses.map((c: any) => (<option key={c.id} value={c.id}>{c.title_en} ({c.code})</option>))}
            </select>
            <select value={newSlot.day_of_week} onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {dayNames.map((name, i) => (<option key={i} value={i}>{name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
            <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
            <input type="text" value={newSlot.room} onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
              placeholder={locale === 'ru' ? 'Аудитория' : 'Room'} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <select value={newSlot.type} onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="lecture">{typeLabels.lecture}</option>
              <option value="practice">{typeLabels.practice}</option>
              <option value="lab">{typeLabels.lab}</option>
              <option value="introduction">{typeLabels.introduction}</option>
              <option value="custom">{typeLabels.custom}</option>
            </select>
          </div>
          {newSlot.type === 'custom' && (
            <div>
              <input type="text" value={newSlot.custom_type_name}
                onChange={(e) => setNewSlot({ ...newSlot, custom_type_name: e.target.value })}
                placeholder={locale === 'ru' ? 'Название типа' : 'Custom type name'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg">{locale === 'ru' ? 'Сохранить' : 'Save'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg">{locale === 'ru' ? 'Отмена' : 'Cancel'}</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
          <div className="border-r border-slate-100" />
          {weekDates.map((date, i) => {
            const isToday = date.toISOString().slice(0, 10) === todayStr;
            const daySessions = combinedSlots.filter(s => s.dayIdx === i);
            return (
              <div key={i} className={`text-center py-3 border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-brand-50' : ''}`}>
                <div className={`text-2xl font-bold ${isToday ? 'text-brand-600' : 'text-slate-900'}`}>{date.getDate()}</div>
                <div className={`text-xs ${isToday ? 'text-brand-500' : 'text-slate-400'}`}>{dayNames[i]}</div>
                {daySessions.length > 0 && (
                  <div className="text-[10px] text-slate-400 mt-0.5">{daySessions.length} {locale === 'ru' ? 'пар' : 'classes'}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${HOURS.length * 60}px` }}>
          <div className="border-r border-slate-100 relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute w-full text-right pr-2 text-xs text-slate-400 -translate-y-1/2"
                style={{ top: `${(h - 7) * 60}px` }}>
                {h}:00
              </div>
            ))}
          </div>

          {weekDates.map((date, dayIdx) => {
            const isToday = date.toISOString().slice(0, 10) === todayStr;
            const daySlots = combinedSlots.filter(s => s.dayIdx === dayIdx);

            return (
              <div key={dayIdx} className={`relative border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-brand-50/30' : ''}`}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-slate-100" style={{ top: `${(h - 7) * 60}px` }} />
                ))}

                {isToday && weekOffset === 0 && (
                  <div className="absolute w-full z-20 flex items-center" style={{ top: `${(currentMinutes - 7 * 60)}px` }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}

                {daySlots.map((slot: any, slotIdx: number) => {
                  const startMins = timeToMinutes(slot.start_time);
                  const endMins = timeToMinutes(slot.end_time);
                  const top = startMins - 7 * 60;
                  const height = endMins - startMins;
                  const color = COLORS[slot.type] || FALLBACK_COLORS[slotIdx % FALLBACK_COLORS.length];
                  const label = typeLabels[slot.type] || slot.custom_type_name || slot.type;

                  return (
                    <div key={slot.id || slotIdx}
                      className={`absolute left-1 right-1 rounded-lg border p-2 overflow-hidden cursor-pointer group transition-shadow hover:shadow-md ${color}`}
                      style={{ top: `${top}px`, height: `${Math.max(height, 30)}px` }}>
                      <div className="text-xs font-semibold leading-tight truncate">{slot.course_title}</div>
                      {height > 35 && (
                        <div className="text-[10px] opacity-80 mt-0.5 font-medium">{label}</div>
                      )}
                      {height > 50 && (
                        <div className="text-[10px] opacity-60 mt-0.5">
                          {slot.start_time?.toString().slice(0, 5)} - {slot.end_time?.toString().slice(0, 5)} {slot.room ? `| ${slot.room}` : ''}
                        </div>
                      )}
                      {slot.isSession && (
                        <div className="absolute top-1 right-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" title="Actual session" />
                        </div>
                      )}
                      {isManager && !slot.isSession && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
        {Object.entries(COLORS).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${cls}`} />
            <span>{typeLabels[type] || type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>{locale === 'ru' ? 'Занятие' : 'Session'}</span>
        </div>
      </div>
    </div>
  );
}
