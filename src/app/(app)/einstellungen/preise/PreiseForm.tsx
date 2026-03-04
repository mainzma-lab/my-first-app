'use client'

import { useActionState } from 'react'
import { updatePreise } from './actions'

type Price = {
  service_type: string
  dog_count: number
  frequency: string | null
  price_amount: number
  valid_from: string
}

type Props = {
  prices: Price[]
}

const initialState = { error: null, success: null }

function findPrice(prices: Price[], serviceType: string, dogCount: number, frequency: string | null) {
  return prices.find(
    p => p.service_type === serviceType && p.dog_count === dogCount && p.frequency === frequency
  ) ?? null
}

function formatAmount(amount: number | undefined) {
  if (amount === undefined) return ''
  return amount.toFixed(2).replace('.', ',')
}

function fieldName(serviceType: string, dogCount: number, frequency: string | null) {
  return `price_${serviceType}_${dogCount}_${frequency ?? ''}`
}

const inputClass = 'w-28 h-10 rounded-md border border-gray-300 px-3 text-sm text-right focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'

function PriceRow({
  label,
  sublabel,
  unit,
  name,
  defaultValue,
  validFrom,
}: {
  label: string
  sublabel?: string
  unit: string
  name: string
  defaultValue: string
  validFrom?: string
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {sublabel && <span className="ml-2 text-sm text-gray-500">{sublabel}</span>}
        {validFrom && (
          <p className="text-xs text-gray-400 mt-0.5">
            Gültig seit {new Date(validFrom).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          inputMode="decimal"
          className={inputClass}
          placeholder="0,00"
        />
        <span className="text-sm text-gray-500 w-20">{unit}</span>
      </div>
    </div>
  )
}

export default function PreiseForm({ prices }: Props) {
  const [state, formAction, isPending] = useActionState(updatePreise, initialState)

  const p = (st: string, dc: number, fr: string | null) => findPrice(prices, st, dc, fr)

  return (
    <form action={formAction} className="space-y-6">

      {/* Übernachtung */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Übernachtung</h2>
        <p className="text-xs text-gray-500 mb-4">Preis pro Tag (Bring- und Abholtag zählen je als voller Tag)</p>
        <PriceRow
          label="1 Hund"
          unit="€ pro Tag"
          name={fieldName('uebernachtung', 1, null)}
          defaultValue={formatAmount(p('uebernachtung', 1, null)?.price_amount)}
          validFrom={p('uebernachtung', 1, null)?.valid_from}
        />
        <PriceRow
          label="2 Hunde"
          unit="€ pro Tag"
          name={fieldName('uebernachtung', 2, null)}
          defaultValue={formatAmount(p('uebernachtung', 2, null)?.price_amount)}
          validFrom={p('uebernachtung', 2, null)?.valid_from}
        />
      </div>

      {/* Flexible Tagesbetreuung */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Flexible Tagesbetreuung</h2>
        <p className="text-xs text-gray-500 mb-4">Preis pro Tag</p>
        <PriceRow
          label="1 Hund"
          unit="€ pro Tag"
          name={fieldName('tagesbetreuung_flexibel', 1, null)}
          defaultValue={formatAmount(p('tagesbetreuung_flexibel', 1, null)?.price_amount)}
          validFrom={p('tagesbetreuung_flexibel', 1, null)?.valid_from}
        />
        <PriceRow
          label="2 Hunde"
          unit="€ pro Tag"
          name={fieldName('tagesbetreuung_flexibel', 2, null)}
          defaultValue={formatAmount(p('tagesbetreuung_flexibel', 2, null)?.price_amount)}
          validFrom={p('tagesbetreuung_flexibel', 2, null)?.valid_from}
        />
      </div>

      {/* Regelmäßige Tagesbetreuung */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Regelmäßige Tagesbetreuung</h2>
        <p className="text-xs text-gray-500 mb-4">Monatspreis (unabhängig von der Aufenthaltsdauer)</p>
        <PriceRow
          label="1 Hund"
          sublabel="1× pro Woche"
          unit="€ pro Monat"
          name={fieldName('tagesbetreuung_regelmaessig', 1, '1x_woche')}
          defaultValue={formatAmount(p('tagesbetreuung_regelmaessig', 1, '1x_woche')?.price_amount)}
          validFrom={p('tagesbetreuung_regelmaessig', 1, '1x_woche')?.valid_from}
        />
        <PriceRow
          label="1 Hund"
          sublabel="2× pro Woche"
          unit="€ pro Monat"
          name={fieldName('tagesbetreuung_regelmaessig', 1, '2x_woche')}
          defaultValue={formatAmount(p('tagesbetreuung_regelmaessig', 1, '2x_woche')?.price_amount)}
          validFrom={p('tagesbetreuung_regelmaessig', 1, '2x_woche')?.valid_from}
        />
        <PriceRow
          label="2 Hunde"
          sublabel="1× pro Woche"
          unit="€ pro Monat"
          name={fieldName('tagesbetreuung_regelmaessig', 2, '1x_woche')}
          defaultValue={formatAmount(p('tagesbetreuung_regelmaessig', 2, '1x_woche')?.price_amount)}
          validFrom={p('tagesbetreuung_regelmaessig', 2, '1x_woche')?.valid_from}
        />
        <PriceRow
          label="2 Hunde"
          sublabel="2× pro Woche"
          unit="€ pro Monat"
          name={fieldName('tagesbetreuung_regelmaessig', 2, '2x_woche')}
          defaultValue={formatAmount(p('tagesbetreuung_regelmaessig', 2, '2x_woche')?.price_amount)}
          validFrom={p('tagesbetreuung_regelmaessig', 2, '2x_woche')?.valid_from}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Speichern…' : 'Preise speichern'}
        </button>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-600">{state.success}</p>}
      </div>

      <p className="text-xs text-gray-400">
        Preisänderungen wirken sich nur auf neue Buchungen aus. Bestehende Buchungen behalten ihren gespeicherten Preis.
      </p>
    </form>
  )
}
