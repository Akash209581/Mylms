# Complete Workflow Test Script

## 🚀 Step 1: Restart Backend Server

**IMPORTANT: The backend must be restarted to apply the new logging!**

```powershell
# Option A: If backend is running in a terminal, press Ctrl+C to stop it, then:
cd d:\Documents\FromTheScratch2.0\lms\LMS-backend
npm run start:dev

# Option B: Kill the process and restart
Stop-Process -Id 2620 -Force
cd d:\Documents\FromTheScratch2.0\lms\LMS-backend
npm run start:dev
```

Wait until you see:
```
🚀 LMS Backend running on port 3001
```

## 🌐 Step 2: Verify Frontend is Running

Frontend should be running on port 3002. If not:

```powershell
cd d:\Documents\FromTheScratch2.0\lms\lms-frontend
npm run dev
```

## 🧪 Step 3: Test the Complete Workflow

### Test 1: Create Course as INSTRUCTOR

1. **Open browser** → http://localhost:3002/login

2. **Login as INSTRUCTOR**
   - Use your instructor credentials
   - Check localStorage after login:
     - Press F12 → Application → Local Storage
     - Verify `user` key shows `"role": "INSTRUCTOR"`

3. **Go to Create Course page**
   - Navigate to: http://localhost:3002/dashboard/instructor/create-course
   - You should see: "✓ Authenticated as: [your name] (INSTRUCTOR)"

4. **Fill the form:**
   - Title: "Test Course for Approval Workflow"
   - Description: "This is a comprehensive test course to verify the complete approval workflow is working correctly."
   - Category: Select "Programming" or any category
   - Level: Select "Beginner"
   - Price: Leave blank or enter 0

5. **Open Browser Console** (F12 → Console tab)

6. **Click "🚀 Submit for Approval"**

7. **Check Console - You should see:**
   ```
   Button clicked!
   Form submitted
   Validation passed
   Payload: {title: "...", description: "...", ...}
   API URL: http://localhost:3001/courses
   Response status: 201
   Response data: {...}
   ```

8. **Check Backend Terminal - You should see:**
   ```
   📝 Course creation request received
   User: { email: '...', sub: ..., role: 'INSTRUCTOR' }
   ...
   ✅ Course saved to database with ID: [number]
   📧 Admin notification sent
   ```

9. **Verify Success Modal appears:**
   - Green checkmark
   - "Course Submitted Successfully! 🎉"
   - "Awaiting Admin Approval"

---

### Test 2: View Pending Course as ADMIN

1. **Logout** (click Sign Out)

2. **Login as ADMIN**
   - Use your admin credentials
   - Verify role in localStorage: `"role": "ADMIN"`

3. **Go to Approvals page**
   - Navigate to: http://localhost:3002/dashboard/admin/approvals
   - Or click "Approvals" in sidebar

4. **Open Browser Console** (F12 → Console)

5. **Check Console - You should see:**
   ```
   📋 Fetching courses for ADMIN...
   Active tab: pending
   User role: ADMIN
   Endpoint: /admin/courses/pending
   Full URL: http://localhost:3001/admin/courses/pending
   Response status: 200
   ✅ Courses fetched: 1 courses
   Courses: [{...}]
   ```

6. **Check Backend Terminal - You should see:**
   ```
   📋 Fetching pending courses for ADMIN: [admin@email.com]
   Found 1 pending courses
   ```

7. **Verify in UI:**
   - "Pending" tab should show your test course
   - Should display:
     - Course title
     - Description
     - Category badge
     - Level badge (green for Beginner)
     - Instructor name
     - "Approve" and "Reject" buttons

---

### Test 3: Verify SUPERADMIN Cannot See Pending Course

1. **Logout**

2. **Login as SUPERADMIN**
   - Use superadmin credentials
   - Verify role: `"role": "SUPERADMIN"`

3. **Go to Courses page**
   - Navigate to: http://localhost:3002/dashboard/superadmin/courses

4. **Verify:**
   - Your pending test course should NOT appear in the list
   - Only APPROVED courses should be visible

