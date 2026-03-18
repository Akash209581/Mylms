# College/University-Based Role Hierarchy Implementation Guide

## Overview
This document describes the implementation of a College/University-based role hierarchy system, replacing the previous Organization-based multi-tenancy model.

## Database Changes

### Migration File
- **File**: `LMS-backend/migrations/002_migrate_organization_to_college.sql`
- **Actions**:
  - Renamed `organizations` table to `colleges`
  - Renamed `organization_id` column to `college_id` in all related tables (users, courses, questions)
  - Updated foreign key constraints
  - Created indexes for better performance

### Running the Migration
```sql
psql -h <host> -U <user> <database> < LMS-backend/migrations/002_migrate_organization_to_college.sql
```

## Backend Changes

### New Entities
1. **College Entity** (`src/entities/college.entity.ts`)
   - Replaced Organization entity
   - Same structure but semantically represents College/University
   - Relations: Users, Courses, Questions

### Updated Entities
1. **User Entity** (`src/entities/user.entity.ts`)
   - Changed `organizationId` → `collegeId`
   - Changed `organization` relation → `college` relation

2. **Course Entity** (`src/entities/course.entity.ts`)
   - Changed `organizationId` → `collegeId`
   - Changed `organization` relation → `college` relation

3. **Question Entity** (`src/entities/question.entity.ts`)
   - Changed `organizationId` → `collegeId`
   - Changed `organization` relation → `college` relation

### New Modules
1. **College Module** (`src/college/`)
   - `college.module.ts` - Module configuration
   - `college.controller.ts` - API endpoints for college management
   - `college.service.ts` - Business logic for colleges
   - `college.dto.ts` - Data transfer objects

### Updated Services

#### Auth Service (`src/auth/auth.service.ts`)
- **Updated Methods**:
  - `createUser()` - Implements role-based user creation rules
  - `createUserWithCollege()` - Dedicated method for SUPERADMIN to create users with explicit college assignment
  - `getAllowedRolesToCreate()` - Helper to determine which roles a user can create

- **Role Creation Rules**:
  - SUPERADMIN: Can create ADMIN, INSTRUCTOR, STUDENT
  - ADMIN: Can create INSTRUCTOR, STUDENT  
  - INSTRUCTOR: Can create STUDENT only
  - College/University is automatically inherited (non-editable) for ADMIN and INSTRUCTOR

#### College Filter Service (`src/common/college-filter.service.ts`)
- Replaced `OrganizationFilterService`
- Methods:
  - `getCollegeFilter()` - Returns filter based on user role
  - `canAccessCollege()` - Checks if user can access a specific college
  - `validateCollegeAccess()` - Validates and throws error if access denied

### Updated Controllers

#### Superadmin Controller (`src/superadmin/superadmin.controller.ts`)
- **New Endpoints**:
  - `GET /superadmin/colleges-stats` - Returns all colleges with user counts (ADMIN, INSTRUCTOR, STUDENT)
- **Updated Endpoints**:
  - `GET /superadmin/dashboard` - Now includes `totalColleges` and `activeColleges` counts
  - `GET /superadmin/users` - Returns users with `collegeId` and college relation
  - `GET /superadmin/users/college/:collegeId` - Filter users by college

#### Auth Controller (`src/auth/auth.controller.ts`)
- **Updated Endpoints**:
  - `POST /auth/create-user` - For ADMIN/INSTRUCTOR to create users (college auto-inherited)
  - `POST /auth/superadmin/create-user` - For SUPERADMIN to create users with explicit college selection

#### Admin Controller (`src/admin/admin.controller.ts`)
- All references to `organizationId` replaced with `collegeId`
- Dashboards now show college-specific data

#### Courses Controller (`src/courses/courses.controller.ts`)
- Updated to use `CollegeFilterService` instead of `OrganizationFilterService`
- All queries filter by `collegeId` instead of `organizationId`

#### Question Bank Controller (`src/question-bank/question-bank.controller.ts`)
- Updated to use `CollegeFilterService`
- All question operations scoped to colleges

### Updated Modules

#### App Module (`src/app.module.ts`)
- Replaced `OrganizationModule` with `CollegeModule`
- Updated entity imports: `Organization` → `College`

#### Other Modules
- All modules updated to import `CollegeFilterService` instead of `OrganizationFilterService`

### JWT Strategy (`src/common/jwt.strategy.ts`)
- JWT payload now includes `collegeId` and `collegeName` instead of `organizationId`

## API Endpoints

### New Endpoints

#### College Management (SUPERADMIN only)
```
POST   /colleges                    - Create a new college
GET    /colleges                    - Get all colleges
GET    /colleges/active             - Get active colleges only
GET    /colleges/:id                - Get college by ID
GET    /colleges/:id/stats          - Get college with user statistics
PUT    /colleges/:id                - Update college
DELETE /colleges/:id                - Delete college
```

