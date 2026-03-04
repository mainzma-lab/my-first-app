import { createClient } from '@/lib/supabase/server'
import KundenListe from './KundenListe'

export default async function KundenPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customer_overview')
    .select('*')
    .order('last_name_1', { ascending: true })

  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'inactivity_threshold_months')
    .single()

  const inactivityThreshold = parseInt(setting?.value ?? '9', 10)

  return (
    <div className="p-8">
      <KundenListe
        customers={customers ?? []}
        inactivityThreshold={inactivityThreshold}
      />
    </div>
  )
}
