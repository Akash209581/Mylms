import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'

export default async function Home() {
  const user = await getServerSession()

  if (user) {
    if (user.role === 'STUDENT') {
      redirect('/student/dashboard')
    } else if (user.role === 'INSTRUCTOR') {
      redirect('/instructor/dashboard')
    } else if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      redirect('/admin/dashboard')
    }
  }

  redirect('/login')
}
