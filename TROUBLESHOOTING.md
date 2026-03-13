# Course Submission Troubleshooting Guide

## ✅ What We've Verified
- ✅ Backend is running on port 3001
- ✅ Frontend is running on port 3002
- ✅ CORS is properly configured
- ✅ Form code structure is correct
- ✅ Submit button is properly wired

## 🔍 Debugging Steps

### Step 1: Open Browser Developer Tools
1. Go to http://localhost:3002/dashboard/instructor/create-course
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab

### Step 2: Fill Out the Form
Fill in the form with test data:
- **Title**: "Test Course for Debugging" (at least 5 characters)
- **Description**: "This is a test course to debug the submission process. It needs at least 20 characters." (at least 20 characters)
- **Category**: Select any category
- **Level**: Select any level (Beginner/Intermediate/Advanced)
- **Price**: Leave blank or enter 0

### Step 3: Click Submit and Check Console
When you click "🚀 Submit for Approval", you should see these console messages in order:

```
1. "Button clicked!"
2. "Form submitted"
3. "Validation passed" (or "Validation failed" if validation failed)
4. "Payload: {title: '...', description: '...', ...}"
5. "API URL: http://localhost:3001/courses"
6. "Response status: 201" (or 200)
7. "Response data: {...}"
```

### Step 4: Identify the Issue

#### If you see "Button clicked!" but nothing else:
- The form's `onSubmit` is not firing
- **Check**: Is there a JavaScript error above in the console?

#### If you see "Validation failed":
- Your form data doesn't meet the requirements
- **Fix**: Make sure:
  - Title is 5-200 characters
  - Description is at least 20 characters
  - Price (if entered) is a valid number >= 0

#### If you see a Network Error:
- **Check**: Open the **Network** tab in DevTools
- Look for a POST request to `/courses`
- Click on it to see:
  - Status code
  - Response
  - Request headers (should include Cookie with JWT)

#### If you see "Response status: 401":
- You're not authenticated
- **Fix**: Log out and log back in as an INSTRUCTOR

#### If you see "Response status: 403":
- You don't have permission (not INSTRUCTOR role)
- **Fix**: Make sure your user has INSTRUCTOR role

#### If you see "Response status: 500":
- Backend server error
- **Check**: Backend terminal for error logs
- **Common cause**: Database columns (category, level) might not exist

## 🔧 Quick Fixes

### Fix 1: Restart Frontend (Clear Cache)
```powershell
cd lms/lms-frontend
# Stop the server (Ctrl+C)
# Delete .next folder
Remove-Item -Recurse -Force .next
npm run dev
```

### Fix 2: Check Authentication
1. Open DevTools → Application tab → Storage → Local Storage
2. Look for key "user"
3. Check if role is "INSTRUCTOR"
4. Open Cookies section
5. Look for "jwt" cookie

### Fix 3: Update Database Schema
The backend requires `category` and `level` columns in the courses table.

```sql
-- Add missing columns if they don't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS level VARCHAR(50);
```

Or temporarily enable TypeORM synchronization in `app.module.ts`:
```typescript
TypeOrmModule.forRoot({
  // ... other config
  synchronize: true, // ⚠️ Only for development!
})
```

## 📋 Manual API Test

Test the endpoint directly with PowerShell:

```powershell
# First, get your JWT token from browser cookies (DevTools → Application → Cookies)
$token = "YOUR_JWT_TOKEN_HERE"

# Test the API
Invoke-WebRequest -Uri "http://localhost:3001/courses" `
  -Method POST `
  -Headers @{
    "Content-Type"="application/json";
    "Cookie"="jwt=$token"
  } `
  -Body '{"title":"Test Course","description":"This is a test course for debugging the API endpoint.","category":"Programming","level":"Beginner"}' `
  -UseBasicParsing
```

## 🎯 Expected Success Flow

When everything works correctly:

1. Click "Submit for Approval"
2. See a popup modal with:
   - Green checkmark icon
   - "Course Submitted Successfully! 🎉"
   - Course title confirmation
   - "Awaiting Admin Approval" message
   - Two buttons: "Create Another" or "View My Courses"
3. Choose to create another course or view your courses
4. Your new course will have status "PENDING_APPROVAL"
5. Admin receives email notification about the pending course

## 📞 Still Not Working?

Share these details:
1. All console messages you see
2. Network tab screenshot showing the POST request
3. Backend terminal logs
4. Your user's role from localStorage
5. Whether you have JWT cookie in browser
