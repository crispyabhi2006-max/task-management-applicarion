# Full-Stack Task Management Web Application

A full-stack, production-ready Task Management Web Application designed with a separated **React Frontend (`client/`)** and **Node.js + Express Backend (`server/`)** communicating with a **MySQL** database (`task_management`) via `mysql2/promise`.

Includes real-time **Socket.IO** updates, **JWT authentication**, **bcrypt password hashing**, **strict user-specific task authorization**, **dashboard analytics**, and **search/filtering/sorting**.

---

## 🏗️ Project Architecture & Structure

```text
├── client/                         # React Frontend (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/             # StatusBadge, PriorityBadge, TaskModal, DeleteConfirmModal, DbHealthBadge
│   │   ├── context/                # AuthContext (JWT & session), ToastContext
│   │   ├── layouts/                # MainLayout (Sidebar, Topbar, Breadcrumbs)
│   │   ├── pages/                  # LoginPage, RegisterPage, DashboardPage, TasksPage, ProfilePage
│   │   ├── services/               # Centralized Axios API client & Socket.IO client
│   │   ├── types.ts                # TypeScript domain models & interfaces
│   │   ├── App.tsx                 # Client Router & ProtectedRoute Guards
│   │   └── main.tsx                # Client Entry Point
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Frontend dependencies & scripts
│   ├── vite.config.ts              # Vite configuration with proxy to port 5000
│   └── .env.example                # Frontend environment configuration (VITE_API_URL)
│
├── server/                         # Node.js + Express Backend
│   ├── config/
│   │   ├── db.ts                   # mysql2/promise Connection Pool & Table Verification
│   │   └── seed.ts                 # Sample demo data seeder
│   ├── controllers/
│   │   ├── authController.ts       # Registration, Login, Profile & JWT logic
│   │   └── taskController.ts       # CRUD, Aggregation Stats, Search, Filter & Sort
│   ├── middleware/
│   │   ├── auth.ts                 # JWT Bearer token authentication & user extraction
│   │   └── errorHandler.ts         # Centralized HTTP error handler (400, 401, 403, 404, 409, 500)
│   ├── routes/
│   │   ├── authRoutes.ts           # Authentication routes with express-validator
│   │   └── taskRoutes.ts           # Task routes with ownership verification
│   ├── socket/
│   │   └── index.ts                # Socket.IO real-time event dispatcher
│   ├── server.ts                   # Express app configuration & local server runner (PORT 5000)
│   ├── package.json                # Backend dependencies & scripts
│   └── .env.example                # Backend environment configuration (DB & JWT)
│
├── database/
│   └── schema.sql                  # MySQL schema definition (users, tasks)
│
├── .env.example                    # Global environment variables
└── README.md                       # Comprehensive guide & API documentation
```

---

## ⚙️ Environment Variables Guide

### Backend Configuration (`server/.env` or root `.env`)

Create a `.env` file in the `server/` directory:

```env
# Server Port
PORT=5000

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=task_management

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here
```

### Frontend Configuration (`client/.env`)

Create a `.env` file in the `client/` directory:

```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000/api
```

*(Note: Never expose MySQL credentials or `JWT_SECRET` in the frontend)*

---

## 💻 Running Locally in VS Code (Windows / Mac / Linux)

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MySQL** running locally on port `3306` with the `task_management` database created and existing `users` and `tasks` tables.

### 2. Start the Backend Server (Port 5000)
Open a terminal in VS Code:
```bash
# Navigate to the backend directory
cd server

# Install dependencies
npm install

# Start the development server
npm run dev
```
You will see:
```text
[DB-INIT] Connected to existing MySQL tables (users, tasks) successfully.
==================================================
[LOCAL-SERVER] Backend running at http://localhost:5000
[LOCAL-SERVER] MySQL Target: root@localhost:3306/task_management
[LOCAL-SERVER] Health Check: http://localhost:5000/api/health
==================================================
```

### 3. Start the Frontend Client (Port 3000)
Open a second terminal in VS Code:
```bash
# Navigate to the frontend directory
cd client

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
Visit `http://localhost:3000` in your web browser.

---

## 🔑 Demo Account Credentials

You can create your own account using the Register page or use the pre-configured sample credentials:
- **Email:** `demo@taskmanager.com`
- **Password:** `demo123456`

*(A 1-click **"Fill sample credentials"** button is available on the login page)*

---

## 📋 Features Implementation Checklist (18 Requirements)

1. **MySQL connection pool**: Configured in `server/config/db.ts` using `mysql2/promise` with connection pooling, automatic reconnection, and timezone consistency.
2. **User registration**: `POST /api/auth/register` with validation, duplicate email check, and safe user insertion.
3. **User login**: `POST /api/auth/login` validating email and comparing password hash.
4. **bcrypt password hashing**: Secure password hashing with 10 salt rounds; passwords never stored or returned in plaintext.
5. **JWT authentication**: Stateless token generation on login/registration, transmitted via `Authorization: Bearer <token>` headers.
6. **Protected routes**: Express middleware (`server/middleware/auth.ts`) guarding all task endpoints; React router guards (`ProtectedRoute`) protecting client views.
7. **Task CRUD**: Full Create, Read, Update, and Delete operations persisting directly to MySQL.
8. **User-specific task authorization**: All database queries enforce `WHERE user_id = ?`, preventing users from reading or modifying tasks belonging to other accounts.
9. **Search**: Parameterized SQL query filtering across `title`, `description`, and `category`.
10. **Filtering**: By status (`Pending`, `In Progress`, `Completed`), priority (`Low`, `Medium`, `High`), category, and due date presets (`today`, `upcoming`, `overdue`).
11. **Sorting**: Safe whitelist sorting by newest, oldest, due date, priority (high-to-low), and title.
12. **Dashboard statistics**: Computed directly in MySQL using SQL aggregation (`COUNT`, `SUM(CASE WHEN...)`) for total, pending, in-progress, completed, high-priority, and overdue metrics.
13. **Socket.IO real-time updates**: Emits `task_created`, `task_updated`, `task_status_changed`, and `task_deleted` events to synchronize views across browser windows without refreshing.
14. **Input validation**: Enforced on all inputs using `express-validator` and frontend schema validation.
15. **Error handling**: Centralized error middleware masking internal SQL exceptions and mapping standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`).
16. **CORS**: Configured with credentials and origin whitelisting in Express.
17. **Helmet**: Configured in Express for HTTP security headers.
18. **GET /api/health**: Verifies API status and active MySQL connection.

---

## 📡 REST API Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Verifies server and MySQL database connectivity |
| `POST` | `/api/auth/register` | No | Register new account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticate user and receive JWT token |
| `GET` | `/api/auth/me` | Yes | Get authenticated user profile & task count |
| `POST` | `/api/auth/logout` | No | Invalidate session |
| `GET` | `/api/tasks` | Yes | Get tasks with search, filter, sort & pagination |
| `GET` | `/api/tasks/stats` | Yes | Get MySQL aggregated dashboard counts |
| `GET` | `/api/tasks/categories` | Yes | Get distinct user categories |
| `GET` | `/api/tasks/:id` | Yes | Get single task details |
| `POST` | `/api/tasks` | Yes | Create new task |
| `PUT` | `/api/tasks/:id` | Yes | Update task details |
| `PATCH`| `/api/tasks/:id/status` | Yes | Quick toggle task status |
| `DELETE`| `/api/tasks/:id` | Yes | Delete task permanently from MySQL |
