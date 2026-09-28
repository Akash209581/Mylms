'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getCurrentUser } from '@/lib/session'

export default function Navbar({ title }: { title?: string }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    let active = true
    try { setUser(JSON.parse(localStorage.getItem('user') || 'null')) } catch { /* Profile is refreshed below. */ }
    getCurrentUser().then(profile => { if (active) setUser(profile) }).catch(error => { if (active && error.response?.status === 401) router.replace('/login') })
    return () => { active = false }
  }, [router])
  if (user?.role === 'STUDENT') return null
  const initials = (user?.name || '').split(' ').filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || '·'
  const roleLabel = user?.role ? String(user.role).toLowerCase().replace('superadmin', 'super admin').replace('_', ' ') : ''
  return <header className="navbar portal-role-header">
    <div><p className="portal-role-title">{title || 'Workspace'}</p><small>{user?.collegeName || (user?.role === 'SUPERADMIN' ? 'Platform administration' : 'Applied STEM Labs')}</small></div>
    <div className="portal-role-account">
      <ThemeToggle />
      <div className="flex items-center gap-3">
        <span className="shell-avatar" aria-hidden="true">{initials}</span>
        <div><strong>{user?.name || 'Your account'}</strong><small>{roleLabel}</small></div>
      </div>
    </div>
  </header>
}
