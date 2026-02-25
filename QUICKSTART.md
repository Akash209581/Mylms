# 📚 LMS Pro - Quick Start Guide

## ⚡ Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_random_secret_min_32_chars
```

### 3. Set Up Supabase Database
- Go to your Supabase project → SQL Editor
- Run `supabase/schema.sql`
- (Optional) Run `supabase/seed.sql` for sample data

### 4. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## 🎯 What You Can Do Now

1. **Create Student Account**
   - Go to `/signup`
   - Fill in your details
   - Automatically logged in as STUDENT

2. **Explore Student Dashboard**
   - View your enrolled courses
   - Track learning progress
   - Browse available courses

3. **Test Features**
   - Search and filter courses
   - View profile information
   - Check responsive design

## 📖 Detailed Documentation

- **Full Setup**: See `README.md`
- **Supabase Guide**: See `SUPABASE_SETUP.md`

## 🚀 Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth)
- TypeScript
- Tailwind CSS
- JWT Authentication

## 🎨 Features Included

✅ Professional animated UI
✅ Role-based authentication
✅ Protected routes with middleware
✅ Student dashboard with stats
✅ Course browsing and filtering
✅ Profile management
✅ Dark mode ready
✅ Fully responsive

## 🆘 Need Help?

- Check `README.md` for troubleshooting
- Review `SUPABASE_SETUP.md` for database issues
- Ensure all environment variables are set correctly

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🔜 Coming in Phase 2

- Instructor dashboard
- Course creation tools
- Admin panel
- Enrollment system
- Progress tracking
- Certificates

---

**Built with ❤️ for education**
