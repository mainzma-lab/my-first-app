'use client'

import { useState, useMemo, useCallback } from 'react'
import { type BookingWithDetails, type Kennel, type CustomerForAutocomplete } from './actions'
import BuchungsStatusBadge from './BuchungsStatusBadge'
import BuchungsModal from './BuchungsModal'

type Props = {
  initialBookings: BookingWithDetails[]
  kennels: Kennel[]
  allActiveCustomers: CustomerForAutocomplete[]
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

function exportCsv(bookings: BookingWithDetails[]) {
  const header = ['ID', 'Kundenname', 'Hunde', 'Zwinger', 'Buchungstyp', 'Von', 'Bis', 'Preis', 'Status']
  const rows = bookings.map(b => [
    b.id.slice(0, 8),
    b.customer_name,
    b.dogs.map(d => d.name).join('; '),
    b.kennels.map(k => k.number).join('; '),
    BOOKING_TYPE_LABELS[b.booking_type] ?? b.booking_type,
    b.start_date,
    b.end_date,
    b.total_price !== null ? String(b.total_price) : '',
    b.status,
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `buchungen-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BuchungsListe({ initialBookings, kennels, allActiveCustomers }: Props) {
  const [bookings, setBookings] = useState(initialBookings)
  const [searchText, setSearchText] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewBooking, setIsNewBooking] = useState(false)

  // Debounce search
  const debounceRef = useMemo(() => ({ current: undefined as ReturnType<typeof setTimeout> | undefined }), [])
  const handleSearchChange = useCallback((val: string) => {
    setSearchText(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchDebounced(val), 300)
  }, [debounceRef])

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter && b.status !== statusFilter) return false
      if (dateFrom && b.start_date < dateFrom) return false
      if (dateTo && b.start_date > dateTo) return false
      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()
        if (!b.customer_name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [bookings, statusFilter, dateFrom, dateTo, searchDebounced])

  function openExisting(booking: BookingWithDetails) {
    setSelectedBooking(booking)
    setIsNewBooking(false)
    setIsModalOpen(true)
  }

  function openNew() {
    setSelectedBooking(null)
    setIsNewBooking(true)
    setIsModalOpen(true)
  }

  function handleModalClose() {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  function handleRefresh(updated: BookingWithDetails) {
    setBookings(prev => {
      const idx = prev.findIndex(b => b.id === updated.id)
      if (idx === -1) return [updated, ...prev]
      const next = [...prev]
      next[idx] = updated
      return next
    })
  }

  function handleNewBookingSaved(created: BookingWithDetails) {
    setBookings(prev => [created, ...prev])
  }

  const activeFilterCount = [statusFilter, dateFrom, dateTo, searchDebounced].filter(Boolean).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Buchungen</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(filtered)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            CSV-Export
          </button>
          <button
            onClick={openNew}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            + Neue Buchung
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Kundenname suchen…"
          value={searchText}
          onChange={e => handleSearchChange(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="">Alle Status</option>
          <option value="geplant">Geplant</option>
          <option value="aktiv">Aktiv</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="storniert">Storniert</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="Von"
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="Bis"
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {searchDebounced && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              Suche: {searchDebounced}
              <button onClick={() => { setSearchText(''); setSearchDebounced('') }} className="ml-0.5 text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
          {statusFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('')} className="ml-0.5 text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              Von: {formatDate(dateFrom)}
              <button onClick={() => setDateFrom('')} className="ml-0.5 text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              Bis: {formatDate(dateTo)}
              <button onClick={() => setDateTo('')} className="ml-0.5 text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400 italic">
            {bookings.length === 0 ? 'Noch keine Buchungen vorhanden.' : 'Keine Buchungen entsprechen den Filtern.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nr.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hunde</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zeitraum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(booking => (
                <tr
                  key={booking.id}
                  onClick={() => openExisting(booking)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{booking.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{booking.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {booking.dogs.length > 0 ? booking.dogs.map(d => d.name).join(', ') : <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(booking.start_date)}
                    {booking.start_date !== booking.end_date && ` – ${formatDate(booking.end_date)}`}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{formatPrice(booking.total_price)}</td>
                  <td className="px-4 py-3"><BuchungsStatusBadge status={booking.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {filtered.length} {filtered.length === 1 ? 'Buchung' : 'Buchungen'} angezeigt
        {filtered.length !== bookings.length && ` (von ${bookings.length} gesamt)`}
      </p>

      <BuchungsModal
        booking={isNewBooking ? null : selectedBooking}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        kennels={kennels}
        allActiveCustomers={allActiveCustomers}
        onSaved={(b, isNew) => {
          if (isNew) handleNewBookingSaved(b)
          else handleRefresh(b)
          handleModalClose()
        }}
        onStatusChanged={handleRefresh}
        onCancelled={(id) => {
          setBookings(prev => prev.map(b =>
            b.id === id ? { ...b, status: 'storniert' } : b
          ))
          handleModalClose()
        }}
      />
    </div>
  )
}
