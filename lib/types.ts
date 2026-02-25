export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'

export interface User {
  id: string
  name: string
  email: string
  password_hash?: string  // Only included in database queries, never sent to client
  role: UserRole
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  instructor_id?: string
  category?: string
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  duration_hours?: number
  price: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  completed_at?: string
  progress: number
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED'
}

export interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content?: string
  video_url?: string
  duration_minutes?: number
  order_index: number
  lesson_type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT'
  created_at: string
  updated_at: string
}

export interface Progress {
  id: string
  student_id: string
  lesson_id: string
  completed: boolean
  completed_at?: string
  time_spent_minutes: number
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  message?: string
}