#### Superadmin Dashboard
```
GET    /superadmin/colleges-stats   - Get all colleges with user counts
GET    /superadmin/users/college/:collegeId - Get users by college
```

### Updated Endpoints

#### Auth Endpoints
```
POST   /auth/signup                 - Student signup (includes collegeId instead of organizationId)
POST   /auth/create-user            - ADMIN/INSTRUCTOR create users (college auto-inherited)
POST   /auth/superadmin/create-user - SUPERADMIN creates users with college selection
POST   /auth/login                  - Returns collegeId in JWT
GET    /auth/me                     - Returns user with collegeId
```

#### Course Endpoints
```
GET    /courses                     - Filter by collegeId for ADMIN/INSTRUCTOR/STUDENT
GET    /courses/public/browse?collegeId=X - Browse public courses by college
```

## Frontend Changes Required

### Critical Files to Update

1. **Signup Page** (`app/signup/page.tsx`)
   - Change `organizations` → `colleges`
   - Update API endpoint from `/organizations` to `/colleges/active`
   - Change form field `organizationId` → `collegeId`

2. **Superadmin Dashboard** (`app/dashboard/superadmin/page.tsx`)
   - Add "Total Colleges" card
   - Add "View Colleges" button that shows college stats
   - Create new endpoint handler for viewing colleges with user counts

3. **User Management Pages**
   - Update create-user forms to remove college selection for non-SUPERADMIN
   - Add college display (read-only) for ADMIN and INSTRUCTOR
   - Update user list displays to show college instead of organization

4. **API Client** (`lib/api.ts`)
   - Update any hardcoded references to organization endpoints

### Example Frontend Updates

#### Signup Form
```typescript
// Before
const [organizations, setOrganizations] = useState<Organization[]>([])
const response = await api.get('/organizations')

// After
const [colleges, setColleges] = useState<College[]>([])
const response = await api.get('/colleges/active')
```

#### Create User Form (SUPERADMIN)
```typescript
// Add college selector
<select name="collegeId" required>
  {colleges.map(college => (
    <option key={college.id} value={college.id}>
      {college.name} ({college.type})
    </option>
  ))}
</select>
```

#### Create User Form (ADMIN/INSTRUCTOR)
```typescript
// Show read-only college info
<div className="bg-gray-100 p-4 rounded">
  <p>College: {user.collegeName}</p>
  <p className="text-sm text-gray-600">
    Users you create will automatically be assigned to your college.
  </p>
</div>
```

## Testing Checklist

### Backend
- [ ] Run database migration successfully
- [ ] Test SUPERADMIN can create users with college assignment
- [ ] Test ADMIN can create INSTRUCTOR/STUDENT (college auto-inherited)
- [ ] Test INSTRUCTOR can create STUDENT (college auto-inherited)
- [ ] Test college stats endpoint returns correct counts
- [ ] Test JWT contains collegeId
- [ ] Test course filtering by college
- [ ] Test question bank filtering by college

### Frontend
- [ ] Signup form shows colleges instead of organizations
- [ ] SUPERADMIN dashboard shows college count
- [ ] SUPERADMIN can view all colleges with stats
- [ ] ADMIN/INSTRUCTOR create-user forms don't show college selector
- [ ] User listings show college information
- [ ] Course browsing filters by college

## Rollback Plan

If issues occur:
1. Keep the old `Organization` entity files as backup
2. Database rollback script:
```sql
ALTER TABLE colleges RENAME TO organizations;
ALTER TABLE users RENAME COLUMN college_id TO organization_id;
ALTER TABLE courses RENAME COLUMN college_id TO organization_id;
ALTER TABLE questions RENAME COLUMN college_id TO organization_id;
```

## Security Considerations

1. **College Isolation**: Users can only see/access data from their own college (except SUPERADMIN)
2. **Role-Based Creation**: Each role can only create specific subordinate roles
3. **Non-Editable College**: ADMIN and INSTRUCTOR cannot change college when creating users
4. **JWT Security**: College ID is included in JWT for consistent authorization

## Performance Considerations

1. **Indexes Created**:
   - `idx_users_college_id` on users(college_id)
   - `idx_users_role` on users(role)
   - `idx_colleges_active` on colleges(active)

2. **Query Optimization**: All filtered queries use indexed college_id column

## Future Enhancements

1. Add college-level settings and configurations
2. Implement inter-college course sharing (optional)
3. Add college-specific branding/theming
4. Generate college-specific reports and analytics
5. Implement college hierarchy (university → colleges)
