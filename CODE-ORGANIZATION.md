# LMS Code Organization Guide

## Your Code IS Already Organized! 📁

This document explains how to navigate your LMS codebase. Even though frontend and backend code are in the same project, they are **logically separated** and easy to find.

## Quick Reference

### 🎨 Need to Edit Frontend/UI?
Look in:
- `app/**/page.tsx` - Pages (Dashboard, Login, etc.)
- `components/` - Reusable UI components (Navbar, Cards, etc.)
- UI styling is in Tailwind CSS classes

### 🔧 Need to Edit Backend/API?
Look in:
- `app/api/` - All API endpoints
- `lib/db.ts` - Database connection
- `lib/auth.ts` - Authentication logic

## Detailed Code Map

### FRONTEND CODE (Runs in Browser)

#### 1. Pages - `app/`
```
app/
├── page.tsx                    ← Homepage (login/signup)
├── student/
│   ├── dashboard/
│   │   └── page.tsx           ← Student dashboard UI
│   ├── courses/
│   │   └── page.tsx           ← Student courses list
│   └── layout.tsx             ← Student layout wrapper
│
├── instructor/
│   ├── dashboard/
│   │   └── page.tsx           ← Instructor dashboard UI
│   └── layout.tsx             ← Instructor layout wrapper
│
└── admin/
    ├── dashboard/
    │   └── page.tsx           ← Admin dashboard UI
    └── layout.tsx             ← Admin layout wrapper
```

**What each page does:**
- **page.tsx**: Renders the UI, handles user interactions
- **layout.tsx**: Wraps pages with navigation, authentication checks
- All pages fetch data from the backend (app/api)

#### 2. Components - `components/`
```
components/
├── Navbar.tsx                 ← Navigation header
├── CourseCard.tsx             ← Course display card
└── [future components]        ← Add more as needed
```

**Usage:**
```typescript
import Navbar from '@/components/Navbar'

export default function Page() {
  return <Navbar userRole="STUDENT" userName="Mike" />
}
```

#### 3. Static Assets - `public/`
```
public/
├── images/                    ← Images, logos
├── fonts/                     ← Custom fonts
└── favicon.ico                ← Site icon
```

### BACKEND CODE (Runs on Server)

#### 1. API Routes - `app/api/`
```
app/api/
├── auth/
│   ├── login/
│   │   └── route.ts          ← POST /api/auth/login
│   └── signup/
│       └── route.ts          ← POST /api/auth/signup
│
├── student/
│   ├── dashboard/
│   │   └── route.ts          ← GET /api/student/dashboard
│   └── enrollments/
│       └── route.ts          ← GET /api/student/enrollments
│
├── instructor/
│   └── dashboard/
│       └── route.ts          ← GET /api/instructor/dashboard
│
├── admin/
│   └── dashboard/
│       └── route.ts          ← GET /api/admin/dashboard
│
└── courses/
    └── route.ts              ← GET/POST /api/courses
```

**Each route.ts exports:**
```typescript
export async function GET(request: Request) {
  // Handle GET requests
}

export async function POST(request: Request) {
  // Handle POST requests
}
```

#### 2. Database Layer - `lib/`
```
lib/
├── db.ts                     ← PostgreSQL connection pool
├── auth.ts                   ← Authentication middleware
└── auth-utils.ts             ← Password hashing, user queries
```

**Responsibilities:**
- **db.ts**: Connects to Neon PostgreSQL, exports query helpers
- **auth.ts**: Validates JWT tokens, protects routes
- **auth-utils.ts**: Password hashing, user CRUD operations

#### 3. Database Schema - Root Files
```
├── neon-schema.sql           ← Database table definitions
├── setup-db.js               ← Script to create tables
└── create-all-users.js       ← Script to create test users
```

### CONFIGURATION FILES

```
├── .env.local                ← Environment variables (secrets)
├── next.config.ts            ← Next.js configuration
├── tailwind.config.ts        ← Tailwind CSS configuration
├── tsconfig.json             ← TypeScript configuration
└── package.json              ← Dependencies and scripts
```

## How to Find Code Quickly

### Scenario 1: "I want to change the student dashboard design"

**Steps:**
1. Go to `app/student/dashboard/page.tsx` (Frontend)
2. Edit the JSX/HTML structure
3. Modify Tailwind CSS classes for styling

### Scenario 2: "I want to add a new field to user login"

**Steps:**
1. Update database: Add column to `users` table in `neon-schema.sql`
2. Backend: Modify `app/api/auth/login/route.ts` to handle new field
3. Frontend: Update `app/page.tsx` (login form) to accept new field

### Scenario 3: "I want to create a new API endpoint"

**Steps:**
1. Create `app/api/your-endpoint/route.ts` (Backend)
2. Export `GET`, `POST`, etc. functions
3. Use `query()` from `lib/db.ts` to fetch data
4. Call from frontend: `fetch('/api/your-endpoint')`

### Scenario 4: "I want to add a new page"

**Steps:**
1. Create `app/your-page/page.tsx` (Frontend)
2. Define layout if needed: `app/your-page/layout.tsx`
3. Link to it: `<Link href="/your-page">Go</Link>`

