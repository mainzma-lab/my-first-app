'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionState = { error: string | null }

export async function updatePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'Die Passwörter stimmen nicht überein.' }
  }
  if (password.length < 8) {
    return { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Fehler beim Speichern. Bitte fordern Sie einen neuen Link an.' }
  }

  redirect('/dashboard')
}
