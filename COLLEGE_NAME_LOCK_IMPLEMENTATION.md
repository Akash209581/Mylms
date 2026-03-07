# College Name Lock Implementation

## Overview
This document describes the implementation of the college name lock feature, which prevents ADMIN and INSTRUCTOR from changing the college name when creating new users. The college name is automatically inherited from the creator's college.

## Implementation Summary

### Backend Changes

#### 1. DTO Modifications (`auth.dto.ts`)

**CreateUserDto:**
- **REMOVED**: `collegeName` field from the DTO
- **Reason**: Prevent admins and instructors from manually specifying college name
- **Result**: College name is now automatically inherited from the creator

**SuperAdminCreateUserDto:**
- **ADDED**: `collegeName` field (optional)
- Only used by SUPERADMIN via dedicated endpoint
- Allows SUPERADMIN to explicitly set college name for users

#### 2. Controller Updates (`auth.controller.ts`)

**Updated `/auth/create-user` endpoint:**
- **Access**: ADMIN and INSTRUCTOR only
- **College Name**: Automatically inherited from creator via JWT (`req.user.collegeName`)
- **Parameters**: Added `req.user.collegeName` to service call

#### 3. Service Updates (`auth.service.ts`)

**Updated `createUser` method:**
- **Input**: Added `creatorCollegeName` parameter
- **Logic**: Automatically assigns creator's college name to new user
- **Result**: College name inheritance is enforced at the server level

**Updated JWT Payload:**
- **ADDED**: `collegeName` field to JWT payload
- **Purpose**: Makes college name available in `req.user.collegeName` for inheritance

**Login Response:**
- **ADDED**: `collegeName` field to user object in login response
- **Purpose**: Makes college name available on the frontend

### Frontend Changes

#### 1. Admin User Creation (`admin/users/create/page.tsx`)

**Changes:**
- **REMOVED**: `collegeName` from form state
- **REMOVED**: API call to fetch admin's college name
- **REMOVED**: `collegeName` from API payload
- **ADDED**: Read-only display of admin's college name from localStorage user object
- **UPDATED**: Information banner to explain both organization and college lock
- **Result**: Admins cannot change college name when creating users

**Display:**
```tsx
{user?.collegeName && (
    <div>
        <label>College Name (Read-Only)</label>
        <input
            value={user.collegeName}
            disabled
            readOnly
            className="input-field bg-gray-100 cursor-not-allowed"
        />
    </div>
)}
```

#### 2. Instructor Student Creation (`instructor/students/create/page.tsx`)

**Changes:**
- **REMOVED**: `collegeName` from form state
- **REMOVED**: API call to fetch instructor's college name
- **REMOVED**: `collegeName` from API payload
- **ADDED**: Read-only display of instructor's college name from localStorage user object
- **UPDATED**: Information banner to explain both organization and college lock
- **Result**: Instructors cannot change college name when creating students

#### 3. SuperAdmin User Creation (`superadmin/users/create/page.tsx`)

**Changes:**
- **UPDATED**: Help text to clarify that college name will be inherited by downstream users
- **UPDATED**: Information banner to mention college name inheritance
- **Result**: SUPERADMIN can set college name, which will be inherited by all users created by that user

## Role-Based Access Control

### SUPER ADMIN (Full System Access)
- **Can set**: Organization ID and College Name
- **Behavior**: Both fields are editable dropdowns/inputs
- **Endpoint**: `/auth/superadmin/create-user`
- **Inheritance**: Sets the college name that will be inherited by all users created by this user

### ADMIN (Administrative Access)
- **Can view**: College Name (Read-Only)
- **Can create**: INSTRUCTOR, STUDENT
- **College Name**: Automatically inherited from admin's college (LOCKED)
- **Display**: Shows admin's college name as disabled/read-only field
- **Endpoint**: `/auth/create-user`
- **Restriction**: Cannot change college name

### INSTRUCTOR (Teaching Access)
- **Can view**: College Name (Read-Only)
- **Can create**: STUDENT
- **College Name**: Automatically inherited from instructor's college (LOCKED)
- **Display**: Shows instructor's college name as disabled/read-only field
- **Endpoint**: `/auth/create-user`
- **Restriction**: Cannot change college name

### STUDENT (Learning Access)
- **College Name**: Assigned by ADMIN or INSTRUCTOR
- **Restriction**: No user creation capability

## Data Flow

### 1. SUPERADMIN creates ADMIN
```
SUPERADMIN sets collegeName = "XYZ University"
         ↓
ADMIN inherits collegeName = "XYZ University"
         ↓
ADMIN's JWT includes collegeName = "XYZ University"
```

### 2. ADMIN creates INSTRUCTOR
```
ADMIN has collegeName = "XYZ University" (from JWT)
         ↓
INSTRUCTOR inherits collegeName = "XYZ University"
         ↓
INSTRUCTOR's JWT includes collegeName = "XYZ University"
```

### 3. INSTRUCTOR creates STUDENT
```
INSTRUCTOR has collegeName = "XYZ University" (from JWT)
         ↓
STUDENT inherits collegeName = "XYZ University"
         ↓
STUDENT's JWT includes collegeName = "XYZ University"
```

## Security Features

1. **Backend Validation**:
   - College name completely removed from non-superadmin DTO
   - Server-side extraction from JWT token
   - No client-side manipulation possible

