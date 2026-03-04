import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InaktivitaetForm from './InaktivitaetForm'

export default async function CrmEinstellungenPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'inactivity_threshold_months')
    .single()

  const currentValue = parseInt(setting?.value ?? '9', 10)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CRM Einstellungen</h1>
        <p className="mt-1 text-sm text-gray-500">Regeln für die automatische Kundenverwaltung</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Inaktivitätsschwelle</h2>
        <InaktivitaetForm currentValue={currentValue} />
      </div>
    </div>
  )
}
