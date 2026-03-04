import { create } from 'zustand';
import { Locale } from '@/i18n';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  role?: string;
  avatar_url?: string;
  phone?: string;
  country_code?: string;
  birth_date?: string;
  iin?: string;
  group_id?: string;
  group_name?: string;
  permissions?: string[];
  language: string;
  theme: string;
}

const ADMIN_ROLES = ['superadmin', 'rector', 'admin'];
const TEACHER_ROLES = ['professor', 'teacher', 'practice_teacher'];
const COURSE_MANAGER_ROLES = ['superadmin', 'rector', 'admin', 'professor', 'teacher', 'head_of_department'];
const GRADE_EDITOR_ROLES = ['superadmin', 'rector', 'admin', 'professor', 'teacher', 'practice_teacher', 'teaching_assistant'];
const ATTENDANCE_MARKER_ROLES = ['superadmin', 'rector', 'admin', 'professor', 'teacher', 'practice_teacher'];
const ANALYTICS_ROLES = ['superadmin', 'rector', 'admin', 'dean', 'head_of_department', 'curator', 'accountant', 'hr'];
const NOTIFICATION_SENDER_ROLES = ['superadmin', 'rector', 'admin', 'professor', 'teacher', 'curator'];
const USER_MANAGER_ROLES = ['superadmin', 'rector', 'admin', 'hr'];
const FINANCE_ROLES = ['superadmin', 'admin', 'accountant'];

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  locale: Locale;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  mounted: boolean;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  logout: () => void;
  hydrate: () => void;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  canManageCourse: () => boolean;
  canEditGrades: () => boolean;
  canMarkAttendance: () => boolean;
  canViewAnalytics: () => boolean;
  canSendNotifications: () => boolean;
  canManageUsers: () => boolean;
  canManagePayments: () => boolean;
  isStudent: () => boolean;
  isCurator: () => boolean;
  isDean: () => boolean;
  hasPermission: (code: string) => boolean;
  getRoleName: () => string;
}

export const useStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  locale: 'en',
  theme: 'light',
  sidebarOpen: true,
  mounted: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const locale = (localStorage.getItem('locale') as Locale) || 'en';
    const theme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    const userStr = localStorage.getItem('user');
    let user: User | null = null;
    if (userStr) { try { user = JSON.parse(userStr); } catch {} }
    set({
      accessToken, refreshToken, locale, theme, user,
      isAuthenticated: !!accessToken,
      mounted: true,
    });
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');
    }
    set({ user, isAuthenticated: !!user });
  },

  setTokens: (access, refresh) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setLocale: (locale) => {
    if (typeof window !== 'undefined') localStorage.setItem('locale', locale);
    set({ locale });
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') localStorage.setItem('theme', theme);
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  getRoleName: () => get().user?.role_name?.toLowerCase() || '',

  isAdmin: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return ADMIN_ROLES.includes(role);
  },

  isTeacher: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return TEACHER_ROLES.includes(role) || ADMIN_ROLES.includes(role);
  },

  canManageCourse: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return COURSE_MANAGER_ROLES.includes(role);
  },

  canEditGrades: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return GRADE_EDITOR_ROLES.includes(role);
  },

  canMarkAttendance: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return ATTENDANCE_MARKER_ROLES.includes(role);
  },

  canViewAnalytics: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return ANALYTICS_ROLES.includes(role);
  },

  canSendNotifications: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return NOTIFICATION_SENDER_ROLES.includes(role);
  },

  canManageUsers: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return USER_MANAGER_ROLES.includes(role);
  },

  canManagePayments: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return FINANCE_ROLES.includes(role);
  },

  isStudent: () => (get().user?.role_name?.toLowerCase() || '') === 'student',

  isCurator: () => (get().user?.role_name?.toLowerCase() || '') === 'curator',

  isDean: () => {
    const role = get().user?.role_name?.toLowerCase() || '';
    return role === 'dean' || role === 'head_of_department';
  },

  hasPermission: (code: string) => {
    const perms = get().user?.permissions || [];
    return perms.includes(code);
  },
}));
