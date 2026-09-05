'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BookOpen, ChevronDown, ChevronRight, CircleCheck, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Search, Settings, Trophy } from 'lucide-react'
import { API_URL } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

type ActivePage = 'dashboard' | 'courses' | 'progress' | 'settings' | 'certificates' | 'discussions'
const initials = (name?: string) => name?.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'AB'

export default function StudentReferenceShell({ active }: { active: ActivePage }) {
    const router = useRouter(), [user, setUser] = useState<any>(null), [notificationsOpen, setNotificationsOpen] = useState(false), [profileOpen, setProfileOpen] = useState(false)
    useEffect(() => { const stored = localStorage.getItem('user'); if (stored) setUser(JSON.parse(stored)) }, [])
    const nav = [
        [LayoutDashboard, 'Dashboard', '/dashboard/student', active === 'dashboard'], [GraduationCap, 'My Courses', '/dashboard/student/courses', active === 'courses'],
        [CircleCheck, 'Assignments', '/dashboard/student/progress', active === 'progress'], [Trophy, 'Certificates', '/dashboard/student/certificates', active === 'certificates'],
        [MessageCircle, 'Discussion', '/dashboard/student/forums', active === 'discussions'], [Settings, 'Settings', '/dashboard/student/profile', active === 'settings'],
    ]
    const signOut = async () => { try { await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include', headers: getAuthHeaders() }) } finally { localStorage.removeItem('user'); router.push('/login') } }
    return <><aside className="reference-student-sidebar"><div className="reference-brand"><span><BookOpen /></span><div><p>EduVerse</p><small>Learn. Grow. Succeed.</small></div></div><div className="reference-line" /><nav>{nav.map(([Icon, label, href, selected]: any) => <div key={label}><button onClick={() => router.push(href)} className={selected ? 'active' : ''}><Icon /><span>{label}</span></button></div>)}</nav><div className="reference-sidebar-footer"><div className="reference-sidebar-promo"><GraduationCap /><p>Small progress<br />every day leads<br />to big results.</p></div><button className="reference-profile" onClick={() => router.push('/dashboard/student/profile')}><span>{initials(user?.name)}</span><div><strong>{user?.name || 'Akash Bandaru'}</strong><small>Student</small></div><ChevronRight /></button><button className="reference-signout" onClick={signOut}><LogOut /> Sign Out</button></div></aside><header className="reference-student-header"><div className="reference-search"><Search /><input placeholder="Search for courses, lessons, quizzes..." /><kbd>Ctrl K</kbd></div><div className="reference-header-actions"><div className="reference-header-popover-wrap"><button aria-label="Notifications" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }} className="reference-icon-button"><Bell /><b>5</b></button>{notificationsOpen && <div className="reference-popover notification-popover"><strong>Notifications</strong><p>Welcome back! Continue your learning journey.</p><p>Your course activity is ready to review.</p><button onClick={() => setNotificationsOpen(false)}>Mark all as read</button></div>}</div><div className="reference-header-popover-wrap"><button aria-label="Account menu" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }} className="reference-user"><span>{initials(user?.name)}</span><div><strong>{user?.name?.split(' ')[0] || 'Akash'}</strong><small>Student</small></div><ChevronDown /></button>{profileOpen && <div className="reference-popover account-popover"><button onClick={() => router.push('/dashboard/student/profile')}>Profile & Settings</button><button onClick={signOut}>Sign Out</button></div>}</div></div></header></>
}
