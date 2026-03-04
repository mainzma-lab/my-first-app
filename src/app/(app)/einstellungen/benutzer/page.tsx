import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BenutzerFormular from './BenutzerFormular'
import BenutzerAktionen from './BenutzerAktionen'

export default async function BenutzerVerwaltungPage() {
  const supabase = await createClient()

  // Nur Admins dürfen diese Seite sehen
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  // Alle Benutzer laden
  const { data: users, error } = await supabase
    .from('users')
    .select('id, auth_user_id, full_name, email, role, created_at')
    .order('created_at', { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h1>
          <p className="mt-1 text-sm text-gray-500">
            Mitarbeiter-Accounts anlegen und verwalten
          </p>
        </div>
      </div>

      <div className="mb-6">
        <BenutzerFormular />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          Fehler beim Laden der Benutzer.
        </div>
      )}

      {!error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-Mail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users && users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BenutzerAktionen user={user} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-gray-400"
                  >
                    Noch keine Benutzer vorhanden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
