import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PreiseForm from './PreiseForm'

export default async function PreisePage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: prices } = await supabase
    .from('prices')
    .select('service_type, dog_count, frequency, price_amount, valid_from')
    .is('valid_to', null)
    .order('service_type')
    .order('dog_count')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Preise</h1>
        <p className="mt-1 text-sm text-gray-500">Preise für alle Betreuungsleistungen festlegen</p>
      </div>

      <div className="max-w-2xl">
        <PreiseForm prices={prices ?? []} />
      </div>
    </div>
  )
}
