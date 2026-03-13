'use client'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Navbar({ title }: { title?: string }) {
    const [user, setUser] = useState<any>(null)
    const [time, setTime] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) setUser(JSON.parse(stored))

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

    const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

    return (
        <header className="navbar left-64 right-0 px-8">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{title || 'Dashboard'}</h2>
            </div>

            <div className="flex items-center gap-4 ml-auto">
                {/* Clock */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-raised)] border border-[var(--border)]">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {time}
                </div>

                {/* Notification bell */}
                <button className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                    <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: roleColor }} />
                </button>

                {/* Avatar */}
                <div className="flex items-center gap-3 pl-1 pr-4 py-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-200"
                        style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}ee)` }}>
                        {initials}
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[var(--text-primary)] text-sm font-bold leading-none">{user?.name || 'User'}</p>
                        <p className="text-[10px] uppercase font-bold mt-1 tracking-wider" style={{ color: roleColor }}>{user?.role}</p>
                    </div>
                </div>

                <ThemeToggle />
            </div>
        </header>
    )
}
