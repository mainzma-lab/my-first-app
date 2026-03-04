'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionState = { error: string | null }

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'E-Mail oder Passwort ist falsch.' }
  }

  redirect('/dashboard')
}