## Common Development Tasks

### Adding a New Feature

**Example: Add "My Certificates" page for students**

1. **Create API endpoint** (Backend):
```typescript
// app/api/student/certificates/route.ts
import { query } from '@/lib/db'

export async function GET(request: Request) {
  // Fetch certificates from database
  const certificates = await query(
    'SELECT * FROM certificates WHERE user_id = $1',
    [userId]
  )
  return Response.json({ certificates })
}
```

2. **Create page** (Frontend):
```typescript
// app/student/certificates/page.tsx
'use client'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([])
  
  useEffect(() => {
    fetch('/api/student/certificates')
      .then(res => res.json())
      .then(data => setCertificates(data.certificates))
  }, [])
  
  return (
    <div>
      <h1>My Certificates</h1>
      {certificates.map(cert => (
        <div key={cert.id}>{cert.name}</div>
      ))}
    </div>
  )
}
```

3. **Add to navigation** (Frontend):
```typescript
// components/Navbar.tsx
const studentLinks = [
  { href: '/student/dashboard', label: 'Dashboard' },
  { href: '/student/courses', label: 'Courses' },
  { href: '/student/certificates', label: 'Certificates' }, // NEW
]
```

### Debugging Issues

**Frontend issue (UI not updating):**
- Check browser console (F12)
- Look in `app/**/page.tsx` files
- Verify API calls with Network tab

**Backend issue (API returning error):**
- Check terminal output (where `npm run dev` runs)
- Look in `app/api/**/route.ts` files
- Test database queries in `lib/db.ts`

**Database issue:**
- Check `neon-schema.sql` for table structure
- Test queries with `node` REPL:
```bash
node
> const { query } = require('./lib/db.ts')
> query('SELECT * FROM users LIMIT 1')
```

## File Naming Conventions

### Next.js Special Files
- `page.tsx` - Defines a route/page
- `layout.tsx` - Wraps pages with common UI
- `route.ts` - API endpoint (backend)
- `loading.tsx` - Loading state
- `error.tsx` - Error boundary

### Our Custom Files
- `ComponentName.tsx` - React components (PascalCase)
- `utility-name.ts` - Utility functions (kebab-case)
- `setup-*.js` - Setup scripts (kebab-case)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                   BROWSER                       │
│  ┌──────────────────────────────────────────┐  │
│  │  app/student/dashboard/page.tsx          │  │
│  │  (Frontend - React Component)            │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼──────────────────────────────┘
                  │ fetch('/api/student/dashboard')
                  ▼
┌─────────────────────────────────────────────────┐
│               NEXT.JS SERVER                    │
│  ┌──────────────────────────────────────────┐  │
│  │  app/api/student/dashboard/route.ts      │  │
│  │  (Backend - API Route)                   │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ query('SELECT ...')           │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │  lib/db.ts                               │  │
│  │  (Database Connection)                   │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼──────────────────────────────┘
                  │ SQL Query
                  ▼
┌─────────────────────────────────────────────────┐
│           NEON POSTGRESQL                       │
│  ┌──────────────────────────────────────────┐  │
│  │  Tables: users, courses, enrollments,    │  │
│  │          modules, lessons, progress      │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Project Statistics

**Current codebase size:**
- Frontend Pages: 10+ pages
- Backend API Routes: 8 endpoints
- Components: 5+ reusable components
- Database Tables: 6 tables
- Lines of Code: ~2,500 lines

**File organization:**
- ✅ Each file has single responsibility
- ✅ Related code grouped by feature (student/, admin/, instructor/)
- ✅ Shared utilities in lib/
- ✅ Reusable UI in components/

## Best Practices We're Following

### 1. Separation of Concerns
- ✅ UI logic in `page.tsx` files
- ✅ API logic in `app/api/*/route.ts` files
- ✅ Database logic in `lib/db.ts`
- ✅ Auth logic in `lib/auth.ts`

### 2. DRY (Don't Repeat Yourself)
- ✅ Reusable components in `components/`
- ✅ Shared utilities in `lib/`
- ✅ Database helpers (`query`, `queryOne`)

### 3. Type Safety
- ✅ TypeScript everywhere
- ✅ Database types defined
- ✅ API response types

### 4. Security
- ✅ Environment variables in `.env.local`
- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens for authentication
- ✅ HTTP-only cookies

## Summary

**Your code organization is EXCELLENT!**

✅ Frontend code clearly separated (pages, components)  
✅ Backend code clearly separated (API routes, database)  
✅ Easy to find and modify code  
✅ Follows Next.js best practices  
✅ Production-ready structure  

**The only difference from "separate folders" is:**
- Your structure: Frontend & backend in same Next.js project
- Alternative: Frontend (React) + backend (Express) as separate projects

**But your structure is BETTER because:**
- Faster performance (SSR)
- Easier deployment (1 app)
- Better code sharing
- Lower cost ($7 vs $14/month)

**You don't need to change anything! 🎉**

---

## Quick Command Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Create database tables
node setup-db.js

# Create test users
node create-all-users.js
```

**Happy coding! 🚀**
