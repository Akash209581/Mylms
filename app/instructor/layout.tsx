import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth(['INSTRUCTOR'])

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar userRole={user.role as 'INSTRUCTOR'} userName={user.name} />
      <main>{children}</main>
    </div>
  )
}
