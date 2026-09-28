'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getRoleHomePath } from '@/lib/roleUtils'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      router.replace(user?.role ? getRoleHomePath(user.role) : '/login')
    } catch {
      localStorage.removeItem('user')
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center" aria-busy="true">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
