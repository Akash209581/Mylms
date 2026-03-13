# Course Approval Workflow - Complete Guide

## 📋 Overview

This document explains the complete workflow for course creation, approval, and visibility in the LMS.

## 🔑 User Roles

1. **INSTRUCTOR (Teaching Access)** - Can create courses
2. **ADMIN (Administrative Access)** - Organization-level control, approves/rejects courses
3. **SUPERADMIN (Full System Access)** - System-wide control, can only view approved courses
4. **STUDENT (Learning Access)** - Can enroll in approved published courses

## 📊 Course Status Flow

```
INSTRUCTOR creates course
       ↓
Status: PENDING_APPROVAL
       ↓
ADMIN reviews
       ↓
    ┌──────┴──────┐
    ↓             ↓
APPROVED      REJECTED
```

## 🔄 Complete Workflow

### Step 1: Instructor Creates Course

**Who:** INSTRUCTOR

**Where:** `http://localhost:3002/dashboard/instructor/create-course`

**What happens:**
1. Instructor fills out the form:
   - Title (min 5, max 200 characters)
   - Description (min 20 characters)
   - Category (optional)
   - Level: Beginner/Intermediate/Advanced (optional)
   - Price (optional, 0 = free)

2. Clicks "🚀 Submit for Approval"

3. Backend creates course with:
   - `status: PENDING_APPROVAL`
   - `published: false`
   - `instructorId: [instructor's ID]`

4. Email notification sent to ALL ADMIN users

5. Success popup modal appears showing:
   - "Course Submitted Successfully! 🎉"
   - "Awaiting Admin Approval"
   - Options: "Create Another" or "View My Courses"

### Step 2: Admin Reviews Course

**Who:** ADMIN (NOT SUPERADMIN)

**Where:** `http://localhost:3002/dashboard/admin/approvals`

**What happens:**
1. Admin sees 3 tabs:
   - **Pending** - Courses awaiting review
   - **Approved** - Approved courses
   - **Rejected** - Rejected courses

2. For each pending course, admin can see:
   - Course title, description, category, level, price
   - Instructor name and email
   - Creation date

3. Admin has two options:

#### Option A: Approve Course
- Click "Approve" button
- Confirmation modal appears
- On confirm:
  - `status: APPROVED`
  - `published: true`
  - `approvedBy: [admin's ID]`
  - Email sent to instructor
  - Course becomes visible to everyone

#### Option B: Reject Course
- Click "Reject" button
- Enter rejection reason (required)
- On confirm:
  - `status: REJECTED`
  - `rejectionReason: [reason text]`
  - Email sent to instructor with reason
  - Course remains hidden from others

## 👁️ Visibility Rules

### PENDING_APPROVAL Status

**Visible to:**
- ✅ Course owner (INSTRUCTOR who created it)
- ✅ ADMIN (for review)

**NOT visible to:**
- ❌ SUPERADMIN
- ❌ Other INSTRUCTORS
- ❌ STUDENTS

### APPROVED Status

**Visible to:**
- ✅ SUPERADMIN (Full System Access)
- ✅ ADMIN (Administrative Access)
- ✅ All INSTRUCTORS (Teaching Access)
- ✅ STUDENTS (Learning Access) - if `published: true`

### REJECTED Status

**Visible to:**
- ✅ Course owner (INSTRUCTOR who created it)
- ✅ ADMIN (who rejected it)

**NOT visible to:**
- ❌ SUPERADMIN
- ❌ Other INSTRUCTORS
- ❌ STUDENTS

## 🔐 Backend API Endpoints

### Course Creation
```
POST /courses
Roles: INSTRUCTOR, ADMIN, SUPERADMIN
Body: { title, description, category?, level?, price? }
```

### Get All Courses (Filtered by Role)
```
GET /courses
Authenticated: Required

Returns based on role:
- ADMIN: All courses (any status)
- SUPERADMIN: Only APPROVED courses
- INSTRUCTOR: Own courses (any status) + APPROVED courses from others
- STUDENT: Only APPROVED + PUBLISHED courses
```

### Admin Endpoints (ADMIN ONLY - NOT SUPERADMIN)

```
GET /admin/courses/pending
Roles: ADMIN ONLY
Returns: Courses with PENDING_APPROVAL status
```

```
GET /admin/courses/rejected
Roles: ADMIN ONLY
Returns: Courses with REJECTED status
```

