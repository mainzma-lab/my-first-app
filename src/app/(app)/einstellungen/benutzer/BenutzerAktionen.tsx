'use client'

import { deleteUser, updateUserRole } from './actions'
import { useUser } from '@/context/user-context'

type User = {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  role: 'admin' | 'mitarbeiter'
}

export default function BenutzerAktionen({ user }: { user: User }) {
  const currentUser = useUser()
  const isCurrentUser = currentUser.id === user.id

  async function handleRoleChange(newRole: 'admin' | 'mitarbeiter') {
    if (!confirm(`Rolle von „${user.full_name}" auf „${newRole === 'admin' ? 'Administrator' : 'Mitarbeiter'}" ändern?`)) return
    await updateUserRole(user.id, newRole)
  }

  async function handleDelete() {
    if (isCurrentUser) {
      alert('Sie können sich nicht selbst löschen.')
      return
    }
    if (!confirm(`Benutzer „${user.full_name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return
    await deleteUser(user.id, user.auth_user_id)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={user.role}
        onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'mitarbeiter')}
        disabled={isCurrentUser}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="mitarbeiter">Mitarbeiter</option>
        <option value="admin">Administrator</option>
      </select>
      <button
        onClick={handleDelete}
        disabled={isCurrentUser}
        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isCurrentUser ? 'Eigenen Account nicht löschbar' : `${user.full_name} löschen`}
      >
        Löschen
      </button>
    </div>
  )
}
