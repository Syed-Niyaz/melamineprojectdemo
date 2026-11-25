import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  const cookieStore = await cookies()
  const demoRole = cookieStore.get('demo_role')?.value

  if (demoRole === 'admin') {
    redirect('/admin')
  } else if (demoRole === 'salesperson') {
    redirect('/dashboard')
  }

  redirect('/login')
}
