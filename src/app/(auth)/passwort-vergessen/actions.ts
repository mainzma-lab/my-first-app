'use server'

import { createClient } from '@/lib/supabase/server'

type ActionState = { error: string | null; success: string | null }

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get('email') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/passwort-zuruecksetzen`,
  })

  if (error) {
    return { error: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.', success: null }
  }

  return {
    error: null,
    success: 'E-Mail gesendet! Bitte prüfen Sie Ihren Posteingang.',
  }
}
