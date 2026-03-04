CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name_en VARCHAR(200),
    display_name_ru VARCHAR(200),
    display_name_kk VARCHAR(200),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    parent_role_id UUID REFERENCES roles(id),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(200) NOT NULL UNIQUE,
    name_en VARCHAR(200),
    name_ru VARCHAR(200),
    name_kk VARCHAR(200),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(300) NOT NULL,
    name_ru VARCHAR(300),
    name_kk VARCHAR(300),
    slug VARCHAR(200) UNIQUE,
    logo_url TEXT,
    theme JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name_en VARCHAR(300) NOT NULL,
    name_ru VARCHAR(300),
    name_kk VARCHAR(300),
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name_en VARCHAR(300) NOT NULL,
    name_ru VARCHAR(300),
    name_kk VARCHAR(300),
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    year INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(50),
    role_id UUID REFERENCES roles(id),
    organization_id UUID REFERENCES organizations(id),
    faculty_id UUID REFERENCES faculties(id),
    department_id UUID REFERENCES departments(id),
    group_id UUID REFERENCES student_groups(id),
    language VARCHAR(5) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    birth_date DATE,
    iin VARCHAR(12),
    country_code VARCHAR(5) DEFAULT '+7',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    department_id UUID REFERENCES departments(id),
    title_en VARCHAR(500) NOT NULL,
    title_ru VARCHAR(500),
    title_kk VARCHAR(500),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    code VARCHAR(50),
    credits INT DEFAULT 0,
    category VARCHAR(100),
    cover_url TEXT,
    syllabus_url TEXT,
    is_published BOOLEAN DEFAULT false,
    self_enrollment BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title_en VARCHAR(300) NOT NULL,
    title_ru VARCHAR(300),
    title_kk VARCHAR(300),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    position INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    title_en VARCHAR(300) NOT NULL,
    title_ru VARCHAR(300),
    title_kk VARCHAR(300),
    type VARCHAR(50) NOT NULL,
    content TEXT,
    file_url TEXT,
    external_url TEXT,
    position INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'student',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, user_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
    title_en VARCHAR(300) NOT NULL,
    title_ru VARCHAR(300),
    title_kk VARCHAR(300),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    type VARCHAR(50) DEFAULT 'quiz',
    time_limit_minutes INT,
    max_attempts INT DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_answers BOOLEAN DEFAULT false,
    show_results VARCHAR(50) DEFAULT 'after_submit',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    text_en TEXT NOT NULL,
    text_ru TEXT,
    text_kk TEXT,
    options JSONB,
    correct_answer JSONB,
    points DECIMAL(10,2) DEFAULT 1.0,
    explanation_en TEXT,
    explanation_ru TEXT,
    explanation_kk TEXT,
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB,
    score DECIMAL(10,2),
    max_score DECIMAL(10,2),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS gpa_formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    components JSONB NOT NULL,
    rules JSONB DEFAULT '[]',
    grading_scale VARCHAR(50) DEFAULT 'percentage',
    fx_threshold DECIMAL(5,2) DEFAULT 50.0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    component VARCHAR(200) NOT NULL,
    score DECIMAL(10,2),
    max_score DECIMAL(10,2),
    comment TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grade_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    old_score DECIMAL(10,2),
    new_score DECIMAL(10,2),
    reason TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    max_absences INT DEFAULT 3,
    absence_penalty VARCHAR(50) DEFAULT 'warning',
    late_counts_as DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    marked_by UUID REFERENCES users(id),
    qr_session_id UUID,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    radius_meters INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(200),
    size_bytes BIGINT,
    bucket VARCHAR(200),
    path VARCHAR(1000),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KZT',
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    external_id VARCHAR(300),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type VARCHAR(50) DEFAULT 'lecture',
    custom_type_name VARCHAR(200),
    room VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    type VARCHAR(50) DEFAULT 'lecture',
    group_name VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
    material_id UUID REFERENCES course_materials(id) ON DELETE SET NULL,
    grading_component_id VARCHAR(100),
    title_en VARCHAR(300) NOT NULL,
    title_ru VARCHAR(300),
    title_kk VARCHAR(300),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    max_score DECIMAL(10,2) DEFAULT 100,
    file_url TEXT,
    link_url TEXT,
    allowed_formats JSONB DEFAULT '["pdf","docx","jpg","png","zip"]',
    max_file_size_mb INT DEFAULT 10,
    max_files INT DEFAULT 1,
    allow_late_submission BOOLEAN DEFAULT false,
    due_date TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_urls JSONB DEFAULT '[]',
    link_url TEXT,
    text_content TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_late BOOLEAN DEFAULT false,
    score DECIMAL(10,2),
    feedback TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id, user_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title_en VARCHAR(300) NOT NULL,
    title_ru VARCHAR(300),
    title_kk VARCHAR(300),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    title_en VARCHAR(300) NOT NULL,
    title_ru VARCHAR(300),
    title_kk VARCHAR(300),
    content_en TEXT,
    content_ru TEXT,
    content_kk TEXT,
    is_global BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name_en VARCHAR(200) NOT NULL,
    name_ru VARCHAR(200),
    name_kk VARCHAR(200),
    description_en TEXT,
    description_ru TEXT,
    description_kk TEXT,
    icon VARCHAR(100),
    xp_reward INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_grades_course_user ON grades(course_id, user_id);
