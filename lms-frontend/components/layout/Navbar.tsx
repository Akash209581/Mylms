'use client'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { api } from '@/lib/api'
import { useTheme } from 'next-themes'

export default function Navbar({ title }: { title?: string }) {
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [time, setTime] = useState('')

    useEffect(() => {
        setMounted(true)
        const stored = localStorage.getItem('user')
        if (stored) setUser(JSON.parse(stored))

        // Refresh profile to get latest college logo and user info
        api.get('/auth/me').then(res => {
            const updatedUser = res.data
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
        }).catch(err => {
            console.error('Failed to refresh profile:', err)
        })

        const tick = () => {
            const now = new Date()
            setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        }
        tick()
        const t = setInterval(tick, 1000)
        return () => clearInterval(t)
    }, [])

    const roleColor = user?.role === 'STUDENT' ? '#10b981' :
        user?.role === 'INSTRUCTOR' ? '#6366f1' :
            user?.role === 'ADMIN' ? '#f97316' :
                user?.role === 'SUPERADMIN' ? '#ef4444' : '#6366f1'

    const isDarkBackground = mounted && theme && theme !== 'light'
    const roleTextColor = isDarkBackground
        ? (user?.role === 'STUDENT' ? '#10b981' :
           user?.role === 'INSTRUCTOR' ? '#818cf8' :
           user?.role === 'ADMIN' ? '#fb923c' :
           user?.role === 'SUPERADMIN' ? '#f87171' : '#818cf8')
        : (user?.role === 'STUDENT' ? '#047857' :
           user?.role === 'INSTRUCTOR' ? '#4338ca' :
           user?.role === 'ADMIN' ? '#c2410c' :
           user?.role === 'SUPERADMIN' ? '#b91c1c' : '#4338ca')

    const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

    return (
        <header className="navbar left-64 right-0 px-8 py-3 h-20 flex items-center justify-between border-b bg-[var(--bg-surface)]/80 backdrop-blur-md sticky top-0 z-40" style={{ borderColor: 'var(--border)' }}>
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search for courses, lessons, quizzes..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-base)] text-sm text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-gray-400 font-medium"
                />
            </div>

            <div className="flex items-center gap-4 ml-auto">
                {/* Notification bell with unread count badge */}
                <button 
                    aria-label="View notifications" 
                    className="relative w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all shadow-sm group"
                >
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-[var(--bg-surface)] shadow-sm">
                        5
                    </span>
                </button>

                {/* Theme Toggle */}
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border)]">
                    <ThemeToggle />
                </div>

                {/* User Profile Pill Menu */}
                <div className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] shadow-sm hover:shadow transition-all cursor-pointer">
                    {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            {initials}
                        </div>
                    )}
                    <div className="hidden sm:block text-left">
                        <p className="text-[var(--text-primary)] text-xs font-extrabold leading-none">{user?.name?.split(' ')[0] || 'Akash'}</p>
                        <p className="text-[10px] capitalize text-gray-400 font-semibold mt-0.5">{user?.role?.toLowerCase() || 'Student'}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </header>
    )
}
