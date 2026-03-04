import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserProvider, type UserProfile } from '@/context/user-context'
import Sidebar from '@/components/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role, full_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile) {
    // Session existiert, aber kein users-Profil → ausloggen um Redirect-Loop zu vermeiden
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <UserProvider user={profile as UserProfile}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </UserProvider>
  )
}
