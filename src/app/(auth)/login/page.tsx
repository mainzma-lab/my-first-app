'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from './actions'

const initialState = { error: null }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Hundepension Schmidt</h1>
          <p className="mt-1 text-sm text-gray-500">Bitte melden Sie sich an</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Passwort
                </label>
                <Link
                  href="/passwort-vergessen"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
