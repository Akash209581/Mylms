'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { API_URL } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

type NavItem = { label: string; href: string; icon: React.ReactNode }

const studentNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/student', icon: <GridIcon /> },
    { label: 'My Courses', href: '/dashboard/student/courses', icon: <GraduationCapIcon /> },
    { label: 'My Progress', href: '/dashboard/student/progress', icon: <ProgressIcon /> },
    { label: 'Leaderboard', href: '/dashboard/student/leaderboard', icon: <TrophyIcon /> },
    { label: 'Daily Challenge', href: '/dashboard/student/streak', icon: <FireIcon /> },
    { label: 'Forums', href: '/dashboard/student/forums', icon: <ForumIcon /> },
    { label: 'Profile', href: '/dashboard/student/profile', icon: <UserIcon /> },
]
const instructorNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/instructor', icon: <GridIcon /> },
    { label: 'My Courses', href: '/dashboard/instructor/courses', icon: <BookIcon /> },
    { label: 'Create Course', href: '/dashboard/instructor/courses/create', icon: <PlusIcon /> },
    { label: 'Question Bank', href: '/dashboard/instructor/question-bank', icon: <QuizIcon /> },
    { label: 'Add Question', href: '/dashboard/instructor/question-bank/create', icon: <PlusIcon /> },
    { label: 'My Students', href: '/dashboard/instructor/students', icon: <UsersIcon /> },
]
const adminNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <GridIcon /> },
    { label: 'Users', href: '/dashboard/admin/users', icon: <UsersIcon /> },
    { label: 'Courses', href: '/dashboard/admin/courses', icon: <BookIcon /> },
    { label: 'Create Course', href: '/dashboard/admin/courses/create', icon: <PlusIcon /> },
    { label: 'Question Bank', href: '/dashboard/admin/question-bank', icon: <QuizIcon /> },
    { label: 'Add Question', href: '/dashboard/admin/question-bank/create', icon: <PlusIcon /> },
    { label: 'Approvals', href: '/dashboard/admin/approvals', icon: <CheckIcon /> },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: <ChartIcon /> },
]
const superadminNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/superadmin', icon: <GridIcon /> },
    { label: 'All Users', href: '/dashboard/superadmin/users', icon: <UsersIcon /> },
    { label: 'All Courses', href: '/dashboard/superadmin/courses', icon: <BookIcon /> },
    { label: 'Content Creation', href: '/dashboard/superadmin/content', icon: <EditorIcon /> },
    { label: 'Create Course', href: '/dashboard/superadmin/courses/create', icon: <PlusIcon /> },
    { label: 'Question Bank', href: '/dashboard/superadmin/question-bank', icon: <QuizIcon /> },
    { label: 'Add Question', href: '/dashboard/superadmin/question-bank/create', icon: <PlusIcon /> },
    { label: 'Colleges', href: '/dashboard/superadmin/colleges', icon: <CollegeIcon /> },
    { label: 'Contests', href: '/dashboard/superadmin/contests', icon: <TrophyIcon /> },
    { label: 'Daily Streak', href: '/dashboard/superadmin/daily-streak', icon: <FireIcon /> },
    { label: 'Reports', href: '/dashboard/superadmin/reports', icon: <ChartIcon /> },
    { label: 'Audit Log', href: '/dashboard/superadmin/audit-log', icon: <AuditIcon /> },
    { label: 'Settings', href: '/dashboard/superadmin/settings', icon: <SettingsIcon /> },
]

export default function Sidebar({ role }: { role?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const navItems =
        role === 'STUDENT' ? studentNav :
            role === 'INSTRUCTOR' ? instructorNav :
                role === 'ADMIN' ? adminNav :
                    role === 'SUPERADMIN' ? superadminNav : studentNav

    const roleColor =
        role === 'STUDENT' ? '#10b981' :
            role === 'INSTRUCTOR' ? '#6366f1' :
                role === 'ADMIN' ? '#f97316' :
                    role === 'SUPERADMIN' ? '#ef4444' : '#6366f1'

    const handleLogout = async () => {
        await fetch(`${API_URL}/auth/logout`, { 
            method: 'POST', 
            credentials: 'include',
            headers: getAuthHeaders() 
        })
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
        router.push('/login')
    }

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[var(--text-primary)] font-bold text-lg leading-none">EduVerse</p>
                        <p className="text-xs mt-0.5" style={{ color: roleColor }}>{role}</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="w-5 h-5">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                    onClick={handleLogout}
                    className="sidebar-link w-full text-left text-red-400 hover:text-red-300"
                    style={{ background: 'rgba(239,68,68,0.05)' }}
                >
                    <LogoutIcon />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}

function CheckIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}

function GridIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    )
}
function BookIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    )
}
function UserIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    )
}
function UsersIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    )
}
function LogoutIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    )
}
function PlusIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    )
}
function QuizIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
function TrophyIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    )
}
function FireIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
    )
}
function ChartIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    )
}
function EditorIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    )
}
function CodeIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
    )
}
function ForumIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    )
}
function GraduationCapIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
    )
}
function ProgressIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    )
}
function CollegeIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    )
}
function AuditIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
    )
}
function SettingsIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}
