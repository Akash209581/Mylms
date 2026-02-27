import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')
  if (!token) redirect('/login')
  redirect('/login')
}
