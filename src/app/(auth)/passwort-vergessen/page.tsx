'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'

const initialState = { error: null, success: null }

export default function PasswortVergessenPage() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {state.success ? (
            <div className="text-center">
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200 mb-5">
                {state.success}
              </div>
              <Link
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Zurück zur Anmeldung
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              {state.error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {state.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="name@beispiel.de"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Senden...' : 'Link anfordern'}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Zurück zur Anmeldung
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
