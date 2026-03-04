'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie } from 'recharts';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { courseApi, attendanceApi, gradeApi, userApi, notificationApi, assignmentApi, sessionApi, mediaApi, formulaApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

const CourseRulesSummary = ({ formula, locale = 'en' }: { formula: any, locale?: string }) => {
  if (!formula) return null;
  const t = {
    attendance: locale === 'ru' ? 'Мин. посещаемость' : 'Min Attendance',
    regterm: locale === 'ru' ? 'Мин. Regterm (M+E)/2' : 'Min Regterm (M+E)/2',
    final: locale === 'ru' ? 'Мин. балл за Финал' : 'Min Final Score',
    rules: locale === 'ru' ? 'Правила допуска' : 'Admission Rules'
  };

  const att = formula.attendance_threshold ?? 70;
  const reg = formula.regterm_threshold ?? 50;
  const fin = formula.final_threshold ?? 50;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        <h4 className="text-sm font-bold text-slate-900 tracking-wide uppercase">{t.rules}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase">{t.attendance}</p>
          </div>
          <p className="text-xl font-black text-slate-900">{att}%</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase leading-tight max-w-[100px]">{t.regterm}</p>
          </div>
          <p className="text-xl font-black text-slate-900">{reg}%</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase">{t.final}</p>
          </div>
          <p className="text-xl font-black text-slate-900">{fin}%</p>
        </div>
      </div>
    </div>
  );
};

