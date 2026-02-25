import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth(['ADMIN', 'SUPERADMIN'])

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar userRole={user.role as 'ADMIN' | 'SUPERADMIN'} userName={user.name} />
      <main>{children}</main>
    </div>
  )
}
