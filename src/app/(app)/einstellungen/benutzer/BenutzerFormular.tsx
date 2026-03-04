'use client'

import { useActionState, useState } from 'react'
import { createUser } from './actions'

const initialState = { error: null, success: null }

export default function BenutzerFormular() {
  const [state, formAction, isPending] = useActionState(createUser, initialState)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Neuen Benutzer anlegen
        </button>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Neuen Benutzer anlegen
          </h2>

          {state.error && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
              {state.success}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vollständiger Name
              </label>
              <input
                name="full_name"
                type="text"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="Max Mustermann"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail-Adresse
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="name@beispiel.de"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rolle
              </label>
              <select
                name="role"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Anlegen...' : 'Benutzer anlegen'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
