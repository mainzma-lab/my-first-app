'use client'

import { useActionState } from 'react'
import { updateInactivityThreshold } from './actions'

const initialState = { error: null, success: null }

export default function InaktivitaetForm({ currentValue }: { currentValue: number }) {
  const [state, formAction, isPending] = useActionState(updateInactivityThreshold, initialState)

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inaktiv nach … Monaten ohne Buchung
        </label>
        <div className="flex items-center gap-2">
          <input
            name="inactivity_threshold_months"
            type="number"
            min={1}
            max={60}
            required
            defaultValue={currentValue}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <span className="text-sm text-gray-500">Monate</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Stammkunden ohne Buchung in diesem Zeitraum werden als inaktiv markiert. (1–60 Monate)
        </p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Speichern…' : 'Speichern'}
      </button>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}
    </form>
  )
}
