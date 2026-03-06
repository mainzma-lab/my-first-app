'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getReportingData,
  type ReportingData,
  type CsvBookingRow,
} from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEuro(amount: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE')
}

function formatPercent(value: number) {
  return `${value.toLocaleString('de-DE')} %`
}

function bookingTypeLabel(type: string): string {
  if (type === 'uebernachtung') return 'Übernachtung'
  if (type === 'tagesbetreuung_flexibel') return 'Tagesbetreuung flex.'
  if (type === 'tagesbetreuung_regelmaessig') return 'Tagesbetreuung reg.'
  return type
}

// ─── Date range helpers ──────────────────────────────────────────────────────

function getWeekRange(): { von: string; bis: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday=0
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    von: monday.toISOString().split('T')[0],
    bis: sunday.toISOString().split('T')[0],
  }
}

function getMonthRange(): { von: string; bis: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    von: first.toISOString().split('T')[0],
    bis: last.toISOString().split('T')[0],
  }
}

function getQuarterRange(): { von: string; bis: string } {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const first = new Date(now.getFullYear(), q * 3, 1)
  const last = new Date(now.getFullYear(), q * 3 + 3, 0)
  return {
    von: first.toISOString().split('T')[0],
    bis: last.toISOString().split('T')[0],
  }
}