const ProgressDashboard = ({ data, thresholds, locale = 'en' }: { data: any, thresholds: any, locale?: string }) => {
  if (!data) return null;
  const isSummer = data.is_summer_trimester;
  
  const componentData = Object.entries(data.component_progress || {}).map(([id, earned]: any) => ({
    name: id,
    value: Math.round(earned * 100) / 100
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{data.first_name} {data.last_name}</h3>
          <p className="text-sm text-slate-500">{locale === 'ru' ? 'Текущий прогресс в курсе' : 'Current Course Progress'}</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border-2 ${isSummer ? 'bg-red-50 text-red-600 border-red-100' : 'bg-brand-50 text-brand-600 border-brand-100'}`}>
          {isSummer ? (locale === 'ru' ? 'Летний триместр / Пересдача' : 'Summer Trimester') : (locale === 'ru' ? 'Допущен к сессии' : 'On Track')}
        </div>
      </div>

      {isSummer && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 flex gap-4 items-start animate-pulse">
          <div className="bg-red-500 text-white p-1 rounded-full">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="text-sm text-red-800 font-bold uppercase mb-1">{locale === 'ru' ? 'ВНИМАНИЕ: Критическое нарушение правил' : 'CRITICAL: Rule Violation'}</p>
            <p className="text-sm text-red-700">{data.summer_reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-6">
          <div className="text-center bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-[10px] border-slate-200 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900">{Math.round(data.current_score)}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Earned</span>
              </div>
              <svg className="absolute w-36 h-36 -rotate-90">
                <circle cx="72" cy="72" r="63" fill="none" stroke={isSummer ? '#ef4444' : '#0ea5e9'} strokeWidth="10" strokeDasharray={`${(data.current_score / 100) * 395} 395`} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
            </div>
            <div className="mt-4 flex justify-center gap-4">
               <div><p className="text-[10px] text-slate-400 uppercase font-bold">Max Possible</p><p className="text-sm font-black text-slate-700">{Math.round(data.max_possible_score)}</p></div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div><p className="text-[10px] text-slate-400 uppercase font-bold">Status</p><p className={`text-sm font-black ${isSummer ? 'text-red-500' : 'text-emerald-500'}`}>{isSummer ? 'Fail' : 'Pass'}</p></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="flex justify-between text-[10px] font-bold uppercase mb-1.5">
                <span className="text-slate-500">{locale === 'ru' ? 'Посещаемость' : 'Attendance'}</span>
                <span className={data.attendance < thresholds.attendance ? 'text-red-500 font-black' : 'text-slate-900'}>{Math.round(data.attendance)}% / {thresholds.attendance}%</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                <div className={`h-full transition-all duration-700 ${data.attendance < thresholds.attendance ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${data.attendance}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 h-80 flex flex-col">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
            {locale === 'ru' ? 'Детализация набранных баллов' : 'Points Breakdown By Component'}
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={componentData} layout="vertical" margin={{ left: 60, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} width={80} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {componentData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={isSummer ? '#fca5a5' : '#38bdf8'} />
                  ))}
                </Bar>
                <ReferenceLine x={50} stroke="#cbd5e1" strokeDasharray="5 5" label={{ value: 'Passing', position: 'top', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex gap-4 text-[9px] font-bold uppercase text-slate-400 justify-end">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-400 rounded-full"></span> {locale === 'ru' ? 'Набрано' : 'Earned'}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-200 rounded-full"></span> {locale === 'ru' ? 'Доступно' : 'Remaining'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpandableText = ({ text, className = "", buttonClassName = "", locale = "en" }: { text: string, className?: string, buttonClassName?: string, locale?: string }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > 150 || text.split('\n').length > 3;

  return (
    <div className="w-full min-w-0 max-w-full">
      <div 
        className={`${className} break-words whitespace-pre-wrap ${expanded ? '' : 'line-clamp-3 overflow-hidden'}`}
        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      >
        {text}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
          className={`text-[10px] font-bold hover:underline mt-1 ${buttonClassName}`}
        >
          {expanded ? (locale === 'ru' ? 'Скрыть' : 'Show less') : (locale === 'ru' ? 'Прочитать еще' : 'Read more')}
        </button>
      )}
    </div>
  );
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, locale, canManageCourse, canEditGrades, canMarkAttendance, hasPermission } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();
  const courseId = id as string;
  const isManager = canManageCourse();
  const canGrade = canEditGrades();
  const canAttend = canMarkAttendance();
  const isStudent = !isManager && !canGrade && !canAttend;

  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [tab, setTab] = useState<'sections' | 'students' | 'attendance' | 'grades' | 'settings'>('sections');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newSection, setNewSection] = useState({ title_en: '', position: 1 });
  const [showAddSection, setShowAddSection] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [sectionMaterials, setSectionMaterials] = useState<Record<string, any[]>>({});
  const [addingItemSection, setAddingItemSection] = useState<string | null>(null);
  const [addingItemType, setAddingItemType] = useState<'assignment' | 'document' | 'video' | 'link' | 'note'>('document');
  const [newMaterial, setNewMaterial] = useState({ title_en: '', type: 'document', external_url: '', content: '', file_url: '' });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [enrollingGroup, setEnrollingGroup] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceMarked, setAttendanceMarked] = useState<Record<string, string>>({});

  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ date: '', start_time: '13:00', end_time: '15:00', type: 'lecture', custom_type_name: '', room: '' });
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const [showAddGrade, setShowAddGrade] = useState(false);
  const [grades, setGrades] = useState<any[]>([]);
  const [newGrade, setNewGrade] = useState({ user_id: '', component: '', score: 0, max_score: 100, weight: 10, comment: '' });
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [usedWeight, setUsedWeight] = useState(0);

  const [formula, setFormula] = useState<{ id?: string, components: any[], rules: any[], attendance_threshold?: number, regterm_threshold?: number, final_threshold?: number, summer_trimester_rules?: any } | null>(null);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    title_en: '', description_en: '', max_score: 100, due_date: '',
    allow_late_submission: false, allowed_formats: 'pdf,docx,jpg,png,zip', max_file_size_mb: 10,
    max_files: 1, file_url: '', link_url: '', grading_component_id: ''
  });
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submitForm, setSubmitForm] = useState({ file_urls: [] as string[], link_url: '', text_content: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: '' });

  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<string | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);

  const reload = () => {
    return Promise.all([
      courseApi.get(courseId, isStudent ? user?.id : undefined).catch((err) => {
        if (err?.message?.includes('403')) {
          toast(locale === 'ru' ? 'Нет доступа к этому курсу' : 'You do not have access to this course', 'error');
          router.push('/courses');
        }
        return null;
      }),
      courseApi.sections(courseId).catch(() => ({ sections: [] })),
      courseApi.enrollments(courseId).catch(() => ({ enrollments: [] })),
      assignmentApi.list(courseId).catch(() => ({ assignments: [] })),
      sessionApi.list(courseId).catch(() => ({ sessions: [] })),
      formulaApi.get(courseId).catch(() => ({ components: [], rules: [] })),
    ]).then(([c, s, e, a, sess, f]) => {
      console.log('Reload data - Formula:', f);
      setCourse(c);
      setSections((s as any)?.sections || []);
      setEnrollments((e as any)?.enrollments || []);
      setAssignments((a as any)?.assignments || []);
      setClassSessions((sess as any)?.sessions || []);
      
      if (f && (f as any).id) {
        console.log('Setting formula from DB:', f);
        setFormula(f as any);
      } else {
        console.log('No formula found, using defaults');
        setFormula(null);
      }
      setLoading(false);
    });
  };

  useEffect(() => { if (courseId) reload(); }, [courseId]);

  const toggleSection = async (sId: string) => {
    const isOpen = expandedSections[sId];
    setExpandedSections({ ...expandedSections, [sId]: !isOpen });
    if (!isOpen && !sectionMaterials[sId]) {
      const res: any = await courseApi.materials(sId).catch(() => ({ materials: [] }));
      setSectionMaterials({ ...sectionMaterials, [sId]: res?.materials || [] });
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await courseApi.createSection(courseId, { title_en: newSection.title_en, position: newSection.position });
      const s: any = await courseApi.sections(courseId);
      setSections(s?.sections || []);
      setShowAddSection(false);
      setNewSection({ title_en: '', position: sections.length + 2 });
      toast('Week added', 'success');
    } catch { toast('Failed to add week', 'error'); }
  };

  const handleAddMaterial = async (sectionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMaterial.title_en.trim()) {
      toast('Title is required', 'error');
      return;
    }

    try {
      let finalFileUrl = newMaterial.file_url;
      if (materialFile) {
        setIsUploadingMaterial(true);
        const res = await mediaApi.upload(materialFile, user?.id);
        finalFileUrl = mediaApi.getFileUrl(res.id);
        setIsUploadingMaterial(false);
      }

      await courseApi.createMaterial(sectionId, { 
        title_en: newMaterial.title_en, 
        type: newMaterial.type, 
        external_url: newMaterial.external_url || undefined,
        content: newMaterial.content || undefined,
        file_url: finalFileUrl || undefined
      });
      const res: any = await courseApi.materials(sectionId);
      setSectionMaterials({ ...sectionMaterials, [sectionId]: res?.materials || [] });
      setAddingItemSection(null);
      setNewMaterial({ title_en: '', type: 'document', external_url: '', content: '', file_url: '' });
      setMaterialFile(null);
      toast('Item added', 'success');
    } catch { 
      setIsUploadingMaterial(false);
      toast('Failed to add item', 'error'); 
    }
  };

  const handleCreateAssignment = async (sectionId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignmentApi.create({
        course_id: courseId, section_id: sectionId, title_en: newAssignment.title_en,
        description_en: newAssignment.description_en || undefined,
        max_score: newAssignment.max_score,
        due_date: newAssignment.due_date || undefined,
        allow_late_submission: newAssignment.allow_late_submission,
        allowed_formats: newAssignment.allowed_formats.split(',').map(f => f.trim()),
        max_file_size_mb: newAssignment.max_file_size_mb,
        max_files: newAssignment.max_files,
        file_url: newAssignment.file_url || undefined,
        link_url: newAssignment.link_url || undefined,
        grading_component_id: newAssignment.grading_component_id || undefined,
        created_by: user?.id
      });
      reload();
      setAddingItemSection(null);
      setNewAssignment({ title_en: '', description_en: '', max_score: 100, due_date: '', allow_late_submission: false, allowed_formats: 'pdf,docx,jpg,png,zip', max_file_size_mb: 10, max_files: 1, file_url: '', link_url: '', grading_component_id: '' });
      toast('Assignment created', 'success');
    } catch { toast('Failed to create assignment', 'error'); }
  };

  const startEditAssignment = (a: any) => {
    setNewAssignment({
      title_en: a.title_en,
      description_en: a.description_en || '',
      max_score: a.max_score,
      due_date: a.due_date ? a.due_date.slice(0, 16) : '',
      allow_late_submission: !!a.allow_late_submission,
      allowed_formats: Array.isArray(a.allowed_formats) ? a.allowed_formats.join(',') : (a.allowed_formats || 'pdf,docx,jpg,png,zip'),
      max_file_size_mb: a.max_file_size_mb || 10,
      max_files: a.max_files || 1,
      file_url: a.file_url || '',
      link_url: a.link_url || '',
      grading_component_id: a.grading_component_id || ''
    });
    setIsEditingAssignment(true);
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    try {
      await assignmentApi.update(selectedAssignment.id, {
        title_en: newAssignment.title_en,
        description_en: newAssignment.description_en || undefined,
        max_score: newAssignment.max_score,
        due_date: newAssignment.due_date || undefined,
        allow_late_submission: newAssignment.allow_late_submission,
        allowed_formats: newAssignment.allowed_formats.split(',').map(f => f.trim()),
        max_file_size_mb: newAssignment.max_file_size_mb,
        max_files: newAssignment.max_files,
        file_url: newAssignment.file_url || undefined,
        link_url: newAssignment.link_url || undefined,
        grading_component_id: newAssignment.grading_component_id || undefined
      });
      setIsEditingAssignment(false);
      reload();
      const updated = { ...selectedAssignment, ...newAssignment, allowed_formats: newAssignment.allowed_formats.split(',').map(f => f.trim()) };
      setSelectedAssignment(updated);
      toast('Assignment updated', 'success');
    } catch { toast('Failed to update assignment', 'error'); }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm(locale === 'ru' ? 'Вы уверены, что хотите удалить задание?' : 'Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentApi.delete(id);
      setSelectedAssignment(null);
      reload();
      toast('Assignment deleted', 'success');
    } catch { toast('Failed to delete assignment', 'error'); }
  };

  const openAssignment = async (a: any) => {
    setSelectedAssignment(a);
    setIsEditingAssignment(false);
    const res: any = await assignmentApi.submissions(a.id).catch(() => ({ submissions: [] }));
    const allSubs = res?.submissions || [];
    setSubmissions(allSubs);
    
    if (isStudent) {
      const mySub = allSubs.find((s: any) => s.user_id === user?.id);
      if (mySub) {
        setSubmitForm({
          file_urls: Array.isArray(mySub.file_urls) ? mySub.file_urls : [],
          link_url: mySub.link_url || '',
          text_content: mySub.text_content || ''
        });
      } else {
        setSubmitForm({ file_urls: [], link_url: '', text_content: '' });
      }
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    
    if (submitForm.file_urls.length === 0 && !submitForm.link_url && !submitForm.text_content) {
      toast(locale === 'ru' ? 'Пожалуйста, прикрепите файл, добавьте ссылку или напишите комментарий' : 'Please attach a file, provide a link, or write a comment', 'error');
      return;
    }

    try {
      const res: any = await assignmentApi.submit(selectedAssignment.id, {
        user_id: user?.id,
        file_urls: submitForm.file_urls,
        link_url: submitForm.link_url || undefined,
        text_content: submitForm.text_content || undefined,
      });
      toast(res?.is_late ? 'Submitted (Late)' : 'Submitted successfully', res?.is_late ? 'info' : 'success');
      setGradingSubmission(null);
      openAssignment(selectedAssignment);
    } catch (err: any) {
      toast(err?.message || 'Submission failed', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedAssignment) return;
    const files = Array.from(e.target.files);
    
    if (submitForm.file_urls.length + files.length > selectedAssignment.max_files) {
      toast(locale === 'ru' ? `Можно загрузить не более ${selectedAssignment.max_files} файлов.` : `You can only upload up to ${selectedAssignment.max_files} files.`, 'error');
      return;
    }

    const maxSize = (selectedAssignment.max_file_size_mb || 10) * 1024 * 1024;
    const allowedFormats = selectedAssignment.allowed_formats || [];
    
    for (const f of files) {
      if (f.size > maxSize) {
        toast(locale === 'ru' ? `Файл ${f.name} превышает лимит в ${selectedAssignment.max_file_size_mb} MB.` : `File ${f.name} exceeds ${selectedAssignment.max_file_size_mb} MB limit.`, 'error');
        return;
      }
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (allowedFormats.length > 0 && !allowedFormats.includes(ext) && !allowedFormats.includes('.' + ext)) {
        toast(locale === 'ru' ? `Формат ${ext} не поддерживается.` : `Format ${ext} is not allowed.`, 'error');
        return;
      }
    }

    setIsUploading(true);
    try {
      const newUrls = [...submitForm.file_urls];
      for (const f of files) {
        const res = await mediaApi.upload(f, user?.id);
        const url = mediaApi.getFileUrl(res.id);
        newUrls.push(url);
      }
      setSubmitForm({ ...submitForm, file_urls: newUrls });
    } catch (err: any) {
      toast(locale === 'ru' ? 'Ошибка загрузки файлов' : 'Failed to upload files', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSubmission = async () => {
    if (!selectedAssignment || !window.confirm('Are you sure you want to delete your submission?')) return;
    try {
      await assignmentApi.deleteSubmission(selectedAssignment.id, user?.id ?? '');
      toast('Submission deleted', 'success');
      setSubmitForm({ file_urls: [], link_url: '', text_content: '' });
      openAssignment(selectedAssignment);
    } catch (err: any) {
      toast(err?.message || 'Failed to delete submission', 'error');
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    try {
      await assignmentApi.gradeSubmission(submissionId, {
        score: gradeForm.score, feedback: gradeForm.feedback || undefined, graded_by: user?.id
      });
      const res: any = await assignmentApi.submissions(selectedAssignment.id);
      setSubmissions(res?.submissions || []);
      setGradingSubmission(null);
      toast('Graded', 'success');
    } catch { toast('Failed to grade', 'error'); }
  };

  const handleEnroll = async (userId: string) => {
    try { await courseApi.enroll(courseId, userId); reload(); toast('Student added', 'success'); }
    catch { toast('Failed to add student', 'error'); }
  };

  const handleEnrollGroup = async (groupId: string) => {
    setEnrollingGroup(true);
    try {
      const res = await userApi.list({ group_id: groupId });
      const groupUsers = res.users || [];
      if (groupUsers.length === 0) {
        toast(locale === 'ru' ? 'В группе нет пользователей' : 'No users in this group', 'error');
        setEnrollingGroup(false);
        return;
      }
      const currentEnrolled = new Set(enrollments.map((e: any) => e.user_id));
      let added = 0;
      for (const u of groupUsers) {
        if (!currentEnrolled.has(u.id)) {
          try { await courseApi.enroll(courseId, u.id); added++; } catch { /* already enrolled */ }
        }
      }
      reload();
      toast(locale === 'ru' ? `Добавлено ${added} из ${groupUsers.length} студентов` : `Added ${added} of ${groupUsers.length} students`, 'success');
      setShowAddGroup(false);
    } catch { toast('Failed to enroll group', 'error'); }
    setEnrollingGroup(false);
  };

  const handleUnenroll = async (userId: string) => {
    try { await courseApi.unenroll(courseId, userId); reload(); toast('Student removed', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const loadAttendance = (date?: string) => {
    const d = date || attendanceDate;
    attendanceApi.course(courseId, d).then((res: any) => {
      setAttendanceRecords(res?.records || []);
      const marked: Record<string, string> = {};
      (res?.records || []).forEach((r: any) => { marked[r.user_id] = r.status; });
      setAttendanceMarked(marked);
    }).catch(() => {});
  };
  useEffect(() => { if (tab === 'attendance') loadAttendance(); }, [tab, attendanceDate]);

  const handleMarkAttendance = async (userId: string, status: string) => {
    try {
      await attendanceApi.mark({ course_id: courseId, user_id: userId, status, date: attendanceDate, marked_by: user?.id });
      setAttendanceMarked({ ...attendanceMarked, [userId]: status });
      toast(`Marked as ${status}`, 'success');
    } catch { toast('Failed to mark', 'error'); }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sessionApi.create({
        course_id: courseId, date: newSession.date,
        start_time: newSession.start_time, end_time: newSession.end_time,
        type: newSession.type,
        custom_type_name: newSession.type === 'custom' ? newSession.custom_type_name : undefined,
        room: newSession.room || undefined, created_by: user?.id
      });
      reload();
      setShowAddSession(false);
      setNewSession({ date: '', start_time: '13:00', end_time: '15:00', type: 'lecture', custom_type_name: '', room: '' });
      toast('Session created', 'success');
    } catch { toast('Failed to create session', 'error'); }
  };

  const handleDeleteSession = async (id: string) => {
    try { await sessionApi.delete(id); reload(); toast('Session deleted', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const selectSessionForAttendance = (session: any) => {
    setSelectedSession(session);
    setAttendanceDate(session.date);
    loadAttendance(session.date);
  };

  const TYPE_LABELS: Record<string, string> = {
    lecture: locale === 'ru' ? 'Лекция' : 'Lecture',
    practice: locale === 'ru' ? 'Практика' : 'Practice',
    lab: locale === 'ru' ? 'Лабораторная' : 'Lab',
    introduction: locale === 'ru' ? 'Ознакомление' : 'Introduction',
    custom: locale === 'ru' ? 'Другое' : 'Custom',
  };

  const loadGrades = () => {
    gradeApi.gradebook(courseId).then((res: any) => setGrades(res?.grades || [])).catch(() => {});
    gradeApi.progress(courseId).then((res: any) => {
      setStudentProgress(res?.progress || []);
      setUsedWeight(res?.used_weight || 0);
    }).catch(() => {});
  };
  useEffect(() => { if (tab === 'grades') loadGrades(); }, [tab]);

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const gradeData: any = { course_id: courseId, ...newGrade, graded_by: user?.id };
      if (!gradeData.comment) delete gradeData.comment;
      await gradeApi.create(gradeData);
      const pct = newGrade.max_score ? Math.round(newGrade.score / newGrade.max_score * 100) : 0;
      const earned = newGrade.max_score ? Math.round((newGrade.score / newGrade.max_score) * newGrade.weight * 100) / 100 : 0;
      try {
        await notificationApi.create({
          user_id: newGrade.user_id, type: 'grade',
          title_en: `New Grade: ${newGrade.component}`, title_ru: `Новая оценка: ${newGrade.component}`, title_kk: `Жаңа баға: ${newGrade.component}`,
          message_en: `You received ${newGrade.score}/${newGrade.max_score} (${pct}%) for ${newGrade.component}. Earned ${earned}/${newGrade.weight} points.${newGrade.comment ? ' Comment: ' + newGrade.comment : ''}`,
          message_ru: `Вы получили ${newGrade.score}/${newGrade.max_score} (${pct}%) за ${newGrade.component}. Набрано ${earned}/${newGrade.weight} баллов.${newGrade.comment ? ' Комментарий: ' + newGrade.comment : ''}`,
          message_kk: `${newGrade.component} үшін ${newGrade.score}/${newGrade.max_score} (${pct}%) алдыңыз. ${earned}/${newGrade.weight} балл.${newGrade.comment ? ' Пікір: ' + newGrade.comment : ''}`,
          data: { course_id: courseId, component: newGrade.component, score: newGrade.score, max_score: newGrade.max_score, weight: newGrade.weight },
        });
      } catch {}
      loadGrades();
      setShowAddGrade(false);
      setNewGrade({ user_id: '', component: '', score: 0, max_score: 100, weight: 10, comment: '' });
      toast('Grade added', 'success');
    } catch (err: any) { toast(err?.message || 'Failed to add grade', 'error'); }
  };

  const loadAllUsers = () => {
    userApi.list().then((res: any) => setAllUsers(res?.users || [])).catch(() => {});
  };

  const loadGroups = () => {
    userApi.groups().then((res: any) => setGroups(res?.groups || [])).catch(() => {});
  };

  const loadStudentSubmissions = async (userId: string) => {
    setSelectedStudentForGrades(userId);
    const subs: any[] = [];
    for (const a of assignments) {
      const res: any = await assignmentApi.submissions(a.id).catch(() => ({ submissions: [] }));
      const studentSub = (res?.submissions || []).find((s: any) => s.user_id === userId);
      subs.push({ assignment: a, submission: studentSub || null });
    }
    setStudentAssignments(subs);
  };

  const [advancedProgress, setAdvancedProgress] = useState<any>(null);
  const [isLoadingAdvanced, setIsLoadingAdvanced] = useState(false);

  const loadAdvancedProgress = () => {
    setIsLoadingAdvanced(true);
    gradeApi.advancedProgress(courseId).then((res: any) => {
      setAdvancedProgress(res);
      setIsLoadingAdvanced(false);
    }).catch(() => setIsLoadingAdvanced(false));
  };

  useEffect(() => {
    if (tab === 'grades') loadAdvancedProgress();
  }, [tab]);

  const [editingFormula, setEditingFormula] = useState(false);
  const [formulaForm, setFormulaForm] = useState<any>({
    components: [], 
    rules: [],
    attendance_threshold: 70,
    regterm_threshold: 50,
    final_threshold: 50
  });

  const handleEditFormula = () => {
    setFormulaForm({
      id: formula?.id,
      components: formula?.components || [],
      rules: formula?.rules || [],
      attendance_threshold: formula?.attendance_threshold || 70,
      regterm_threshold: formula?.regterm_threshold || 50,
      final_threshold: formula?.final_threshold || 50,
      summer_trimester_rules: formula?.summer_trimester_rules || {}
    });
    setEditingFormula(true);
  };

  const handleSaveFormula = async () => {
    try {
      console.log('Saving formula with data:', formulaForm);
      const totalWeight = formulaForm.components.reduce((acc: number, c: any) => acc + (parseFloat(c.weight) || 0), 0);
      if (totalWeight > 100) {
        toast(locale === 'ru' ? 'Общий вес не может превышать 100%' : 'Total weight cannot exceed 100%', 'error');
        return;
      }
      
      const a = parseFloat(formulaForm.attendance_threshold);
      const r = parseFloat(formulaForm.regterm_threshold);
      const f = parseFloat(formulaForm.final_threshold);
      
      if (isNaN(a) || a < 0 || a > 100 || isNaN(r) || r < 0 || r > 100 || isNaN(f) || f < 0 || f > 100) {
        toast(locale === 'ru' ? 'Пороги должны быть от 0 до 100%' : 'Thresholds must be between 0 and 100%', 'error');
        return;
      }

      const updateData = {
        components: formulaForm.components,
        rules: formulaForm.rules,
        attendance_threshold: a,
        regterm_threshold: r,
        final_threshold: f,
        summer_trimester_rules: formulaForm.summer_trimester_rules || {}
      };

      if (formula?.id) {
        console.log('PUT update formula:', formula.id, updateData);
        await formulaApi.update(formula.id, updateData);
      } else {
        console.log('POST create formula:', { course_id: courseId, ...updateData });
        await formulaApi.create({ course_id: courseId, ...updateData });
      }
      
      toast(locale === 'ru' ? 'Настройки сохранены' : 'Settings saved', 'success');
      setEditingFormula(false);
      await reload();
      loadAdvancedProgress();
    } catch (err: any) {
      console.error('Save formula error:', err);
      toast(err.message || (locale === 'ru' ? 'Ошибка сохранения' : 'Failed to save settings'), 'error');
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-400">{t.common.loading}</div>;
  if (!course) return <div className="py-12 text-center text-slate-400">Course not found</div>;

  const enrolledIds = new Set(enrollments.map((e: any) => e.user_id));
  const availableUsers = allUsers.filter((u: any) => !enrolledIds.has(u.id));

  const materialIcon: Record<string, string> = {
    document: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    assignment: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  };

  const sectionAssignments = (sectionId: string) => assignments.filter(a => a.section_id === sectionId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/courses')} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{course.title_en}</h1>
          <p className="text-sm text-slate-400 font-mono">{course.code}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {(['sections', 'students', 'attendance', 'grades', 'settings'] as const).map((key) => {
          if (key === 'settings' && !isManager) return null;
          return (
            <button key={key} onClick={() => { setTab(key); setSelectedAssignment(null); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {key === 'sections' ? 'Weeks' : key === 'students' ? 'Students' : key === 'attendance' ? 'Attendance' : key === 'grades' ? 'Grades' : 'Settings'}
            </button>
          )
        })}
      </div>

      {selectedAssignment && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{selectedAssignment.title_en}</h3>
            <div className="flex items-center gap-2">
              {(hasPermission('assignment.edit') || isManager) && !isEditingAssignment && (
                <>
                  <button onClick={() => startEditAssignment(selectedAssignment)} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition">Edit</button>
                  <button onClick={() => handleDeleteAssignment(selectedAssignment.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition">Delete</button>
                </>
              )}
              <button onClick={() => { setSelectedAssignment(null); setIsEditingAssignment(false); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {isEditingAssignment ? (
            <form onSubmit={handleUpdateAssignment} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Edit Assignment</h4>
              <div>
                <input type="text" value={newAssignment.title_en} onChange={e => setNewAssignment({ ...newAssignment, title_en: e.target.value })}
                  placeholder="Assignment title" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
              </div>
              <textarea value={newAssignment.description_en} onChange={e => setNewAssignment({ ...newAssignment, description_en: e.target.value })}
                placeholder="Description..." rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
              
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold">Grading Component</label>
                <select value={newAssignment.grading_component_id} onChange={e => setNewAssignment({ ...newAssignment, grading_component_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                  <option value="">-- No component --</option>
                  {formula?.components?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} (Weight: {c.weight})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Max Score</label>
                  <input type="number" value={newAssignment.max_score} onChange={e => setNewAssignment({ ...newAssignment, max_score: parseFloat(e.target.value) })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Due Date</label>
                  <input type="datetime-local" value={newAssignment.due_date} onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Max Files</label>
                  <input type="number" value={newAssignment.max_files} onChange={e => setNewAssignment({ ...newAssignment, max_files: parseInt(e.target.value) })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Max MB</label>
                  <input type="number" value={newAssignment.max_file_size_mb} onChange={e => setNewAssignment({ ...newAssignment, max_file_size_mb: parseInt(e.target.value) })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Formats</label>
                  <input type="text" value={newAssignment.allowed_formats} onChange={e => setNewAssignment({ ...newAssignment, allowed_formats: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium mt-3 md:mt-5 cursor-pointer">
                  <input type="checkbox" checked={newAssignment.allow_late_submission} onChange={e => setNewAssignment({ ...newAssignment, allow_late_submission: e.target.checked })} 
                    className="w-4 h-4 text-brand-600 rounded border-slate-300" />
                  Allow late submission
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white font-bold text-sm rounded-lg hover:bg-brand-700 transition">Save Changes</button>
                <button type="button" onClick={() => setIsEditingAssignment(false)} className="flex-1 py-2 bg-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-300 transition">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-slate-400 block text-[10px] uppercase">Max Score</span> <span className="font-medium">{selectedAssignment.max_score}</span></div>
                <div><span className="text-slate-400 block text-[10px] uppercase">Due Date</span> <span className="font-medium">{selectedAssignment.due_date?.slice(0, 16).replace('T', ' ') || 'No deadline'}</span></div>
                <div><span className="text-slate-400 block text-[10px] uppercase">Late Sub</span> <span className={`font-medium ${selectedAssignment.allow_late_submission ? 'text-green-600' : 'text-red-500'}`}>{selectedAssignment.allow_late_submission ? 'Allowed' : 'Not allowed'}</span></div>
                <div><span className="text-slate-400 block text-[10px] uppercase">Max Files</span> <span className="font-medium">{selectedAssignment.max_files} (max {selectedAssignment.max_file_size_mb} MB)</span></div>
              </div>
              {selectedAssignment.description_en && <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100">{selectedAssignment.description_en}</div>}
            </>
          )}
          
          <div className="flex flex-wrap gap-2">
            {selectedAssignment.file_url && (
              <a href={selectedAssignment.file_url} target="_blank" className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100 transition flex items-center gap-1.5 border border-brand-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                Template/Instructions
              </a>
            )}
            {selectedAssignment.link_url && (
              <a href={selectedAssignment.link_url} target="_blank" className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium hover:bg-sky-100 transition flex items-center gap-1.5 border border-sky-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Reference Link
              </a>
            )}
          </div>

          {isStudent && (() => {
            const mySub = submissions.find((s: any) => s.user_id === user?.id);
            const canEdit = !selectedAssignment.due_date || new Date() < new Date(selectedAssignment.due_date) || selectedAssignment.allow_late_submission;
            
            if (mySub && !gradingSubmission) {
              return (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Your Submission</h4>
                    <div className="flex items-center gap-2">
                      {mySub.is_late && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Late</span>}
                      <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Submitted</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    {mySub.score !== null && (
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <span className="text-sm font-medium text-slate-600">Grade</span>
                        <span className="text-lg font-bold text-brand-600">{mySub.score} / {selectedAssignment.max_score}</span>
                      </div>
                    )}
                    
                    {mySub.file_urls && Array.isArray(mySub.file_urls) && mySub.file_urls.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Attached Files</p>
                        <div className="flex flex-wrap gap-2">
                          {mySub.file_urls.map((url: string, idx: number) => {
                            const filename = url.split('/').pop() || `File ${idx + 1}`;
                            return (
                              <a key={idx} href={url} target="_blank" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:border-brand-300 transition flex items-center gap-2 shadow-sm" title={filename}>
                                <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                <span className="max-w-[150px] truncate">{filename}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {mySub.link_url && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Submission Link</p>
                        <a href={mySub.link_url} target="_blank" className="text-xs text-brand-600 hover:underline break-all inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          {mySub.link_url}
                        </a>
                      </div>
                    )}
                    
                    {mySub.text_content && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Comments</p>
                        <ExpandableText text={mySub.text_content} className="text-xs text-slate-600 italic" buttonClassName="text-slate-500" locale={locale} />
                      </div>
                    )}
                    
                    {mySub.feedback && (
                      <div className="mt-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                        <p className="text-[10px] text-brand-600 uppercase font-bold mb-1">Instructor Feedback</p>
                        <ExpandableText text={mySub.feedback} className="text-xs text-brand-800" buttonClassName="text-brand-600" locale={locale} />
                      </div>
                    )}
                  </div>
                  
                  {canEdit && (
                    <div className="flex gap-2">
                      <button onClick={() => setGradingSubmission('edit')} className="flex-1 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition font-medium">
                        Edit Submission
                      </button>
                      <button onClick={handleDeleteSubmission} className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition font-medium border border-red-100">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            if (!mySub || gradingSubmission === 'edit') {
              return (
                <form onSubmit={handleSubmitAssignment} className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">{gradingSubmission === 'edit' ? 'Edit Your Work' : 'Submit Your Work'}</h4>
                    {gradingSubmission === 'edit' && <button type="button" onClick={() => setGradingSubmission(null)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Cancel Edit</button>}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">External Link</label>
                      <input type="url" value={submitForm.link_url} onChange={e => setSubmitForm({ ...submitForm, link_url: e.target.value })}
                        placeholder="e.g. https://github.com/username/repo" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 focus:outline-none" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Files ({submitForm.file_urls.length}/{selectedAssignment.max_files})</label>
                        <span className="text-[10px] text-slate-400">Max {selectedAssignment.max_file_size_mb}MB per file</span>
                      </div>
                      
                      {submitForm.file_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {submitForm.file_urls.map((url, idx) => {
                            const filename = url.split('/').pop() || `File ${idx + 1}`;
                            return (
                              <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 shadow-sm group">
                                <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                <span className="max-w-[150px] truncate" title={filename}>{filename}</span>
                                <button type="button" onClick={() => {
                                  const newUrls = [...submitForm.file_urls];
                                  newUrls.splice(idx, 1);
                                  setSubmitForm({ ...submitForm, file_urls: newUrls });
                                }} className="text-slate-300 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" title={locale === 'ru' ? 'Удалить' : 'Remove'}>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {submitForm.file_urls.length < selectedAssignment.max_files && (
                        <div className="relative w-full border-2 border-dashed border-slate-200 hover:border-brand-300 bg-slate-50 hover:bg-brand-50 transition rounded-xl p-4 text-center cursor-pointer">
                          <input 
                            type="file" 
                            multiple 
                            onChange={handleFileUpload} 
                            disabled={isUploading}
                            accept={selectedAssignment.allowed_formats ? selectedAssignment.allowed_formats.map((f: string) => `.${f.replace('.','')}`).join(',') : '*'}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                          />
                          <div className="flex flex-col items-center gap-1">
                            {isUploading ? (
                              <svg className="animate-spin w-5 h-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                            )}
                            <p className="text-xs font-medium text-slate-600">{isUploading ? (locale === 'ru' ? 'Загрузка...' : 'Uploading...') : (locale === 'ru' ? 'Нажмите или перетащите файлы сюда' : 'Click or drag files here')}</p>
                            {!isUploading && selectedAssignment.allowed_formats && (
                              <p className="text-[10px] text-slate-400 uppercase">{selectedAssignment.allowed_formats.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Text Response / Notes</label>
                      <textarea value={submitForm.text_content} onChange={e => setSubmitForm({ ...submitForm, text_content: e.target.value })}
                        placeholder="Any additional notes for the teacher..." rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 focus:outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition font-bold shadow-md">
                    {gradingSubmission === 'edit' ? 'Update Submission' : 'Submit Now'}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">By submitting, you agree to the academic integrity policy.</p>
                </form>
              );
            }
          })()}

          {isManager && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                <span>Submissions</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{submissions.length} / {enrollments.filter(e => e.role === 'student' || !e.role).length}</span>
              </h4>
              {submissions.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium italic">No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub: any) => (
                    <div key={sub.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-start justify-between hover:border-brand-200 transition shadow-sm">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{sub.first_name} {sub.last_name}</p>
                          {sub.is_late && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Late</span>}
                        </div>
                        <p className="text-[10px] text-slate-400">{sub.submitted_at?.slice(0, 16).replace('T', ' ')}</p>
                        
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {sub.link_url && (
                            <a href={sub.link_url} target="_blank" className="px-2 py-1 bg-sky-50 text-sky-700 rounded-md text-[10px] font-medium border border-sky-100 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              Link
                            </a>
                          )}
                          {sub.file_urls && Array.isArray(sub.file_urls) && sub.file_urls.map((url: string, fidx: number) => {
                            const filename = url.split('/').pop() || `File ${fidx + 1}`;
                            return (
                              <a key={fidx} href={url} target="_blank" className="px-2 py-1 bg-brand-50 text-brand-700 rounded-md text-[10px] font-medium border border-brand-100 flex items-center gap-1" title={filename}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                <span className="max-w-[100px] truncate">{filename}</span>
                              </a>
                            );
                          })}
                        </div>
                        
                        {sub.text_content && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <ExpandableText text={`"${sub.text_content}"`} className="text-[11px] text-slate-500 italic" buttonClassName="text-slate-500" locale={locale} />
                          </div>
                        )}
                        
                        {sub.score !== null && sub.score !== undefined && (
                          <div className="mt-2 flex flex-col items-start gap-1">
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Score: {sub.score}/{selectedAssignment.max_score}</span>
                            {sub.feedback && (
                              <div className="w-full">
                                <ExpandableText text={`Feedback: ${sub.feedback}`} className="text-[10px] text-slate-400" buttonClassName="text-slate-400" locale={locale} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-3">
                        {gradingSubmission === sub.id ? (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-2 w-40">
                            <input type="number" value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: parseFloat(e.target.value) })}
                              max={selectedAssignment.max_score} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" placeholder="Score" />
                            <textarea value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs" placeholder="Feedback" rows={2} />
                            <div className="flex gap-1">
                              <button onClick={() => handleGradeSubmission(sub.id)} className="flex-1 py-1 bg-green-600 text-white text-[10px] rounded font-bold">Save</button>
                              <button onClick={() => setGradingSubmission(null)} className="flex-1 py-1 bg-slate-200 text-slate-600 text-[10px] rounded">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setGradingSubmission(sub.id); setGradeForm({ score: sub.score || 0, feedback: sub.feedback || '' }); }}
                            className="px-3 py-1 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 transition font-medium shadow-sm">
                            Grade
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'sections' && !selectedAssignment && (
        <div className="space-y-2">
          {isManager && (
            <div className="flex justify-end">
              <button onClick={() => { setNewSection({ title_en: '', position: sections.length + 1 }); setShowAddSection(true); }}
                className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition">+ Add Week</button>
            </div>
          )}
          {showAddSection && (
            <form onSubmit={handleAddSection} className="bg-white border border-slate-200 rounded-xl p-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Week Title</label>
                <input type="text" value={newSection.title_en} onChange={(e) => setNewSection({ ...newSection, title_en: e.target.value })}
                  placeholder="e.g. Introduction to Arrays" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-slate-600 mb-1">#</label>
                <input type="number" value={newSection.position} onChange={(e) => setNewSection({ ...newSection, position: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" min={1} />
              </div>
              <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg">{t.common.save}</button>
              <button type="button" onClick={() => setShowAddSection(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg">{t.common.cancel}</button>
            </form>
          )}
          {sections.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No weeks added yet</div>
          ) : (
            sections.sort((a, b) => (a.position || 0) - (b.position || 0)).map((s: any, i: number) => (
              <div key={s.id || i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleSection(s.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections[s.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    <span className="w-7 h-7 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center text-xs font-semibold">{s.position || i + 1}</span>
                    <span className="text-sm font-medium text-slate-900">{s.title_en}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sectionAssignments(s.id).length > 0 && (
                      <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{sectionAssignments(s.id).length} assignments</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_visible !== false ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.is_visible !== false ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </button>
                {expandedSections[s.id] && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-2 bg-slate-50/50">
                    {(sectionMaterials[s.id] || []).length === 0 && sectionAssignments(s.id).length === 0 && <p className="text-xs text-slate-400 italic mb-2">No items in this section</p>}
                    
                    {(sectionMaterials[s.id] || []).map((m: any, mi: number) => (
                      <div key={m.id || mi} className="bg-white border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition shadow-sm mb-2">
                        <div className="flex items-center gap-3 mb-1">
                          <svg className={`w-4 h-4 flex-shrink-0 ${m.type === 'note' ? 'text-amber-500' : 'text-brand-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={m.type === 'note' ? 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' : (m.type === 'link' ? 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' : 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13')} />
                          </svg>
                          <span className="text-sm font-semibold text-slate-800">{m.title_en}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${m.type === 'note' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{m.type}</span>
                        </div>
                        
                        {m.content && m.type === 'note' && (
                          <div className="mt-2 pl-7">
                            <ExpandableText text={m.content} className="text-xs text-slate-600" buttonClassName="text-slate-500" locale={locale} />
                          </div>
                        )}
                        
                        <div className="pl-7 flex flex-wrap gap-2 mt-1">
                          {m.file_url && (
                            <a href={m.file_url} target="_blank" className="px-2 py-1 bg-brand-50 text-brand-700 rounded text-xs font-medium border border-brand-100 flex items-center gap-1.5 hover:bg-brand-100 transition">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              {locale === 'ru' ? 'Скачать файл' : 'Download File'}
                            </a>
                          )}
                          {m.external_url && (
                            <a href={m.external_url} target="_blank" className="px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-medium border border-sky-100 flex items-center gap-1.5 hover:bg-sky-100 transition">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              {locale === 'ru' ? 'Открыть ссылку' : 'Open Link'}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}

                    {sectionAssignments(s.id).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-brand-200 transition"
                        onClick={() => openAssignment(a)}>
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={materialIcon.assignment} />
                          </svg>
                          <div>
                            <span className="text-sm font-medium text-slate-900">{a.title_en}</span>
                            <span className="text-xs text-slate-400 ml-2">Max: {a.max_score}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.due_date && <span className="text-xs text-slate-400">{a.due_date?.slice(0, 10)}</span>}
                          <span className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">Assignment</span>
                        </div>
                      </div>
                    ))}

                    {(isManager || hasPermission('course.edit') || hasPermission('assignment.create')) && addingItemSection !== s.id && (
                      <div className="mt-2">
                        <button onClick={() => { 
                          setAddingItemSection(s.id); 
                          setAddingItemType('document');
                          setNewMaterial({ title_en: '', type: 'document', external_url: '', content: '', file_url: '' });
                          setMaterialFile(null);
                        }}
                          className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          {locale === 'ru' ? 'Добавить материал' : 'Add Item'}
                        </button>
                      </div>
                    )}

                    {addingItemSection === s.id && (
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mt-3 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h5 className="text-sm font-bold text-slate-800">{locale === 'ru' ? 'Новый материал' : 'Add New Item'}</h5>
                          <button onClick={() => setAddingItemSection(null)} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          {[
                            { id: 'document', label: locale === 'ru' ? 'Файл' : 'File', icon: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13' },
                            { id: 'link', label: locale === 'ru' ? 'Ссылка' : 'Link', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
                            { id: 'note', label: locale === 'ru' ? 'Заметка' : 'Note', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                            { id: 'assignment', label: locale === 'ru' ? 'Задание (HW)' : 'Assignment', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }
                          ].filter(t => t.id !== 'assignment' || hasPermission('assignment.create') || isManager).map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setAddingItemType(t.id as any);
                                setNewMaterial({ ...newMaterial, type: t.id === 'assignment' ? 'document' : t.id });
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-md transition ${addingItemType === t.id ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {addingItemType === 'assignment' ? (
                          <form onSubmit={(e) => handleCreateAssignment(s.id, e)} className="space-y-3">
                            <div>
                              <input type="text" value={newAssignment.title_en} onChange={e => setNewAssignment({ ...newAssignment, title_en: e.target.value })}
                                placeholder={locale === 'ru' ? "Название задания" : "Assignment title"} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none font-medium" required />
                            </div>
                            <textarea value={newAssignment.description_en} onChange={e => setNewAssignment({ ...newAssignment, description_en: e.target.value })}
                              placeholder={locale === 'ru' ? "Описание и инструкции..." : "Description / instructions..."} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 outline-none" />
                            
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold">{locale === 'ru' ? 'Компонент оценивания (формула)' : 'Grading Component'}</label>
                              <select value={newAssignment.grading_component_id} onChange={e => setNewAssignment({ ...newAssignment, grading_component_id: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                                <option value="">{locale === 'ru' ? '-- Не привязывать --' : '-- No component --'}</option>
                                {formula?.components?.map((c: any) => (
                                  <option key={c.id} value={c.id}>{c.name} (Weight: {c.weight})</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">{locale === 'ru' ? 'Макс. балл' : 'Max Score'}</label>
                                <input type="number" value={newAssignment.max_score} onChange={e => setNewAssignment({ ...newAssignment, max_score: parseFloat(e.target.value) })}
                                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">{locale === 'ru' ? 'Дедлайн' : 'Due Date'}</label>
                                <input type="datetime-local" value={newAssignment.due_date} onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">{locale === 'ru' ? 'Макс. файлов' : 'Max Files'}</label>
                                <input type="number" value={newAssignment.max_files} onChange={e => setNewAssignment({ ...newAssignment, max_files: parseInt(e.target.value) })}
                                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">{locale === 'ru' ? 'Лимит MB (на файл)' : 'Max File MB'}</label>
                                <input type="number" value={newAssignment.max_file_size_mb} onChange={e => setNewAssignment({ ...newAssignment, max_file_size_mb: parseInt(e.target.value) })}
                                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                              <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">{locale === 'ru' ? 'Форматы' : 'Formats'}</label>
                                <input type="text" value={newAssignment.allowed_formats} onChange={e => setNewAssignment({ ...newAssignment, allowed_formats: e.target.value })}
                                  placeholder="pdf,docx,jpg" className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                              </div>
                              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium mt-3 md:mt-5 cursor-pointer">
                                <input type="checkbox" checked={newAssignment.allow_late_submission} onChange={e => setNewAssignment({ ...newAssignment, allow_late_submission: e.target.checked })} 
                                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                {locale === 'ru' ? 'Разрешить сдачу после дедлайна' : 'Allow late submission'}
                              </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input type="url" value={newAssignment.file_url} onChange={e => setNewAssignment({ ...newAssignment, file_url: e.target.value })}
                                placeholder={locale === 'ru' ? "URL файла шаблона" : "Template file URL"} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                              <input type="url" value={newAssignment.link_url} onChange={e => setNewAssignment({ ...newAssignment, link_url: e.target.value })}
                                placeholder={locale === 'ru' ? "Ссылка на доп. ресурс" : "Reference link URL"} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                            </div>
                            <div className="pt-2">
                              <button type="submit" className="w-full py-2 bg-slate-900 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-slate-800 transition">
                                {locale === 'ru' ? 'Создать задание' : 'Create Assignment'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={(e) => handleAddMaterial(s.id, e)} className="space-y-3">
                            <input type="text" value={newMaterial.title_en} onChange={(e) => setNewMaterial({ ...newMaterial, title_en: e.target.value })}
                              placeholder={addingItemType === 'note' ? (locale === 'ru' ? 'Заголовок заметки' : 'Note Title') : (locale === 'ru' ? 'Название материала' : 'Material Title')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none font-medium" required />
                            
                            {addingItemType === 'document' && (
                              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-brand-300 transition bg-slate-50 relative">
                                <input type="file" onChange={(e) => e.target.files && setMaterialFile(e.target.files[0])} disabled={isUploadingMaterial}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center gap-2">
                                  {isUploadingMaterial ? (
                                    <svg className="animate-spin w-6 h-6 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  ) : (
                                    <svg className={`w-6 h-6 ${materialFile ? 'text-brand-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                                  )}
                                  <p className="text-sm font-medium text-slate-700">
                                    {materialFile ? materialFile.name : (locale === 'ru' ? 'Выберите файл для загрузки' : 'Click to select a file')}
                                  </p>
                                  {!materialFile && <p className="text-[10px] text-slate-400 font-medium">PDF, DOCX, PPTX, JPG, PNG</p>}
                                </div>
                              </div>
                            )}

                            {addingItemType === 'link' && (
                              <input type="url" value={newMaterial.external_url} onChange={(e) => setNewMaterial({ ...newMaterial, external_url: e.target.value })}
                                placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none" required />
                            )}

                            {addingItemType === 'note' && (
                              <textarea value={newMaterial.content} onChange={(e) => setNewMaterial({ ...newMaterial, content: e.target.value })}
                                placeholder={locale === 'ru' ? 'Текст вашей заметки...' : 'Write your note here...'} rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none whitespace-pre-wrap" required />
                            )}

                            <div className="pt-2">
                              <button type="submit" disabled={isUploadingMaterial || (addingItemType === 'document' && !materialFile && !newMaterial.file_url)} className="w-full py-2 bg-slate-900 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-slate-800 transition disabled:bg-slate-300">
                                {isUploadingMaterial ? (locale === 'ru' ? 'Загрузка...' : 'Uploading...') : (locale === 'ru' ? 'Сохранить' : 'Save Item')}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className="space-y-3">
          {isManager && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowAddStudent(true); setShowAddGroup(false); loadAllUsers(); }}
                className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition">
                + {locale === 'ru' ? 'Добавить студента' : 'Add Student'}
              </button>
              <button onClick={() => { setShowAddGroup(true); setShowAddStudent(false); loadGroups(); }}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                {locale === 'ru' ? 'Добавить группу' : 'Add Group'}
              </button>
            </div>
          )}

          {showAddGroup && (
            <div className="bg-white border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584m12-3.197a5.971 5.971 0 00-.941-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locale === 'ru' ? 'Записать группу в курс' : 'Enroll group to course'}
              </h4>
              {groups.length === 0 ? (
                <p className="text-xs text-slate-400">{locale === 'ru' ? 'Нет групп. Создайте группу в панели администратора.' : 'No groups. Create groups in Admin Panel.'}</p>
              ) : (
                <div className="space-y-1">
                  {groups.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between py-2 px-3 hover:bg-blue-50 rounded-lg border border-slate-100 transition">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{g.name}</span>
                        {g.year && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{g.year}</span>}
                      </div>
                      <button onClick={() => handleEnrollGroup(g.id)} disabled={enrollingGroup}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {enrollingGroup ? '...' : (locale === 'ru' ? 'Записать всех' : 'Enroll all')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowAddGroup(false)} className="mt-3 text-xs text-slate-500 hover:text-slate-700">{locale === 'ru' ? 'Закрыть' : 'Close'}</button>
            </div>
          )}

          {showAddStudent && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">{locale === 'ru' ? 'Выберите студентов:' : 'Select students to add:'}</h4>
              {availableUsers.length === 0 ? (
                <p className="text-xs text-slate-400">{locale === 'ru' ? 'Нет пользователей для добавления' : 'No more users to add'}</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {availableUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg">
                      <div>
                        <span className="text-sm text-slate-900">{u.first_name} {u.last_name}</span>
                        <span className="text-xs text-slate-400 ml-2">{u.email}</span>
                        {u.group_name && <span className="text-xs bg-blue-50 text-blue-600 ml-2 px-1.5 py-0.5 rounded">{u.group_name}</span>}
                      </div>
                      <button onClick={() => handleEnroll(u.id)} className="text-xs px-2 py-1 bg-brand-600 text-white rounded-lg">Add</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowAddStudent(false)} className="mt-2 text-xs text-slate-500">{locale === 'ru' ? 'Закрыть' : 'Close'}</button>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-xl">
            {enrollments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No students enrolled</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrollments.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{e.first_name} {e.last_name}</p>
                      <p className="text-xs text-slate-400">{e.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{e.role || 'student'}</span>
                      {isManager && (
                        <button onClick={() => handleUnenroll(e.user_id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-4">
          {isManager && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddSession(true)}
                className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition">
                + {locale === 'ru' ? 'Добавить занятие' : 'Add Session'}
              </button>
            </div>
          )}

          {showAddSession && (
            <form onSubmit={handleCreateSession} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">{locale === 'ru' ? 'Новое занятие' : 'New Session'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Дата' : 'Date'}</label>
                  <input type="date" value={newSession.date} onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Тип' : 'Type'}</label>
                  <select value={newSession.type} onChange={e => setNewSession({ ...newSession, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="lecture">{TYPE_LABELS.lecture}</option>
                    <option value="practice">{TYPE_LABELS.practice}</option>
                    <option value="lab">{TYPE_LABELS.lab}</option>
                    <option value="introduction">{TYPE_LABELS.introduction}</option>
                    <option value="custom">{TYPE_LABELS.custom}</option>
                  </select>
                </div>
              </div>
              {newSession.type === 'custom' && (
                <input type="text" value={newSession.custom_type_name} onChange={e => setNewSession({ ...newSession, custom_type_name: e.target.value })}
                  placeholder={locale === 'ru' ? 'Название типа' : 'Custom type name'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Начало' : 'Start'}</label>
                  <input type="time" value={newSession.start_time} onChange={e => setNewSession({ ...newSession, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Конец' : 'End'}</label>
                  <input type="time" value={newSession.end_time} onChange={e => setNewSession({ ...newSession, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{locale === 'ru' ? 'Аудитория' : 'Room'}</label>
                  <input type="text" value={newSession.room} onChange={e => setNewSession({ ...newSession, room: e.target.value })}
                    placeholder="A305" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg">{locale === 'ru' ? 'Создать' : 'Create'}</button>
                <button type="button" onClick={() => setShowAddSession(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg">{locale === 'ru' ? 'Отмена' : 'Cancel'}</button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h4 className="px-5 py-3 text-sm font-semibold text-slate-900 border-b border-slate-200">
              {locale === 'ru' ? 'Занятия' : 'Sessions'} ({classSessions.length})
            </h4>
            {classSessions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                {locale === 'ru' ? 'Нет запланированных занятий' : 'No sessions scheduled yet'}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Дата' : 'Date'}</th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Тип' : 'Type'}</th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Время' : 'Time'}</th>
                    <th className="px-5 py-2 text-left text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Аудитория' : 'Room'}</th>
                    <th className="px-5 py-2 text-center text-xs font-medium text-slate-500 uppercase">{locale === 'ru' ? 'Действия' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classSessions.map((s: any) => {
                    const isSelected = selectedSession?.id === s.id;
                    const typeColor = s.type === 'lecture' ? 'text-violet-700 bg-violet-50' :
                      s.type === 'practice' ? 'text-blue-700 bg-blue-50' :
                      s.type === 'lab' ? 'text-emerald-700 bg-emerald-50' :
                      s.type === 'introduction' ? 'text-yellow-700 bg-yellow-50' : 'text-slate-700 bg-slate-50';
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition cursor-pointer ${isSelected ? 'bg-brand-50' : ''}`}
                        onClick={() => selectSessionForAttendance(s)}>
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{s.date}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
                            {TYPE_LABELS[s.type] || s.custom_type_name || s.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {s.start_time?.toString().slice(0, 5)} - {s.end_time?.toString().slice(0, 5)}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">{s.room || '—'}</td>
                        <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {isManager && (
                              <button onClick={() => selectSessionForAttendance(s)}
                                className="text-xs px-2 py-1 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition font-medium">
                                {locale === 'ru' ? 'Отметить' : 'Mark attendance'}
                              </button>
                            )}
                            {isManager && (
                              <button onClick={() => handleDeleteSession(s.id)}
                                className="text-xs text-red-500 hover:text-red-700">×</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {selectedSession && (
            <div className="bg-white border border-brand-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-brand-50 border-b border-brand-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-brand-900">
                    {locale === 'ru' ? 'Отметка посещаемости' : 'Attendance Marking'}: {selectedSession.date}
                  </h4>
                  <p className="text-xs text-brand-600">
                    {TYPE_LABELS[selectedSession.type] || selectedSession.custom_type_name} | {selectedSession.start_time?.toString().slice(0, 5)} - {selectedSession.end_time?.toString().slice(0, 5)}
                  </p>
                </div>
                <button onClick={() => setSelectedSession(null)} className="text-xs text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> Close</button>
              </div>
              <div className="divide-y divide-slate-100">
                {enrollments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No students enrolled</div>
                ) : (
                  enrollments.map((e: any, i: number) => {
                    const status = attendanceMarked[e.user_id];
                    return (
                      <div key={i} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{e.first_name} {e.last_name}</p>
                          {status && <p className="text-xs text-slate-400 mt-0.5">{status}</p>}
                        </div>
                        {isManager && (
                          <div className="flex gap-1.5">
                            {['present', 'late', 'absent'].map((s) => (
                              <button key={s} onClick={() => handleMarkAttendance(e.user_id, s)}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                                  status === s ? (s === 'present' ? 'bg-green-100 border-green-300 text-green-800' : s === 'late' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-red-100 border-red-300 text-red-800') :
                                  (s === 'present' ? 'border-green-200 text-green-700 hover:bg-green-50' : s === 'late' ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50' : 'border-red-200 text-red-600 hover:bg-red-50')
                                }`}>
                                {s === 'present' ? (locale === 'ru' ? 'Присут.' : 'Present') : s === 'late' ? (locale === 'ru' ? 'Опозд.' : 'Late') : (locale === 'ru' ? 'Отсут.' : 'Absent')}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'grades' && (
        <div className="space-y-6">
          <CourseRulesSummary formula={formula} locale={locale} />
          
          {isStudent && advancedProgress?.students?.find((s: any) => s.id === user?.id) && (
            <ProgressDashboard 
              data={advancedProgress.students.find((s: any) => s.id === user?.id)} 
              thresholds={advancedProgress.thresholds} 
              locale={locale} 
            />
          )}

          {isManager && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAddGrade(true)} className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition">+ Add Grade</button>
                  <span className="text-xs text-slate-400">Weight used: <span className={`font-semibold ${usedWeight >= 100 ? 'text-green-600' : 'text-sky-600'}`}>{usedWeight}/100</span></span>
                </div>
                <button onClick={loadAdvancedProgress} className="p-2 text-slate-400 hover:text-brand-600 transition">
                  <svg className={`w-5 h-5 ${isLoadingAdvanced ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Advanced Progress Overview</h4>
                  <div className="flex gap-4 text-[10px] uppercase font-bold text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> On Track</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Summer Trimester</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3 font-bold">Student</th>
                        <th className="px-4 py-3 font-bold text-center">Attendance</th>
                        <th className="px-4 py-3 font-bold text-center">Current Score</th>
                        <th className="px-4 py-3 font-bold text-center">Max Possible</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {advancedProgress?.students?.map((s: any) => (
                        <tr key={s.id} className={`hover:bg-slate-50 transition ${s.is_summer_trimester ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{s.first_name} {s.last_name}</p>
                            <p className="text-[10px] text-slate-400">ID: {s.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-mono font-bold ${s.attendance < advancedProgress.thresholds.attendance ? 'text-red-500' : 'text-emerald-600'}`}>
                              {Math.round(s.attendance)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono font-bold text-slate-900 text-lg">{Math.round(s.current_score)}</span>
                              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500" style={{ width: `${s.current_score}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-slate-500">
                            {Math.round(s.max_possible_score)}
                          </td>
                          <td className="px-4 py-4">
                            {s.is_summer_trimester ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase w-fit">Summer</span>
                                <span className="text-[9px] text-red-400 mt-1 max-w-[150px] leading-tight">{s.summer_reason}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase w-fit">On Track</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setSelectedStudentForGrades(s.id)} className="text-brand-600 hover:text-brand-800 font-bold text-xs">Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {showAddGrade && (
            <form onSubmit={handleAddGrade} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <select value={newGrade.user_id} onChange={(e) => setNewGrade({ ...newGrade, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" required>
                <option value="">Select student</option>
                {enrollments.map((e: any) => (<option key={e.user_id} value={e.user_id}>{e.first_name} {e.last_name}</option>))}
              </select>
              <div className="grid grid-cols-4 gap-2">
                <input type="text" value={newGrade.component} onChange={(e) => setNewGrade({ ...newGrade, component: e.target.value })}
                  placeholder="Component (HW1, Exam)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                <input type="number" value={newGrade.score} onChange={(e) => setNewGrade({ ...newGrade, score: parseFloat(e.target.value) })}
                  placeholder="Score" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <input type="number" value={newGrade.max_score} onChange={(e) => setNewGrade({ ...newGrade, max_score: parseFloat(e.target.value) })}
                  placeholder="Max Score" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <div>
                  <input type="number" value={newGrade.weight} onChange={(e) => setNewGrade({ ...newGrade, weight: parseFloat(e.target.value) || 0 })}
                    placeholder="Weight" min={0} max={100} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, (newGrade.max_score > 0 ? (newGrade.score / newGrade.max_score) * 100 : 0))}%` }} />
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {newGrade.max_score > 0 ? Math.round(newGrade.score / newGrade.max_score * 100) : 0}% → earns {newGrade.max_score > 0 ? Math.round((newGrade.score / newGrade.max_score) * newGrade.weight * 100) / 100 : 0}/{newGrade.weight} pts
                </span>
              </div>
              <textarea value={newGrade.comment} onChange={(e) => setNewGrade({ ...newGrade, comment: e.target.value })}
                placeholder="Comment / Feedback (optional)" rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg">{t.common.save}</button>
                <button type="button" onClick={() => setShowAddGrade(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg">{t.common.cancel}</button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5"><svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> Student Progress</h4>
              <span className="text-xs text-slate-400">Total possible: 100 pts</span>
            </div>
            {enrollments.filter(e => e.role === 'student' || !e.role).length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No students enrolled</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrollments.filter(e => e.role === 'student' || !e.role).map((e: any) => {
                  const prog = studentProgress.find((p: any) => p.user_id === e.user_id);
                  const earned = prog?.earned || 0;
                  const totalWeight = prog?.total_weight || 0;
                  const pctOf100 = Math.round(earned);
                  return (
                    <div key={e.user_id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{e.first_name} {e.last_name}</span>
                          <button onClick={() => loadStudentSubmissions(e.user_id)}
                            className="text-[10px] px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full hover:bg-brand-100 transition font-medium">
                            View HW
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${pctOf100 >= 80 ? 'text-green-600' : pctOf100 >= 60 ? 'text-sky-600' : pctOf100 >= 1 ? 'text-red-500' : 'text-slate-300'}`}>
                            {earned}
                          </span>
                          <span className="text-sm text-slate-400">/100</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${pctOf100 >= 80 ? 'bg-green-500' : pctOf100 >= 60 ? 'bg-sky-500' : pctOf100 >= 1 ? 'bg-red-400' : 'bg-slate-200'}`}
                            style={{ width: `${Math.min(100, pctOf100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-16 text-right">wt: {totalWeight}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedStudentForGrades && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  Assignments for: {enrollments.find(e => e.user_id === selectedStudentForGrades)?.first_name} {enrollments.find(e => e.user_id === selectedStudentForGrades)?.last_name}
                </h4>
                <button onClick={() => setSelectedStudentForGrades(null)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
              </div>
              {studentAssignments.length === 0 ? (
                <p className="text-xs text-slate-400">No assignments</p>
              ) : (
                <div className="space-y-2">
                  {studentAssignments.map((sa: any, idx: number) => (
                    <div key={idx} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{sa.assignment.title_en}</p>
                          <p className="text-xs text-slate-400">Max: {sa.assignment.max_score}</p>
                        </div>
                        {sa.submission ? (
                          <div className="text-right">
                            {sa.submission.score !== null && sa.submission.score !== undefined ? (
                              <span className="text-sm font-semibold text-green-600">{sa.submission.score}/{sa.assignment.max_score}</span>
                            ) : (
                              <span className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-medium">Submitted, not graded</span>
                            )}
                            {sa.submission.is_late && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Late</span>}
                            <div className="flex flex-wrap gap-1 mt-1.5 justify-end">
                              {sa.submission.link_url && (
                                <a href={sa.submission.link_url} target="_blank" className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[10px] font-medium border border-sky-100 flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                  Link
                                </a>
                              )}
                              {sa.submission.file_urls && Array.isArray(sa.submission.file_urls) && sa.submission.file_urls.map((url: string, fidx: number) => {
                                const filename = url.split('/').pop() || `File ${fidx + 1}`;
                                return (
                                  <a key={fidx} href={url} target="_blank" className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] font-medium border border-brand-100 flex items-center gap-1" title={filename}>
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    <span className="max-w-[80px] truncate">{filename}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Not submitted</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h4 className="px-5 py-3 text-sm font-semibold text-slate-900 border-b border-slate-200">All Grades</h4>
            {grades.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No grades yet</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Component</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">%</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Weight</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Earned</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g: any, i: number) => {
                    const pct = g.max_score ? Math.round(g.score / g.max_score * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">{g.first_name} {g.last_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{g.component}</td>
                        <td className="px-4 py-3 text-center text-sm"><span className="font-medium">{g.score}</span><span className="text-slate-400">/{g.max_score}</span></td>
                        <td className={`px-4 py-3 text-center text-sm font-medium ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-sky-600' : 'text-red-600'}`}>{pct}%</td>
                        <td className="px-4 py-3 text-center text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{g.weight || 0}</span></td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-brand-700">{g.earned || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 min-w-[150px] max-w-xs">
                          {g.comment ? <ExpandableText text={g.comment} className="text-sm text-slate-500" buttonClassName="text-slate-400" locale={locale} /> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && isManager && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{locale === 'ru' ? 'Формула оценивания и пороги' : 'Grading Formula & Thresholds'}</h3>
              {!editingFormula && (
                <button onClick={handleEditFormula} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-lg hover:bg-brand-100 transition">
                  {locale === 'ru' ? 'Редактировать' : 'Edit'}
                </button>
              )}
            </div>

            {editingFormula ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">{locale === 'ru' ? 'Компоненты оценки (Midterm, Final и т.д.)' : 'Grading Components (Midterm, Final, etc.)'}</h4>
                  <div className="space-y-3">
                    {formulaForm.components.map((c: any, i: number) => (
                      <div key={i} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">ID</label>
                          <input type="text" value={c.id} onChange={(e) => {
                            const newC = [...formulaForm.components]; newC[i].id = e.target.value; setFormulaForm({...formulaForm, components: newC});
                          }} className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white" placeholder="midterm" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Name</label>
                          <input type="text" value={c.name} onChange={(e) => {
                            const newC = [...formulaForm.components]; newC[i].name = e.target.value; setFormulaForm({...formulaForm, components: newC});
                          }} className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white" placeholder="Midterm Exam" />
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Type</label>
                          <select value={c.type} onChange={(e) => {
                            const newC = [...formulaForm.components]; newC[i].type = e.target.value; setFormulaForm({...formulaForm, components: newC});
                          }} className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white">
                            <option value="midterm">Midterm</option>
                            <option value="endterm">Endterm</option>
                            <option value="final">Final Exam</option>
                            <option value="assignment">Assignment</option>
                            <option value="quiz">Quiz</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Weight (%)</label>
                          <input type="number" value={c.weight} onChange={(e) => {
                            const newC = [...formulaForm.components]; newC[i].weight = parseFloat(e.target.value); setFormulaForm({...formulaForm, components: newC});
                          }} className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white" placeholder="30" />
                        </div>
                        <button onClick={() => {
                          const newC = [...formulaForm.components]; newC.splice(i, 1); setFormulaForm({...formulaForm, components: newC});
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded transition mb-0.5">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    <button onClick={() => {
                      setFormulaForm({...formulaForm, components: [...formulaForm.components, { id: 'comp_' + Date.now(), name: 'New Component', weight: 10, type: 'assignment' }]});
                    }} className="text-sm font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1">
                      + Add Component
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">{locale === 'ru' ? 'Пороги допуска (Summer Trimester)' : 'Admission Thresholds (Summer Trimester)'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Attendance (%)</label>
                      <input type="number" min="0" max="100" value={formulaForm.attendance_threshold} onChange={(e) => setFormulaForm({...formulaForm, attendance_threshold: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <p className="text-[10px] text-slate-400 mt-1">If attendance below this after endterm, student fails automatically.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Regterm Min Score (%)</label>
                      <input type="number" min="0" max="100" value={formulaForm.regterm_threshold} onChange={(e) => setFormulaForm({...formulaForm, regterm_threshold: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <p className="text-[10px] text-slate-400 mt-1">Min average of Midterm + Endterm to avoid summer trimester.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Final Exam Min (%)</label>
                      <input type="number" min="0" max="100" value={formulaForm.final_threshold} onChange={(e) => setFormulaForm({...formulaForm, final_threshold: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <p className="text-[10px] text-slate-400 mt-1">Min score required on the final exam to pass the course.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button onClick={handleSaveFormula} className="px-5 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 transition">Save Settings</button>
                  <button onClick={() => setEditingFormula(false)} className="px-5 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200 transition">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">Components</h4>
                  {formula?.components?.length ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {formula.components.map((c: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <p className="text-sm font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">Weight: <span className="font-bold text-brand-600">{c.weight}%</span></p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No components defined.</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">Threshold Rules</h4>
                  {formula?.rules?.length ? (
                    <div className="space-y-2">
                      {formula.rules.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          <span>If <strong className="font-semibold">{r.type === 'component' ? r.component_id : r.type}</strong> is below <strong className="font-semibold text-red-600">{r.threshold}%</strong> &rarr; <span className="font-semibold text-slate-800 uppercase text-xs px-2 py-0.5 bg-slate-100 rounded">{r.action.replace('_', ' ')}</span></span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No threshold rules defined.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
