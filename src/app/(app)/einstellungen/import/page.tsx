import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImportWizard from './ImportWizard'

export default async function ImportPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CSV-Import Bestandskunden</h1>
        <p className="mt-1 text-sm text-gray-500">
          Importieren Sie Bestandskunden mit ihren Hunden aus einer CSV-Datei
        </p>
      </div>

      <ImportWizard />
    </div>
  )
}