CREATE INDEX idx_attendance_course_user ON attendance_records(course_id, user_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);

INSERT INTO roles (name, display_name_en, display_name_ru, display_name_kk, is_system) VALUES
('superadmin', 'Super Admin', 'Суперадмин', 'Суперадмин', true),
('rector', 'Rector / Director', 'Ректор / Директор', 'Ректор / Директор', true),
('admin', 'Administrator', 'Администратор', 'Әкімші', true),
('dean', 'Dean', 'Декан', 'Декан', true),
('head_of_department', 'Head of Department', 'Заведующий кафедрой', 'Кафедра меңгерушісі', true),
('professor', 'Professor', 'Профессор', 'Профессор', true),
('teacher', 'Teacher', 'Преподаватель', 'Оқытушы', true),
('practice_teacher', 'Practice Teacher', 'Преподаватель по практике', 'Тәжірибе оқытушысы', true),
('teaching_assistant', 'Teaching Assistant', 'Ассистент преподавателя', 'Оқытушы көмекшісі', true),
('student', 'Student', 'Студент', 'Студент', true),
('accountant', 'Accountant', 'Бухгалтер', 'Бухгалтер', true),
('curator', 'Curator', 'Куратор', 'Куратор', true),
('hr', 'HR', 'HR / Кадры', 'HR / Кадрлар', true),
('librarian', 'Librarian', 'Библиотекарь', 'Кітапханашы', true),
('guest', 'Guest', 'Гость', 'Қонақ', true),
('parent', 'Parent', 'Родитель', 'Ата-ана', true),
('external_reviewer', 'External Reviewer', 'Внешний рецензент', 'Сыртқы рецензент', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, name_en, name_ru, name_kk, category) VALUES
('course.create', 'Create Course', 'Создать курс', 'Курс құру', 'courses'),
('course.edit', 'Edit Course', 'Редактировать курс', 'Курсты өңдеу', 'courses'),
('course.delete', 'Delete Course', 'Удалить курс', 'Курсты жою', 'courses'),
('course.view', 'View Course', 'Просмотр курса', 'Курсты қарау', 'courses'),
('course.publish', 'Publish Course', 'Опубликовать курс', 'Курсты жариялау', 'courses'),
('grade.view', 'View Grades', 'Просмотр оценок', 'Бағаларды қарау', 'grades'),
('grade.edit', 'Edit Grades', 'Редактировать оценки', 'Бағаларды өңдеу', 'grades'),
('grade.export', 'Export Grades', 'Экспорт оценок', 'Бағаларды экспорттау', 'grades'),
('attendance.mark', 'Mark Attendance', 'Отметить посещаемость', 'Қатысуды белгілеу', 'attendance'),
('attendance.view', 'View Attendance', 'Просмотр посещаемости', 'Қатысуды қарау', 'attendance'),
('quiz.create', 'Create Quiz', 'Создать тест', 'Тест құру', 'assessments'),
('quiz.edit', 'Edit Quiz', 'Редактировать тест', 'Тестті өңдеу', 'assessments'),
('quiz.delete', 'Delete Quiz', 'Удалить тест', 'Тестті жою', 'assessments'),
('quiz.take', 'Take Quiz', 'Пройти тест', 'Тест тапсыру', 'assessments'),
('assignment.create', 'Create Assignment', 'Создать задание', 'Тапсырма құру', 'assessments'),
('assignment.edit', 'Edit Assignment', 'Редактировать задание', 'Тапсырманы өңдеу', 'assessments'),
('assignment.delete', 'Delete Assignment', 'Удалить задание', 'Тапсырманы жою', 'assessments'),
('user.create', 'Create User', 'Создать пользователя', 'Пайдаланушы құру', 'users'),
('user.edit', 'Edit User', 'Редактировать пользователя', 'Пайдаланушыны өңдеу', 'users'),
('user.delete', 'Delete User', 'Удалить пользователя', 'Пайдаланушыны жою', 'users'),
('user.view', 'View Users', 'Просмотр пользователей', 'Пайдаланушыларды қарау', 'users'),
('user.import', 'Import Users', 'Импорт пользователей', 'Пайдаланушыларды импорттау', 'users'),
('role.manage', 'Manage Roles', 'Управление ролями', 'Рөлдерді басқару', 'admin'),
('org.manage', 'Manage Organization', 'Управление организацией', 'Ұйымды басқару', 'admin'),
('analytics.view', 'View Analytics', 'Просмотр аналитики', 'Аналитиканы қарау', 'analytics'),
('payment.manage', 'Manage Payments', 'Управление оплатами', 'Төлемдерді басқару', 'finance'),
('notification.send', 'Send Notifications', 'Отправить уведомления', 'Хабарламалар жіберу', 'notifications'),
('media.upload', 'Upload Media', 'Загрузить файлы', 'Файлдарды жүктеу', 'media'),
('system.settings', 'System Settings', 'Настройки системы', 'Жүйе баптаулары', 'admin')
ON CONFLICT (code) DO NOTHING;

