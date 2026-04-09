# EDULMS — Education Learning Management System (aitbek.tech)

A full-featured learning management platform built with microservices architecture, designed for universities and educational institutions. Supports three languages: English, Russian, and Kazakh.

## Features

- **Course Management** — create courses with sections, materials, syllabus, and enrollment control
- **Grading System** — configurable weighted grading formulas, GPA calculation, gradebook, grade export
- **Attendance Tracking** — mark and view attendance by course and date
- **Assessments** — assignments, submissions, quizzes with time limits and randomized questions
- **Schedule** — weekly calendar view with recurring and one-time class sessions
- **Notifications** — in-app, email, and real-time push notifications via WebSocket
- **News & Announcements** — institutional news feed with role-based publishing
- **Analytics Dashboard** — faculty/department performance reports
- **Media Management** — file uploads (PDFs, videos, images) via S3-compatible storage
- **Admin Panel** — user management, role assignment, permission control, organization settings
- **RBAC** — 17 built-in roles with granular permission codes, custom role creation
- **Multilingual UI** — English / Russian / Kazakh (i18n)
- **Responsive Design** — mobile, tablet, desktop

---

## Architecture

```
Browser (Next.js)
       │
  Nginx Gateway :8080
       │
  ┌────┴──────────────────────────────────────┐
  │                                           │
auth-service  user-service  course-service  assessment-service
  :8001          :8002         :8003              :8004
                                 │
                     attendance  notification  media
                       :8005       :8006       :8007
                                 │
                     analytics   ai-service  payment-service
                       :8008       :8009        :8010
       │
PostgreSQL · MongoDB · Redis · MinIO · Kafka
```

All services communicate through the Nginx gateway at `/api/*`. The frontend runs on port 3000 and proxies API calls through the gateway.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query |
| Backend (9 services) | Go 1.22, Gin framework |
| Backend (1 service) | Node.js, Express, Socket.io |
| Backend (1 service) | Python, FastAPI |
| Primary Database | PostgreSQL 16 |
| Document Store | MongoDB 7 |
| Cache / Sessions | Redis 7 |
| File Storage | MinIO (S3-compatible) |
| Message Queue | Apache Kafka |
| Gateway | Nginx |
| Containers | Docker, Docker Compose |

---

## Roles

| Role | Key Permissions |
|---|---|
| SuperAdmin / Rector | All permissions |
| Admin | User management, roles, courses, grades, system settings |
| Dean | View courses, grades export, analytics |
| Head of Department | Edit courses, grades, attendance, analytics |
| Professor / Teacher | Create and manage courses, grade, mark attendance, create quizzes |
| Practice Teacher | View courses, grade labs, mark attendance |
| Teaching Assistant | View courses, assist grading |
| Student | View courses, view own grades, take quizzes |
| Curator | Monitor group, send notifications |
| Accountant | Payment management, analytics |
| HR | User management, analytics |
| Librarian | Upload materials, view courses |
| Guest | View public courses |
| Parent | View child grades and attendance |
| External Reviewer | View courses and grades |

---

## Project Structure

```
diplom/
├── web/                      # Next.js 14 frontend
│   └── src/
│       ├── app/              # Pages (App Router)
│       ├── lib/              # API client, state store, utilities
│       └── i18n/             # EN / RU / KK translations
├── services/
│   ├── auth-service/         # JWT auth, sessions (Go)
│   ├── user-service/         # Users, roles, groups (Go)
│   ├── course-service/       # Courses, sections, schedule (Go)
│   ├── assessment-service/   # Grades, assignments, quizzes (Go)
│   ├── attendance-service/   # Attendance records (Go)
│   ├── notification-service/ # Email + WebSocket notifications (Node.js)
│   ├── media-service/        # File uploads via MinIO (Go)
│   ├── analytics-service/    # Reports and dashboards (Go)
│   ├── ai-service/           # AI text analysis (Python/FastAPI)
│   └── payment-service/      # Payment transactions (Go)
├── gateway/                  # Nginx reverse proxy config
├── migrations/               # PostgreSQL schema and seed data
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development compose
├── Makefile                  # Build and management commands
└── .env.example              # Environment variable template
```