5. **Try to access Approvals page** (should fail)
   - Navigate to: http://localhost:3002/dashboard/admin/approvals
   - Should redirect to superadmin dashboard
   - "Approvals" link should NOT appear in sidebar for SUPERADMIN

---

### Test 4: Approve Course as ADMIN

1. **Logout and login as ADMIN** again

2. **Go to Approvals page** → "Pending" tab

3. **Click "Approve"** button on your test course

4. **Confirm** in the modal

5. **Check Console:**
   ```
   Approving course...
   ```

6. **Check Backend Terminal:**
   ```
   ✅ Approving course: [id] by admin: [admin@email.com]
   ```

7. **Verify:**
   - Course disappears from "Pending" tab
   - Course appears in "Approved" tab
   - Instructor receives email notification (check backend logs)

---

### Test 5: Verify SUPERADMIN Can Now See Approved Course

1. **Logout and login as SUPERADMIN**

2. **Go to Courses page**
   - Navigate to: http://localhost:3002/dashboard/superadmin/courses

3. **Verify:**
   - Your test course NOW appears in the list
   - Status shows as "APPROVED"

---

### Test 6: Verify STUDENT Can See Approved Course

1. **Logout and login as STUDENT**

2. **Go to Courses page**
   - Navigate to: http://localhost:3002/dashboard/student/courses

3. **Verify:**
   - Your approved course is now visible
   - Student can see course details

---

## ❌ Troubleshooting

### Issue: "Form submitted" appears but no "Validation passed"

**Problem:** Form validation is failing

**Solution:**
- Make sure Title is at least 5 characters
- Make sure Description is at least 20 characters
- Check console for validation error messages

---

### Issue: "Response status: 401"

**Problem:** Not authenticated

**Solution:**
1. Open DevTools → Application → Cookies
2. Check if `jwt` cookie exists
3. If not, logout and login again
4. Clear all cookies and try again

---

### Issue: "Response status: 403"

**Problem:** User doesn't have required role

**Solution:**
1. Check localStorage → `user` → `role`
2. Make sure INSTRUCTOR is creating course
3. Make sure ADMIN is accessing approvals
4. Verify user was created with correct role in database

---

### Issue: "Response status: 500"

**Problem:** Backend server error

**Solution:**
1. Check backend terminal for error stack trace
2. Common causes:
   - Database connection lost
   - Missing columns in database
   - Email service not configured
3. Restart backend server

---

### Issue: No courses appear in Admin Approvals (Pending tab is empty)

**Checks:**
1. **Backend logs:** Look for "📋 Fetching pending courses" and "Found X pending courses"
2. **Console logs:** Check response data
3. **Database:** Run query to verify course exists:
   ```sql
   SELECT id, title, status FROM courses WHERE status = 'PENDING_APPROVAL';
   ```
4. **User role:** Make sure logged in as ADMIN (not SUPERADMIN)
5. **JWT token:** Verify valid JWT cookie exists

---

### Issue: SUPERADMIN sees pending courses (they shouldn't)

**Problem:** Backend code not applied

**Solution:**
1. Restart backend server (Ctrl+C then `npm run start:dev`)
2. Clear browser cache
3. Logout and login again

---

## 🗄️ Database Check (Optional)

If nothing is working, check the database directly:

```sql
-- Check if course was created
SELECT 
    c.id, 
    c.title, 
    c.status, 
    c.published,
    u.name as instructor_name,
    c.created_at
FROM courses c
LEFT JOIN users u ON c."instructorId" = u.id
ORDER BY c.created_at DESC
LIMIT 5;

-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses';
```

---

## 📊 Expected Database State

After creating a course:
- `status`: "PENDING_APPROVAL"
- `published`: false
- `instructorId`: [number]
- `approvedBy`: null
- `rejectionReason`: null

After approving:
- `status`: "APPROVED"
- `published`: true
- `approvedBy`: [admin user id]

---

## 🆘 Still Not Working?

Share these details:

1. **Backend console output** (copy the terminal output when creating course)
2. **Frontend console logs** (copy from browser console)
3. **Network tab** (screenshot of the POST /courses request)
4. **User roles** (from localStorage)
5. **Error messages** (any red errors in console or backend)
