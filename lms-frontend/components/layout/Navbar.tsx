'use client'
import { useEffect, useState } from 'react'

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
        <header className="navbar left-64 right-0">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white">{title || 'Dashboard'}</h2>
            </div>

            <div className="flex items-center gap-4">
                {/* Clock */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {time}
                </div>

                {/* Notification bell */}
                <button className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: roleColor }} />
                </button>

                {/* Avatar */}
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}aa)` }}>
                        {initials}
                    </div>
                    <div className="hidden md:block">
                        <p className="text-white text-sm font-medium leading-none">{user?.name || 'User'}</p>
                        <p className="text-xs mt-0.5" style={{ color: roleColor }}>{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    )
}