2. **Frontend Protection**:
   - College name field shown as read-only for ADMIN/INSTRUCTOR
   - Visual styling (gray background, cursor-not-allowed)
   - Disabled and readonly attributes prevent editing
   - Clear messaging about automatic inheritance

3. **Automatic Inheritance**:
   - College name taken from JWT token (`req.user.collegeName`)
   - Consistent across organization hierarchy
   - Server enforces inheritance

## API Changes

### JWT Payload (Updated)
```typescript
{
  sub: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  organizationId: user.organizationId,
  collegeName: user.collegeName  // NEW
}
```

### Login Response (Updated)
```typescript
{
  access_token: "...",
  user: {
    id: number,
    name: string,
    email: string,
    role: string,
    organizationId: number,
    collegeName: string  // NEW
  }
}
```

### Create User Endpoint (ADMIN/INSTRUCTOR)
```
POST /auth/create-user
Body: {
  name, email, password, role,
  mobileNumber, country, state,
  course, branch, pursuingYear, semester, registrationNumber
}
Note: organizationId and collegeName are NOT in the request - automatically inherited
```

### Create User Endpoint (SUPERADMIN)
```
POST /auth/superadmin/create-user
Body: {
  name, email, password, role, organizationId,
  collegeName,  // Optional - can be explicitly set by SUPERADMIN
  mobileNumber, country, state,
  course, branch, pursuingYear, semester, registrationNumber
}
```

## Testing Checklist

- [ ] SUPERADMIN can set college name when creating users
- [ ] ADMIN sees their college name as read-only when creating users
- [ ] INSTRUCTOR sees their college name as read-only when creating students
- [ ] Created INSTRUCTOR inherits ADMIN's college name
- [ ] Created STUDENT inherits INSTRUCTOR's college name
- [ ] Created STUDENT inherits ADMIN's college name (when created by ADMIN)
- [ ] College name field is disabled and styled as read-only for ADMIN
- [ ] College name field is disabled and styled as read-only for INSTRUCTOR
- [ ] College name field is editable for SUPERADMIN
- [ ] JWT includes collegeName after login
- [ ] localStorage user object includes collegeName
- [ ] College name cannot be manipulated via API payload

## Files Modified

### Backend
- `LMS-backend/src/auth/auth.dto.ts` - Removed collegeName from CreateUserDto, added to SuperAdminCreateUserDto
- `LMS-backend/src/auth/auth.controller.ts` - Added creatorCollegeName parameter
- `LMS-backend/src/auth/auth.service.ts` - Updated createUser method, JWT payload, and login response

### Frontend
- `lms-frontend/app/dashboard/admin/users/create/page.tsx` - Read-only college name display
- `lms-frontend/app/dashboard/instructor/students/create/page.tsx` - Read-only college name display
- `lms-frontend/app/dashboard/superadmin/users/create/page.tsx` - Enhanced help text

## Benefits

1. **Data Consistency**: College name is consistent across organizational hierarchy
2. **Security**: Prevents college name manipulation by lower-level admins
3. **Simplicity**: Automatic inheritance reduces user error
4. **Audit Trail**: Clear college name lineage
5. **Compliance**: Ensures proper institutional boundaries
6. **User Experience**: Clear visual indication of locked fields

## User Interface

### ADMIN/INSTRUCTOR View
```
┌─────────────────────────────────────────┐
│ Organization Information                │
├─────────────────────────────────────────┤
│ ℹ️ Note: Users created by you will     │
│ automatically be assigned to your       │
│ organization and college. You cannot    │
│ change the organization or college name.│
├─────────────────────────────────────────┤
│ College Name (Read-Only)                │
│ ┌─────────────────────────────────────┐ │
│ │ XYZ University              [LOCKED]│ │
│ └─────────────────────────────────────┘ │
│ This college name will be automatically │
│ assigned to the new user.               │
└─────────────────────────────────────────┘
```

### SUPERADMIN View
```
┌─────────────────────────────────────────┐
│ Organization Assignment                 │
├─────────────────────────────────────────┤
│ ⚠️ SUPERADMIN Note: You must explicitly│
│ select an organization and college for  │
│ the user. These cannot be changed after │
│ creation by lower-level admins or       │
│ instructors. The college name will be   │
│ automatically inherited by all users    │
│ they create.                            │
├─────────────────────────────────────────┤
│ College Name                            │
│ ┌─────────────────────────────────────┐ │
│ │ [Type college name...]       [EDIT]│ │
│ └─────────────────────────────────────┘ │
│ Set the college name that will be       │
│ inherited by all users created by this  │
│ user                                    │
└─────────────────────────────────────────┘
```

## Migration Notes

**Existing Users:**
- Users without collegeName will have `null` or `undefined` college name
- Consider running a migration to set default college names if needed
- Backend handles undefined collegeName gracefully

**Backward Compatibility:**
- JWT payload includes collegeName (new field)
- Older clients may not display college name, but functionality is maintained
- SuperAdmin endpoint accepts optional collegeName

## Future Enhancements

1. Add bulk college name update tool for SUPERADMIN
2. Add college name change history/audit log
3. Allow SUPERADMIN to override college name for specific users
4. Add college name validation against organization
5. Add college name search/filter in user lists
6. Show college name in user profile cards
7. Add college name to reports and exports

## Related Features

- **Organization Lock**: Both organization and college name are now locked for ADMIN/INSTRUCTOR
- **RBAC**: Role-based access control determines who can set vs. inherit college name
- **JWT Token**: Carries both organizationId and collegeName for automatic inheritance
