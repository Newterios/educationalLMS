const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private getAuthHeader(): HeadersInit {
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async put<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async uploadFile(path: string, file: File, extraFields?: Record<string, string>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (extraFields) {
      Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload error: ${res.status}`);
    return res.json();
  }
}

export const api = new ApiClient(API_BASE);

export const authApi = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  register: (data: { email: string; password: string; first_name: string; last_name: string }) =>
    api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
  refresh: (refresh_token: string) => api.post('/api/auth/refresh', { refresh_token }),
  logout: () => api.post('/api/auth/logout'),
};

export const courseApi = {
  list: (userId?: string) => api.get<{ courses: any[] }>(`/api/courses/courses${userId ? '?user_id=' + userId : ''}`),
  get: (id: string, userId?: string) => api.get(`/api/courses/courses/${id}${userId ? '?user_id=' + userId : ''}`),
  create: (data: any) => api.post('/api/courses/courses', data),
  update: (id: string, data: any) => api.put(`/api/courses/courses/${id}`, data),
  delete: (id: string) => api.delete(`/api/courses/courses/${id}`),
  sections: (id: string) => api.get<{ sections: any[] }>(`/api/courses/courses/${id}/sections`),
  createSection: (courseId: string, data: any) => api.post(`/api/courses/courses/${courseId}/sections`, data),
  updateSection: (id: string, data: any) => api.put(`/api/courses/sections/${id}`, data),
  deleteSection: (id: string) => api.delete(`/api/courses/sections/${id}`),
  materials: (sectionId: string) => api.get<{ materials: any[] }>(`/api/courses/sections/${sectionId}/materials`),
  createMaterial: (sectionId: string, data: any) => api.post(`/api/courses/sections/${sectionId}/materials`, data),
  deleteMaterial: (id: string) => api.delete(`/api/courses/materials/${id}`),
  enrollments: (id: string) => api.get<{ enrollments: any[] }>(`/api/courses/courses/${id}/enrollments`),
  enroll: (courseId: string, userId: string, role?: string) => api.post(`/api/courses/courses/${courseId}/enroll`, { user_id: userId, role: role || 'student' }),
  unenroll: (courseId: string, userId: string) => api.delete(`/api/courses/courses/${courseId}/enroll/${userId}`),
};

export const gradeApi = {
  gradebook: (courseId: string) => api.get(`/api/assessments/grades/course/${courseId}`),
  progress: (courseId: string) => api.get(`/api/assessments/grades/progress/${courseId}`),
  advancedProgress: (courseId: string) => api.get(`/api/assessments/grades/advanced-progress/${courseId}`),
  create: (data: any) => api.post('/api/assessments/grades', data),
  update: (id: string, data: any) => api.put(`/api/assessments/grades/${id}`, data),
};

export const formulaApi = {
  get: (courseId: string) => api.get(`/api/assessments/gpa-formula/course/${courseId}`),
  create: (data: any) => api.post('/api/assessments/gpa-formula', data),
  update: (id: string, data: any) => api.put(`/api/assessments/gpa-formula/${id}`, data),
};

export const attendanceApi = {
  course: (courseId: string, date?: string) => api.get(`/api/attendance/course/${courseId}${date ? '?date=' + date : ''}`),
  mark: (data: { course_id: string; user_id: string; status: string; date?: string; marked_by?: string }) => api.post('/api/attendance/mark', data),
  stats: (courseId: string) => api.get(`/api/attendance/stats/${courseId}`),
};

export const mediaApi = {
  upload: (file: File, userId?: string) => api.uploadFile('/api/media/upload', file, userId ? { uploaded_by: userId } : undefined),
  getFileUrl: (id: string) => `${API_BASE}/api/media/files/${id}/download`,
};

export const analyticsApi = {
  overview: () => api.get('/api/analytics/dashboard/overview'),
};

export const userApi = {
  list: (filters?: { role?: string; group_id?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.group_id) params.set('group_id', filters.group_id);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return api.get<{ users: any[] }>(`/api/users/users${qs ? '?' + qs : ''}`);
  },
  get: (id: string) => api.get(`/api/users/users/${id}`),
  roles: () => api.get<{ roles: any[] }>('/api/users/roles'),
  updateRole: (userId: string, roleName: string) => api.put(`/api/users/users/${userId}/role`, { role_name: roleName }),
  groups: () => api.get<{ groups: any[] }>('/api/users/groups'),
  createGroup: (data: { name: string; department_id?: string; year?: number }) => api.post('/api/users/groups', data),
  deleteGroup: (id: string) => api.delete(`/api/users/groups/${id}`),
  setUserGroup: (userId: string, groupId: string | null) => api.put(`/api/users/users/${userId}/group`, { group_id: groupId }),
  search: (query: string) => api.get<{ users: any[] }>(`/api/users/users?search=${query}`),
  updateProfile: (userId: string, data: any) => api.put(`/api/users/profile/${userId}`, data),
  uploadAvatar: (userId: string, file: File) => api.uploadFile('/api/media/upload', file, { uploaded_by: userId }),
  listPermissions: () => api.get<{ permissions: any[] }>('/api/users/permissions'),
  getRolePermissions: (roleId: string) => api.get<{ permissions: any[] }>(`/api/users/roles/${roleId}/permissions`),
  updateRolePermissions: (roleId: string, permissionIds: string[]) => api.put(`/api/users/roles/${roleId}/permissions`, { permission_ids: permissionIds }),
};

export const notificationApi = {
  list: (userId: string) => api.get<{ notifications: any[]; unread_count: number }>(`/api/notifications/notifications?user_id=${userId}`),
  markRead: (id: string) => api.put(`/api/notifications/notifications/${id}/read`),
  markAllRead: (userId: string) => api.put('/api/notifications/notifications/read-all', { user_id: userId }),
  delete: (id: string) => api.delete(`/api/notifications/notifications/${id}`),
  create: (data: { user_id: string; type: string; title_en?: string; title_ru?: string; title_kk?: string; message_en?: string; message_ru?: string; message_kk?: string; data?: any }) =>
    api.post('/api/notifications/notifications', data),
  createBulk: (data: { user_ids: string[]; type: string; title_en?: string; title_ru?: string; message_en?: string; message_ru?: string }) =>
    api.post('/api/notifications/notifications/bulk', data),
};

export const newsApi = {
  list: () => api.get<{ news: any[]; total: number }>('/api/notifications/news'),
  create: (data: { title_en?: string; title_ru?: string; title_kk?: string; content_en?: string; content_ru?: string; content_kk?: string; author_id: string; author_name: string; pinned?: boolean }) =>
    api.post('/api/notifications/news', data),
  delete: (id: string) => api.delete(`/api/notifications/news/${id}`),
};

export const scheduleApi = {
  list: (courseId?: string) => api.get<{ schedule: any[] }>(`/api/courses/schedule${courseId ? '?course_id=' + courseId : ''}`),
  create: (data: any) => api.post('/api/courses/schedule', data),
  update: (id: string, data: any) => api.put(`/api/courses/schedule/${id}`, data),
  delete: (id: string) => api.delete(`/api/courses/schedule/${id}`),
  user: (userId: string) => api.get<{ schedule: any[] }>(`/api/courses/schedule/user/${userId}`),
};

export const assignmentApi = {
  list: (courseId?: string) => api.get<{ assignments: any[] }>(`/api/assessments/assignments${courseId ? '?course_id=' + courseId : ''}`),
  get: (id: string) => api.get(`/api/assessments/assignments/${id}`),
  create: (data: any) => api.post('/api/assessments/assignments', data),
  update: (id: string, data: any) => api.put(`/api/assessments/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/api/assessments/assignments/${id}`),
  submit: (id: string, data: any) => api.post(`/api/assessments/assignments/${id}/submit`, data),
  submissions: (id: string) => api.get<{ submissions: any[] }>(`/api/assessments/assignments/${id}/submissions`),
  deleteSubmission: (id: string, userId: string) => api.delete(`/api/assessments/assignments/${id}/submissions?user_id=${userId}`),
  gradeSubmission: (id: string, data: any) => api.put(`/api/assessments/submissions/${id}/grade`, data),
};

export const sessionApi = {
  list: (courseId?: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return api.get<{ sessions: any[] }>(`/api/courses/sessions${qs ? '?' + qs : ''}`);
  },
  create: (data: any) => api.post('/api/courses/sessions', data),
  delete: (id: string) => api.delete(`/api/courses/sessions/${id}`),
  user: (userId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return api.get<{ sessions: any[] }>(`/api/courses/sessions/user/${userId}${qs ? '?' + qs : ''}`);
  },
};
