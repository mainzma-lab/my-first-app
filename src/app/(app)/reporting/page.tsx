import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportingClient from './ReportingClient'

export default async function ReportingPage() {
  const supabase = await createClient()

  // Nur Admins dürfen diese Seite sehen
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  return <ReportingClient />
}
