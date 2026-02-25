import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerSession()

  if (!user || user.role !== 'STUDENT') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar userRole={user.role as 'STUDENT'} userName={user.name} />
      <main>{children}</main>
    </div>
  )
}
