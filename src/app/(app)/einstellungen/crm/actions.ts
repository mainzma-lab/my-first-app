'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string | null; success: string | null }

export async function updateInactivityThreshold(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  // Admin check
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Nicht authentifiziert.', success: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Nur Administratoren können Einstellungen ändern.', success: null }
  }

  const rawValue = formData.get('inactivity_threshold_months') as string
  const months = parseInt(rawValue, 10)

  if (isNaN(months) || months < 1 || months > 60) {
    return { error: 'Bitte eine Zahl zwischen 1 und 60 eingeben.', success: null }
  }

  const { data: updatedBy } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  const { error } = await supabase
    .from('system_settings')
    .update({ value: String(months), updated_by: updatedBy?.id, updated_at: new Date().toISOString() })
    .eq('key', 'inactivity_threshold_months')

  if (error) {
    return { error: 'Fehler beim Speichern der Einstellung.', success: null }
  }

  revalidatePath('/einstellungen/crm')
  revalidatePath('/kunden')
  return { error: null, success: `Inaktivitätsschwelle auf ${months} Monate gesetzt.` }
}
