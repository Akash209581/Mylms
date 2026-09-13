'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, LogOut, Menu, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'
import { isStudentRouteActive, studentNavigation } from './studentNavigation'
import styles from './StudentShell.module.css'

type ActivePage = 'dashboard' | 'courses' | 'progress' | 'settings' | 'certificates' | 'discussions' | 'my-learning' | 'saved' | 'exams' | 'grades' | 'leaderboard'

export default function StudentReferenceShell(_props: { active?: ActivePage }) {
  const router = useRouter(), pathname = usePathname()
  const [user, setUser] = useState<{ name?: string } | null>(null)
  const [query, setQuery] = useState(''), [error, setError] = useState(''), [signingOut, setSigningOut] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user') || 'null')) } catch { setUser(null) }
  }, [])
  const closeDrawer = () => { drawer.current?.close(); menuButton.current?.focus() }
  useEffect(() => {
    drawer.current?.close()
    const main = document.querySelector('main')
    if (main && !main.id) { main.id = 'student-main'; main.tabIndex = -1 }
  }, [pathname])
  const signOut = () => {
    setSigningOut(true); setError('')
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.replace('/login')

    api.post('/auth/logout').catch((err) => {
      console.warn('Background student logout:', err)
    }).finally(() => {
      setSigningOut(false)
    })
  }
  const search = (event: FormEvent) => {
    event.preventDefault()
    router.push(`/dashboard/student/courses?q=${encodeURIComponent(query.trim())}`)
  }
  const navigation = <>
    <Link href="/dashboard/student" className={styles.brand}><BookOpen aria-hidden="true" /><span>Applied Stem labs<small>Student workspace</small></span></Link>
    <nav aria-label="Student navigation" className={styles.navigation}>
      {studentNavigation.map(({ label, href, icon: Icon }) => <Link key={href} href={href} aria-current={isStudentRouteActive(pathname, href) ? 'page' : undefined} onClick={() => drawer.current?.close()}><Icon aria-hidden="true" /><span>{label}</span></Link>)}
    </nav>
    <div className={styles.footer}>
      <p>{user?.name || 'Student'}<small>Keep making progress, one lesson at a time.</small></p>
      <button onClick={signOut} disabled={signingOut}><LogOut aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}</button>
      {error && <p role="alert">{error}</p>}
    </div>
  </>
  return <div className={styles.root} data-student-shell>
    <a className={styles.skip} href="#student-main">Skip to main content</a>
    <aside className={styles.sidebar}>{navigation}</aside>
    <dialog ref={drawer} className={styles.drawer} aria-label="Student menu" onClose={() => menuButton.current?.focus()}>
      <button className={styles.close} onClick={closeDrawer} aria-label="Close navigation"><X /></button>
      {navigation}
    </dialog>
    <header className={styles.header}>
      <button ref={menuButton} className={styles.menu} onClick={() => drawer.current?.showModal()} aria-label="Open navigation"><Menu /></button>
      <form role="search" onSubmit={search} className={styles.search}>
        <Search aria-hidden="true" /><input aria-label="Search courses" placeholder="Search courses" value={query} onChange={event => setQuery(event.target.value)} />
        <button type="submit">Search</button>
      </form>
      <ThemeToggle />
      <Link href="/dashboard/student/profile" className={styles.account} aria-label="Open your profile">{user?.name?.split(' ').map(part => part[0]).slice(0, 2).join('') || 'S'}</Link>
    </header>
  </div>
}
