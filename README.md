# LMS Pro - Learning Management System

A professional, high-quality Learning Management System built with **Next.js 14 (App Router)** and **Supabase**.

## 🚀 Features

### Phase 1 - Student Module (COMPLETED ✅)

- **Authentication System**
  - Student signup with validation
  - Role-based login (fetches role from database)
  - JWT-based session management
  - Protected routes with middleware

- **Student Dashboard**
  - Overview of enrolled courses
  - Learning statistics and progress tracking
  - Interactive stat cards with animations
  - Continue learning section

- **Course Browser**
  - Grid view of available courses
  - Search functionality
  - Filter by level (Beginner/Intermediate/Advanced)
  - Filter by category
  - Professional course cards with hover effects

- **Student Profile**
  - View profile information
  - Learning statistics
  - Member since date
  - Course completion tracking

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Styling**: Tailwind CSS + Custom CSS Animations
- **Icons**: Lucide React
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git

## 🔧 Setup Instructions

### 1. Clone or Setup Project

If you're in the project directory already, skip to step 2.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and API keys

### 4. Set Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_random_jwt_secret_key
```

### 5. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `supabase/schema.sql`
4. (Optional) Run `supabase/seed.sql` for sample data

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
LMS/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── courses/       # Course management
│   │   └── student/       # Student-specific APIs
│   ├── login/             # Login page
│   ├── signup/            # Signup page (students only)
│   ├── student/           # Student dashboard & pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── lib/
│   ├── supabase/         # Supabase client configs
│   ├── auth.ts           # Auth utilities
│   ├── jwt.ts            # JWT utilities
│   └── types.ts          # TypeScript types
├── supabase/
│   ├── schema.sql        # Database schema
│   └── seed.sql          # Sample data
├── middleware.ts         # Route protection
└── package.json
```

## 🎨 UI Features

- **Glassmorphism effects** on cards
- **Gradient backgrounds** and buttons
- **Smooth animations** (fade-in, slide-up, scale-in, float)
- **Hover effects** on interactive elements
- **Dark mode ready** (class-based)
- **Fully responsive** design
- **Professional color scheme** with primary/accent colors

## 🔐 Authentication Flow

1. **Signup (Students Only)**
   - Create account with email/password
   - User added to Supabase Auth
   - Profile created with STUDENT role
   - Auto-login after signup

2. **Login (All Users)**
   - Email/password authentication
   - Role fetched from database
   - JWT token generated
   - Redirected based on role

3. **Route Protection**
   - Middleware checks auth status
   - Redirects unauthenticated users
   - Role-based access control
   - Server-side session validation

## 👥 User Roles

- **STUDENT**: Access student dashboard, courses, and profile
- **INSTRUCTOR**: Manage courses and view student progress (Phase 2)
- **ADMIN**: Manage instructors and monitor system (Phase 2)
- **SUPERADMIN**: Full system access, create admins/instructors (Phase 2)

## 🗄️ Database Schema

### Tables

1. **users** - User profiles with roles
2. **courses** - Course information
3. **enrollments** - Student-course relationships
4. **modules** - Course modules
5. **lessons** - Module lessons
6. **progress** - Student progress tracking

See `supabase/schema.sql` for complete schema with RLS policies.

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new student
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - Get all published courses
- `GET /api/courses?level=BEGINNER` - Filter by level
- `GET /api/courses?category=Web Development` - Filter by category

### Student
- `GET /api/student/enrollments` - Get student enrollments

## 🚧 Upcoming Features (Phase 2+)

- Instructor dashboard and course creation
- Admin panel for user management
- Course enrollment functionality
- Video lessons and progress tracking
- Quizzes and assignments
- Certificates on completion
- Discussion forums
- Real-time notifications

## 🐛 Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys in `.env.local`
- Check if RLS policies are enabled
- Ensure database schema is applied

### Authentication Errors
- Clear browser cookies
- Check JWT_SECRET is set
- Verify Supabase Auth is enabled

### Build Errors
- Delete `.next` folder and rebuild
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

Phase 1 is complete. Future phases will add more features!

---

Built with ❤️ using Next.js 14 and Supabase