```
PUT /admin/courses/:id/approve
Roles: ADMIN ONLY
Body: { }
```

```
PUT /admin/courses/:id/reject
Roles: ADMIN ONLY
Body: { rejectionReason: string }
```

### Admin Endpoints (ADMIN and SUPERADMIN)

```
GET /admin/courses/approved
Roles: ADMIN, SUPERADMIN
Returns: Courses with APPROVED status
```

## 📧 Email Notifications

### On Course Creation
**To:** All ADMIN users
**Subject:** New Course Pending Approval
**Content:** 
- Course title
- Instructor name
- Course ID
- Link to review

### On Course Approval
**To:** Course instructor
**Subject:** Course Approved
**Content:**
- Course title
- Approver name
- Course is now live

### On Course Rejection
**To:** Course instructor
**Subject:** Course Requires Changes
**Content:**
- Course title
- Rejection reason
- Next steps

## 🎨 Frontend Pages

### Instructor Pages
- `/dashboard/instructor` - Dashboard
- `/dashboard/instructor/create-course` - Create new course
- `/dashboard/instructor/courses` - View own courses (all statuses)

### Admin Pages (ADMIN ONLY)
- `/dashboard/admin` - Dashboard with pending count
- `/dashboard/admin/approvals` - Review pending courses (3 tabs)
- `/dashboard/admin/courses` - All courses
- `/dashboard/admin/users` - User management

### Superadmin Pages
- `/dashboard/superadmin` - Dashboard
- `/dashboard/superadmin/courses` - APPROVED courses only

### Student Pages
- `/dashboard/student` - Dashboard
- `/dashboard/student/courses` - APPROVED + PUBLISHED courses only

## ✅ Testing the Workflow

### Test 1: Create and Approve Course
1. Login as INSTRUCTOR
2. Go to Create Course page
3. Fill form and submit
4. Verify popup appears
5. Login as ADMIN
6. Go to Approvals page
7. See course in "Pending" tab
8. Approve course
9. Verify course appears in "Approved" tab
10. Login as STUDENT
11. Verify course is now visible

### Test 2: Create and Reject Course
1. Login as INSTRUCTOR
2. Create course
3. Login as ADMIN
4. Go to Approvals page
5. Click "Reject" on the course
6. Enter rejection reason
7. Confirm rejection
8. Verify course moves to "Rejected" tab
9. Login as INSTRUCTOR
10. Verify course shows as REJECTED with reason

### Test 3: Visibility Rules
1. Login as INSTRUCTOR1, create course (stays PENDING)
2. Login as INSTRUCTOR2
3. Verify INSTRUCTOR1's pending course is NOT visible
4. Login as SUPERADMIN
5. Verify pending course is NOT visible
6. Login as ADMIN
7. Verify pending course IS visible in Approvals
8. Approve the course
9. Login as SUPERADMIN
10. Verify course is NOW visible

## 🚨 Important Notes

1. **SUPERADMIN Cannot Approve Courses**
   - SUPERADMIN has full system access but does NOT have organization-level approval permissions
   - Only ADMIN can approve/reject courses

2. **Pending Courses are Private**
   - Only visible to course owner and ADMIN
   - SUPERADMIN deliberately cannot see pending courses

3. **Automatic Publishing**
   - When ADMIN approves a course, it's automatically set to `published: true`
   - Course immediately becomes visible to all users

4. **Email Notifications**
   - Ensure email service is configured in backend
   - Notifications are sent asynchronously

5. **Role-Based Access**
   - Frontend pages check localStorage for user role
   - Backend endpoints enforce role restrictions with Guards
   - Attempting to access restricted endpoints returns 403 Forbidden

## 🐛 Troubleshooting

### Course not showing in Admin Approvals
- ✅ Verify ADMIN is logged in (not SUPERADMIN)
- ✅ Check backend logs for errors
- ✅ Verify course status is PENDING_APPROVAL in database
- ✅ Check browser console for network errors
- ✅ Verify JWT token is valid

### Approval button not working
- ✅ Check browser console for errors
- ✅ Verify user is ADMIN role (not SUPERADMIN)
- ✅ Check Network tab for 403 Forbidden errors
- ✅ Verify backend is running

### Course not visible after approval
- ✅ Verify status changed to APPROVED in database
- ✅ Verify published is true
- ✅ Refresh the page
- ✅ Clear browser cache
