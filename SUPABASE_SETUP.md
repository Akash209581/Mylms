# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Project name: LMS Pro
   - Database password: (create a secure password)
   - Region: Choose closest to you
5. Wait for project to be created (~2 minutes)

## Step 2: Get API Keys

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire content from `supabase/schema.sql`
4. Paste it into the SQL editor
5. Click **Run** (bottom right)
6. Wait for success message

## Step 4: (Optional) Add Sample Data

1. In SQL Editor, create another new query
2. Copy content from `supabase/seed.sql`
3. Paste and run it
4. This adds sample courses for testing

## Step 5: Verify Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - users
   - courses
   - enrollments
   - modules
   - lessons
   - progress

## Step 6: Create Test User (Optional)

Since signup creates STUDENT users automatically, you can test by:

1. Running your Next.js app: `npm run dev`
2. Going to `/signup`
3. Creating a student account

If you need to create a SUPERADMIN manually:

1. First create auth user via Supabase Auth UI or signup
2. Go to SQL Editor and run:

```sql
-- Get the user ID from auth.users table first
SELECT id, email FROM auth.users;

-- Then insert into users table with SUPERADMIN role
INSERT INTO public.users (id, name, email, role)
VALUES ('USER_ID_FROM_ABOVE', 'Super Admin', 'admin@example.com', 'SUPERADMIN');
```

## Step 7: Enable Row Level Security

The schema already enables RLS, but verify:

1. Go to **Authentication** → **Policies**
2. Check that policies exist for each table
3. If not, re-run the schema.sql file

## Troubleshooting

### "relation does not exist" error
- Run the schema.sql file again
- Make sure you're in the correct project

### "JWT expired" or auth errors
- Check that JWT_SECRET is set in .env.local
- Clear cookies and try again

### "permission denied" errors
- Verify RLS policies are enabled
- Check that user role is correctly set in users table

### Can't login after signup
- Check browser console for errors
- Verify environment variables are correct
- Check Supabase logs in dashboard

## Next Steps

After setup:
1. Create your `.env.local` file with the API keys
2. Run `npm install`
3. Run `npm run dev`
4. Visit `http://localhost:3000`
5. Test signup/login functionality

## Security Notes

- **Never commit** `.env.local` to git
- Keep your `service_role` key secret
- Use different projects for dev/staging/production
- Enable 2FA on your Supabase account
- Regularly rotate API keys in production
