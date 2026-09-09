import { BookOpen, Bookmark, CircleCheck, Flame, GraduationCap, LayoutDashboard, MessageCircle, Settings, Trophy } from 'lucide-react'

export const studentNavigation = [
  { label: 'Overview', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Learning', href: '/dashboard/student/my-learning', icon: GraduationCap },
  { label: 'Saved courses', href: '/dashboard/student/saved', icon: Bookmark },
  { label: 'Course Catalog', href: '/dashboard/student/courses', icon: BookOpen },
  { label: 'Learning Progress', href: '/dashboard/student/progress', icon: CircleCheck },
  { label: 'Certificates', href: '/dashboard/student/certificates', icon: Trophy },
  { label: 'Learning Streak', href: '/dashboard/student/streak', icon: Flame },
  { label: 'Discussions', href: '/dashboard/student/forums', icon: MessageCircle },
  { label: 'Profile & Settings', href: '/dashboard/student/profile', icon: Settings },
]

export function isStudentRouteActive(pathname: string, href: string) {
  return href === '/dashboard/student' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}