---

## Getting Started

### Prerequisites

- Docker 24+ and Docker Compose v2
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Newterios/educationalLMS.git
cd educationalLMS
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
JWT_SECRET=your-secret-key-here
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Start all services

```bash
docker compose up -d --build
```

This starts 16 containers: frontend, 10 microservices, PostgreSQL, MongoDB, Redis, MinIO, Kafka, Nginx.

### 4. Run database migrations

```bash
docker exec -i $(docker ps -qf name=postgres) psql -U edulms -d edulms < migrations/init.sql
docker exec -i $(docker ps -qf name=postgres) psql -U edulms -d edulms < migrations/grading_thresholds.sql
docker exec -i $(docker ps -qf name=postgres) psql -U edulms -d edulms < migrations/seed_permissions.sql
```

### 5. Access the application

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080 |
| MinIO Console | http://localhost:9001 |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_HOST` | PostgreSQL host | `postgres` |
| `POSTGRES_USER` | PostgreSQL user | `edulms` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `edulms_secret` |
| `POSTGRES_DB` | Database name | `edulms` |
| `MONGO_HOST` | MongoDB host | `mongo` |
| `REDIS_HOST` | Redis host | `redis` |
| `MINIO_ENDPOINT` | MinIO endpoint | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `edulms_minio` |
| `MINIO_SECRET_KEY` | MinIO secret key | `edulms_minio_secret` |
| `JWT_SECRET` | JWT signing secret | **change in production** |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `168h` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP email address | — |
| `SMTP_PASSWORD` | SMTP app password | — |

---

## Makefile Commands

```bash
make dev      # Start development stack
make prod     # Start production stack
make down     # Stop all containers
make build    # Build images without starting
make logs     # Follow container logs
make clean    # Stop containers and remove volumes
```

---

## API Services

| Service | Port | Base Path |
|---|---|---|
| Auth | 8001 | `/api/auth/` |
| Users | 8002 | `/api/users/` |
| Courses | 8003 | `/api/courses/` |
| Assessment | 8004 | `/api/assessments/` |
| Attendance | 8005 | `/api/attendance/` |
| Notifications | 8006 | `/api/notifications/` |
| Media | 8007 | `/api/media/` |
| Analytics | 8008 | `/api/analytics/` |
| AI | 8009 | `/api/ai/` |
| Payments | 8010 | `/api/payments/` |

All routes are accessed through the gateway at `http://localhost:8080`.

---

## Authentication

The platform uses JWT-based authentication:

- Access token — 15 minute TTL, sent in `Authorization: Bearer <token>` header
- Refresh token — 7 day TTL, used to obtain new access tokens
- Sessions are tracked in Redis with a 30-minute inactivity timeout
- A session expiry modal prompts the user to extend the session before automatic logout

---

## Database Schema

The PostgreSQL schema is defined in `migrations/init.sql` and includes:

- `users`, `sessions` — authentication and user profiles
- `roles`, `permissions`, `role_permissions` — RBAC system
- `organizations`, `faculties`, `departments`, `student_groups` — institutional hierarchy
- `courses`, `course_sections`, `course_materials`, `enrollments` — course content
- `quizzes`, `quiz_questions`, `quiz_answers` — quiz engine
- `assignments`, `assignment_submissions` — homework system
- `grades`, `gpa_formulas` — grading with configurable weighted formulas
- `attendance_records` — per-student per-session attendance
- `course_schedule`, `class_sessions` — recurring and dated schedule entries

All primary keys use UUID. Multilingual fields follow the pattern `field_en`, `field_ru`, `field_kk`.

---

## Development Notes

- The frontend uses Next.js App Router with client components
- Global state is managed with Zustand (`src/lib/store.ts`)
- All API calls are centralized in `src/lib/api.ts`
- Go services follow a standard `cmd/main.go` + `internal/{config,handler,repository,service}` layout
- Each service has its own Dockerfile with multi-stage builds
- Health check endpoints at `GET /health` on each service
