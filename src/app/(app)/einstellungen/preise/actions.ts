'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string | null; success: string | null }

type PriceRow = {
  id: string
  service_type: string
  dog_count: number
  frequency: string | null
  price_amount: number
  is_monthly: boolean
}

type PriceKey = {
  service_type: string
  dog_count: number
  frequency: string | null
  is_monthly: boolean
}

const PRICE_KEYS: PriceKey[] = [
  { service_type: 'uebernachtung', dog_count: 1, frequency: null, is_monthly: false },
  { service_type: 'uebernachtung', dog_count: 2, frequency: null, is_monthly: false },
  { service_type: 'tagesbetreuung_flexibel', dog_count: 1, frequency: null, is_monthly: false },
  { service_type: 'tagesbetreuung_flexibel', dog_count: 2, frequency: null, is_monthly: false },
  { service_type: 'tagesbetreuung_regelmaessig', dog_count: 1, frequency: '1x_woche', is_monthly: true },
  { service_type: 'tagesbetreuung_regelmaessig', dog_count: 1, frequency: '2x_woche', is_monthly: true },
  { service_type: 'tagesbetreuung_regelmaessig', dog_count: 2, frequency: '1x_woche', is_monthly: true },
  { service_type: 'tagesbetreuung_regelmaessig', dog_count: 2, frequency: '2x_woche', is_monthly: true },
]

function fieldName(key: PriceKey) {
  return `price_${key.service_type}_${key.dog_count}_${key.frequency ?? ''}`
}

export async function updatePreise(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Nicht authentifiziert.', success: null }

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  // Fetch all currently active prices
  const { data: currentPrices, error: fetchError } = await supabase
    .from('prices')
    .select('id, service_type, dog_count, frequency, price_amount, is_monthly')
    .is('valid_to', null)

  if (fetchError) return { error: 'Fehler beim Laden der aktuellen Preise.', success: null }

  const priceMap = new Map<string, PriceRow>()
  for (const p of (currentPrices ?? [])) {
    const key = `${p.service_type}_${p.dog_count}_${p.frequency ?? ''}`
    priceMap.set(key, p)
  }

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  let changedCount = 0

  for (const key of PRICE_KEYS) {
    const raw = formData.get(fieldName(key)) as string
    if (!raw || raw.trim() === '') continue

    const newAmount = parseFloat(raw.replace(',', '.'))
    if (isNaN(newAmount) || newAmount < 0) {
      return { error: `Ungültiger Preis für ${fieldName(key)}.`, success: null }
    }

    const mapKey = `${key.service_type}_${key.dog_count}_${key.frequency ?? ''}`
    const existing = priceMap.get(mapKey)

    if (!existing) {
      // No existing price — insert new
      const { error } = await supabase.from('prices').insert({
        service_type: key.service_type,
        dog_count: key.dog_count,
        frequency: key.frequency,
        price_amount: newAmount,
        is_monthly: key.is_monthly,
        valid_from: today,
        created_by: profile?.id ?? null,
      })
      if (error) return { error: `Fehler beim Speichern eines neuen Preises: ${error.message}`, success: null }
      changedCount++
    } else if (Math.abs(existing.price_amount - newAmount) > 0.001) {
      // Price changed — close old, insert new (versioning)
      const { error: closeError } = await supabase
        .from('prices')
        .update({ valid_to: yesterday })
        .eq('id', existing.id)

      if (closeError) return { error: `Fehler beim Archivieren des alten Preises: ${closeError.message}`, success: null }

      const { error: insertError } = await supabase.from('prices').insert({
        service_type: key.service_type,
        dog_count: key.dog_count,
        frequency: key.frequency,
        price_amount: newAmount,
        is_monthly: key.is_monthly,
        valid_from: today,
        created_by: profile?.id ?? null,
      })
      if (insertError) return { error: `Fehler beim Speichern des neuen Preises: ${insertError.message}`, success: null }
      changedCount++
    }
  }

  revalidatePath('/einstellungen/preise')

  if (changedCount === 0) {
    return { error: null, success: 'Keine Änderungen vorgenommen.' }
  }
  return { error: null, success: `${changedCount} Preis${changedCount > 1 ? 'e' : ''} erfolgreich aktualisiert.` }
}
