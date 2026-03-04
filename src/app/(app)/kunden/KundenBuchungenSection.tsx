'use client'

import { type BookingWithDetails } from '../buchungen/actions'
import BuchungsStatusBadge from '../buchungen/BuchungsStatusBadge'

type Props = {
  bookings: BookingWithDetails[]
  onNewBooking: () => void
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  uebernachtung: 'Übernachtung',
  tagesbetreuung_flexibel: 'Tagesbetreuung (flex.)',
  tagesbetreuung_regelmaessig: 'Tagesbetreuung (regelm.)',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPrice(price: number | null) {
  if (price === null) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
}

export default function KundenBuchungenSection({ bookings, onNewBooking }: Props) {
  const nextBooking = bookings.find(b => b.status === 'geplant' || b.status === 'aktiv')
  const otherBookings = bookings.filter(b => b !== nextBooking)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{bookings.length === 0 ? 'Noch keine Buchungen.' : `${bookings.length} ${bookings.length === 1 ? 'Buchung' : 'Buchungen'}`}</p>
        <button
          onClick={onNewBooking}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Neue Buchung
        </button>
      </div>

      {bookings.length === 0 && (
        <p className="text-sm text-gray-400 italic">Noch keine Buchungen vorhanden.</p>
      )}

      {/* Highlighted next/active booking */}
      {nextBooking && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                {nextBooking.status === 'aktiv' ? 'Aktuelle Buchung' : 'Nächste Buchung'}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {BOOKING_TYPE_LABELS[nextBooking.booking_type] ?? nextBooking.booking_type}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {formatDate(nextBooking.start_date)} – {formatDate(nextBooking.end_date)}
                <span className="text-gray-400 text-xs ml-1">({nextBooking.duration_days} {nextBooking.duration_days === 1 ? 'Tag' : 'Tage'})</span>
              </p>
              {nextBooking.dogs.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{nextBooking.dogs.map(d => d.name).join(', ')}</p>
              )}
              {nextBooking.kennels.length > 0 && (
                <p className="text-xs text-gray-500">{nextBooking.kennels.map(k => `Zwinger ${k.number}`).join(', ')}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <BuchungsStatusBadge status={nextBooking.status} />
              <p className="text-sm font-semibold text-gray-900">{formatPrice(nextBooking.total_price)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Remaining bookings */}
      {otherBookings.length > 0 && (
        <div className="space-y-1.5">
          {otherBookings.map(booking => (
            <div
              key={booking.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2.5"
            >
              <div>
                <p className="text-sm text-gray-900">
                  {BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-gray-600">{formatDate(booking.start_date)} – {formatDate(booking.end_date)}</span>
                </p>
                {booking.dogs.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{booking.dogs.map(d => d.name).join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-sm text-gray-700">{formatPrice(booking.total_price)}</span>
                <BuchungsStatusBadge status={booking.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
