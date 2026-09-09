'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { api } from '@/lib/api'

export default function Navbar({ title }: { title?: string }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    let active = true
    try { setUser(JSON.parse(localStorage.getItem('user') || 'null')) } catch { /* Profile is refreshed below. */ }
    api.get('/auth/me').then(response => {
      if (!active) return
      setUser(response.data)
      localStorage.setItem('user', JSON.stringify(response.data))
    }).catch(error => { if (active && error.response?.status === 401) router.replace('/login') })
    return () => { active = false }
  }, [router])
  if (user?.role === 'STUDENT') return null
  return <header className="navbar portal-role-header">
    <div><p className="portal-role-title">{title || 'Workspace'}</p><small>{user?.collegeName || (user?.role === 'SUPERADMIN' ? 'Platform administration' : 'EduVerse')}</small></div>
    <div className="portal-role-account"><ThemeToggle /><div><strong>{user?.name || 'Your account'}</strong><small>{user?.role?.toLowerCase().replace('superadmin', 'super admin')}</small></div></div>
  </header>
}