function getYearRange(): { von: string; bis: string } {
  const year = new Date().getFullYear()
  return {
    von: `${year}-01-01`,
    bis: `${year}-12-31`,
  }
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string
  subtitle?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function generateCsv(rows: CsvBookingRow[], von: string, bis: string): void {
  const headers = [
    'Buchungsnummer',
    'Kunde',
    'Hunde',
    'Buchungstyp',
    'Zwinger',
    'Start',
    'Ende',
    'Dauer (Tage)',
    'Preis',
    'Status',
    'Stornierungsdatum',
    'Stornierungsgebühr',
  ]

  const csvLines = [headers.join(',')]
  for (const row of rows) {
    csvLines.push(
      [
        escapeCsvField(row.id),
        escapeCsvField(row.customer_name),
        escapeCsvField(row.dog_names),
        escapeCsvField(row.booking_type),
        escapeCsvField(row.kennel_numbers),
        row.start_date,
        row.end_date,
        String(row.duration_days),
        row.total_price != null ? row.total_price.toFixed(2) : '',
        escapeCsvField(row.status),
        row.cancellation_date ?? '',
        row.cancellation_fee != null ? row.cancellation_fee.toFixed(2) : '',
      ].join(',')
    )
  }

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvLines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `buchungen_${von}_${bis}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Main Component ─────────────────────────────────────────────────────────

type QuickSelect = 'week' | 'month' | 'quarter' | 'year' | 'custom'

export default function ReportingClient() {
  const [quickSelect, setQuickSelect] = useState<QuickSelect>('month')
  const [von, setVon] = useState(() => getMonthRange().von)
  const [bis, setBis] = useState(() => getMonthRange().bis)
  const [data, setData] = useState<ReportingData | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback(
    (fromDate: string, toDate: string) => {
      startTransition(async () => {
        const result = await getReportingData(fromDate, toDate)
        setData(result)
      })
    },
    []
  )

  // Initial load
  useEffect(() => {
    fetchData(von, bis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQuickSelect(type: QuickSelect) {
    let range: { von: string; bis: string }
    switch (type) {
      case 'week':
        range = getWeekRange()
        break
      case 'month':
        range = getMonthRange()
        break
      case 'quarter':
        range = getQuarterRange()
        break
      case 'year':
        range = getYearRange()
        break
      default:
        return
    }
    setQuickSelect(type)
    setVon(range.von)
    setBis(range.bis)
    fetchData(range.von, range.bis)
  }

  function handleCustomDateChange(newVon: string, newBis: string) {
    setQuickSelect('custom')
    setVon(newVon)
    setBis(newBis)
    if (newVon && newBis && newBis >= newVon) {
      fetchData(newVon, newBis)
    }
  }

  const quickButtons: { key: QuickSelect; label: string }[] = [
    { key: 'week', label: 'Diese Woche' },
    { key: 'month', label: 'Dieser Monat' },
    { key: 'quarter', label: 'Dieses Quartal' },
    { key: 'year', label: 'Dieses Jahr' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kennzahlen und Auswertungen
          </p>
        </div>
        {data && (
          <button
            onClick={() => generateCsv(data.csvRows, von, bis)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            CSV exportieren
          </button>
        )}
      </div>

      {/* Date Filter */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {quickButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleQuickSelect(btn.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  quickSelect === btn.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Von</label>
            <input
              type="date"
              value={von}
              onChange={(e) => handleCustomDateChange(e.target.value, bis)}
              className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <label className="text-sm text-gray-500">Bis</label>
            <input
              type="date"
              value={bis}
              onChange={(e) => handleCustomDateChange(von, e.target.value)}
              className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Zeitraum: {formatDate(von)} – {formatDate(bis)}
        </p>
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <span className="ml-3 text-sm text-gray-500">Daten werden geladen...</span>
        </div>
      )}

      {/* Content */}
      {data && !isPending && (
        <div className="space-y-8">
          {/* Section 1: Revenue */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-4">Umsatz</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <KpiCard
                label="Gesamtumsatz"
                value={formatEuro(data.totalRevenue)}
                subtitle="ohne stornierte Buchungen"
              />
              <KpiCard
                label="Anzahl Buchungen"
                value={String(data.completedBookingsCount)}
                subtitle="ohne stornierte"
              />
              <KpiCard
                label="Durchschnittlicher Buchungswert"
                value={data.completedBookingsCount > 0 ? formatEuro(data.avgBookingValue) : '–'}
              />
            </div>
            {data.revenueByType.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buchungstyp
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anzahl
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Umsatz
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.revenueByType.map((row) => (
                      <tr key={row.booking_type} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {bookingTypeLabel(row.booking_type)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 text-right">
                          {row.count}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right">
                          {formatEuro(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 2: Occupancy */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-4">Auslastung</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <KpiCard
                label="Belegungsquote"
                value={formatPercent(data.occupancyRate)}
              />
              <KpiCard
                label="Belegte Zwinger-Tage"
                value={String(data.occupiedDays)}
              />
              <KpiCard
                label="Freie Zwinger-Tage"
                value={String(data.freeDays)}
              />
            </div>
            {data.topKennels.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top 5 meistbelegte Zwinger
                  </h3>
                </div>
                <ul className="divide-y divide-gray-200">
                  {data.topKennels.map((k, i) => (
                    <li
                      key={k.kennel_number}
                      className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-900">
                        <span className="text-gray-400 mr-2">{i + 1}.</span>
                        Zwinger {k.kennel_number}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {k.occupied_days} {k.occupied_days === 1 ? 'Tag' : 'Tage'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Section 3: Customers */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-4">Kundenstatistiken</h2>
            <div className="mb-4">
              <KpiCard
                label="Aktive Kunden im Zeitraum"
                value={String(data.activeCustomerCount)}
                subtitle="mit mind. einer Buchung"
              />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Top by bookings */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top 5 nach Anzahl Buchungen
                  </h3>
                </div>
                {data.topCustomersByBookings.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400 italic">Keine Daten</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {data.topCustomersByBookings.map((c, i) => (
                      <li
                        key={c.customer_name + i}
                        className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className="text-sm text-gray-900">
                          <span className="text-gray-400 mr-2">{i + 1}.</span>
                          {c.customer_name}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {c.value} {c.value === 1 ? 'Buchung' : 'Buchungen'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Top by revenue */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top 5 nach Umsatz
                  </h3>
                </div>
                {data.topCustomersByRevenue.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400 italic">Keine Daten</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {data.topCustomersByRevenue.map((c, i) => (
                      <li
                        key={c.customer_name + i}
                        className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className="text-sm text-gray-900">
                          <span className="text-gray-400 mr-2">{i + 1}.</span>
                          {c.customer_name}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {formatEuro(c.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Booking stats */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-4">Buchungsstatistiken</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <KpiCard
                label="Gesamtanzahl Buchungen"
                value={String(data.totalBookingsCount)}
                subtitle="inkl. stornierte"
              />
              <KpiCard
                label="Stornierungsquote"
                value={formatPercent(data.cancellationRate)}
              />
              <KpiCard
                label="Durchschnittliche Aufenthaltsdauer"
                value={data.avgDuration > 0 ? `${data.avgDuration} Tage` : '–'}
                subtitle="ohne stornierte"
              />
            </div>
            {data.statusBreakdown.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anzahl
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.statusBreakdown.map((row) => (
                      <tr key={row.status} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {row.status === 'geplant' && 'Geplant'}
                          {row.status === 'aktiv' && 'Aktiv'}
                          {row.status === 'abgeschlossen' && 'Abgeschlossen'}
                          {row.status === 'storniert' && 'Storniert'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 text-right">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Empty state */}
      {data && !isPending && data.totalBookingsCount === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Keine Buchungen im gewählten Zeitraum.</p>
        </div>
      )}
    </div>
  )
}
