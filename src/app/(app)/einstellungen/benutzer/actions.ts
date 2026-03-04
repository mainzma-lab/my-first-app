'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string | null; success: string | null }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Kein Adminzugang')
}

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch (e: unknown) {
    return { error: (e as Error).message, success: null }
  }

  const email = formData.get('email') as string
  const fullName = formData.get('full_name') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'admin' | 'mitarbeiter'

  if (!email || !fullName || !password || !role) {
    return { error: 'Alle Felder sind Pflichtfelder.', success: null }
  }
  if (password.length < 8) {
    return { error: 'Passwort muss mindestens 8 Zeichen lang sein.', success: null }
  }

  try {
    const adminClient = createAdminClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authUser) {
      if (authError?.message.includes('already')) {
        return { error: 'Diese E-Mail-Adresse ist bereits vergeben.', success: null }
      }
      return { error: 'Fehler beim Anlegen des Benutzers.', success: null }
    }

    const { error: profileError } = await adminClient.from('users').insert({
      auth_user_id: authUser.id,
      email,
      full_name: fullName,
      role,
    })

    if (profileError) {
      // Auth-User wieder löschen um inkonsistente Zustände zu vermeiden
      await adminClient.auth.admin.deleteUser(authUser.id)
      return { error: 'Fehler beim Anlegen des Benutzerprofils.', success: null }
    }

    revalidatePath('/einstellungen/benutzer')
    return { error: null, success: `Benutzer „${fullName}" wurde erfolgreich angelegt.` }
  } catch (e: unknown) {
    return { error: (e as Error).message, success: null }
  }
}

export async function deleteUser(userId: string, authUserId: string) {
  try {
    await requireAdmin()
  } catch {
    return
  }

  try {
    const adminClient = createAdminClient()
    // Löschen aus auth.users kaskadiert automatisch auf users-Tabelle
    await adminClient.auth.admin.deleteUser(authUserId)
    revalidatePath('/einstellungen/benutzer')
  } catch {
    // Fehler werden im UI nicht direkt angezeigt (Server Action ohne State)
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'mitarbeiter') {
  try {
    await requireAdmin()
  } catch {
    return
  }

  const supabase = await createClient()
  await supabase.from('users').update({ role }).eq('id', userId)
  revalidatePath('/einstellungen/benutzer')
}
