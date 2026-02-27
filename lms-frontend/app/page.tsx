'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      router.push('/login')
    } else {
      const user = JSON.parse(stored)
      if (user.role === 'STUDENT') router.push('/dashboard/student')
      else if (user.role === 'INSTRUCTOR') router.push('/dashboard/instructor')
      else if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') router.push('/dashboard/superadmin')
      else router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