INSERT INTO organizations (name_en, name_ru, name_kk, slug) VALUES
('Astana IT University', 'Astana IT University', 'Астана IT Университеті', 'aitu')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO achievements (code, name_en, name_ru, name_kk, description_en, description_ru, description_kk, icon, xp_reward) VALUES
('first_login', 'Welcome!', 'Добро пожаловать!', 'Қош келдіңіз!', 'Logged in for the first time', 'Первый вход в систему', 'Жүйеге алғашқы кіру', 'star', 10),
('perfect_attendance', 'Perfect Attendance', '100% посещаемость', '100% қатысу', '100% attendance in a course', '100% посещаемость в курсе', 'Курста 100% қатысу', 'calendar-check', 50),
('top_student', 'Top of the Class', 'Лучший на потоке', 'Ағымдағы ең жақсы', 'Highest grade in a course', 'Лучшая оценка на курсе', 'Курстағы ең жоғары баға', 'trophy', 100),
('streak_7', '7-Day Streak', '7-дневный стрик', '7 күндік стрик', 'Active for 7 consecutive days', 'Активность 7 дней подряд', '7 күн қатарынан белсенділік', 'fire', 30),
('assignment_early', 'Early Bird', 'Ранняя пташка', 'Ерте қоңырау', 'Submitted assignment before deadline', 'Сдача задания раньше дедлайна', 'Тапсырманы мерзімінен бұрын тапсыру', 'clock', 20),
('quiz_master', 'Quiz Master', 'Мастер тестов', 'Тест шебері', 'Scored 100% on 5 quizzes', '100% на 5 тестах', '5 тестте 100%', 'award', 75)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'rector'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.code IN (
  'user.create','user.edit','user.delete','user.view','user.import',
  'role.manage','org.manage','system.settings',
  'course.create','course.edit','course.delete','course.view','course.publish',
  'grade.view','grade.edit','grade.export',
  'attendance.mark','attendance.view',
  'quiz.create','quiz.edit','quiz.delete','quiz.take',
  'notification.send','media.upload','analytics.view','payment.manage'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'dean' AND p.code IN (
  'course.view','grade.view','grade.export',
  'attendance.view','analytics.view','user.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'head_of_department' AND p.code IN (
  'course.view','course.edit','grade.view','grade.export',
  'attendance.view','analytics.view','user.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'professor' AND p.code IN (
  'course.create','course.edit','course.publish','course.view',
  'grade.view','grade.edit','grade.export',
  'attendance.mark','attendance.view',
  'quiz.create','quiz.edit','quiz.delete',
  'notification.send','media.upload'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.code IN (
  'course.create','course.edit','course.publish','course.view',
  'grade.view','grade.edit','grade.export',
  'attendance.mark','attendance.view',
  'quiz.create','quiz.edit','quiz.delete',
  'notification.send','media.upload'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'practice_teacher' AND p.code IN (
  'course.view','grade.view','grade.edit',
  'attendance.mark','attendance.view',
  'quiz.create','quiz.edit'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'teaching_assistant' AND p.code IN (
  'course.view','grade.view','grade.edit',
  'attendance.view','quiz.edit'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.code IN (
  'course.view','grade.view','attendance.view','quiz.take'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'accountant' AND p.code IN (
  'payment.manage','analytics.view','user.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'curator' AND p.code IN (
  'course.view','grade.view','attendance.view',
  'notification.send','analytics.view','user.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr' AND p.code IN (
  'user.create','user.edit','user.view','user.import','analytics.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'librarian' AND p.code IN (
  'media.upload','course.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'guest' AND p.code IN ('course.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'parent' AND p.code IN ('grade.view','attendance.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'external_reviewer' AND p.code IN ('course.view','grade.view')
ON CONFLICT DO NOTHING;
