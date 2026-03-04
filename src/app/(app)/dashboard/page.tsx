import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function formatEuro(amount: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function bookingTypeLabel(type: string) {
  if (type === 'uebernachtung') return 'Übernachtung'
  if (type === 'tagesbetreuung_flexibel') return 'Tagesbetreuung'
  if (type === 'tagesbetreuung_regelmaessig') return 'Regelm. Tagesbetreuung'
  return type
}

type BookingRow = {
  id: string
  booking_type: string
  end_date?: string
  customers: { first_name_1: string; last_name_1: string } | null
  booking_dogs: Array<{ dogs: { name: string } | null }>
  booking_kennels: Array<{ kennels: { number: number } | null }>
}

function TagesKarte({
  title,
  items,
  emptyText,
  showDate = false,
}: {
  title: string
  items: BookingRow[]
  emptyText: string
  showDate?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-3">
        {title}
        {items.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400">({items.length})</span>
        )}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => {
            const dogNames = b.booking_dogs
              .map((bd) => bd.dogs?.name)
              .filter(Boolean)
              .join(', ')
            const kennelNrs = b.booking_kennels
              .map((bk) => bk.kennels?.number)
              .filter((n) => n != null)
              .sort((a, b) => (a as number) - (b as number))
              .join(', ')
            return (
              <li key={b.id} className="border-l-2 border-gray-200 pl-3 py-0.5">
                <div className="text-sm font-medium text-gray-900">
                  {b.customers?.last_name_1}, {b.customers?.first_name_1}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {bookingTypeLabel(b.booking_type)}
                    {showDate && b.end_date && (
                      <> · fällig {new Date(b.end_date).toLocaleDateString('de-DE')}</>
                    )}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {dogNames && <span>{dogNames}</span>}
                  {kennelNrs ? (
                    <span className="text-gray-400"> · Zwinger {kennelNrs}</span>
                  ) : (
                    <span className="text-amber-500"> · Kein Zwinger zugewiesen</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const BOOKING_SELECT = `
  id, booking_type, end_date,
  customers (first_name_1, last_name_1),
  booking_dogs (dogs (name)),
  booking_kennels (kennels (number))
` as const

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('auth_user_id', authUser.id)
    .single()

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const firstDayOfMonth = today.substring(0, 7) + '-01'
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const firstDayOfYear = today.substring(0, 4) + '-01-01'
  const lastDayOfYear = today.substring(0, 4) + '-12-31'

  const [
    { count: customerCount },
    { count: dogCount },
    { count: activeKennelCount },
    { data: activeBookingsData },
    { data: monthlyBookings },
    { data: yearlyBookings },
    { data: todayArrivals },
    { data: todayDepartures },
    { data: tomorrowArrivals },
    { data: tomorrowDepartures },
    { data: overdueBookings },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('dogs').select('*', { count: 'exact', head: true }),
    supabase.from('kennels').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('bookings')
      .select('booking_kennels(kennel_id)')
      .lte('start_date', today)
      .gte('end_date', today)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select('total_price')
      .gte('start_date', firstDayOfMonth)
      .lte('start_date', lastDayOfMonth)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select('total_price')
      .gte('start_date', firstDayOfYear)
      .lte('start_date', lastDayOfYear)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('start_date', today)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('end_date', today)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('start_date', tomorrow)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('end_date', tomorrow)
      .neq('status', 'storniert'),
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .lt('end_date', today)
      .eq('status', 'aktiv'),
  ])

  const kennelsOccupied = new Set(
    activeBookingsData?.flatMap((b) =>
      (b.booking_kennels as Array<{ kennel_id: string }>).map((bk) => bk.kennel_id)
    ) ?? []
  ).size
  const kennelsTotal = activeKennelCount ?? 28
  const occupancyPct = kennelsTotal > 0 ? Math.round((kennelsOccupied / kennelsTotal) * 100) : 0

  const monthlyRevenue = monthlyBookings?.reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0
  const yearlyRevenue = yearlyBookings?.reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0

  const kpis = [
    {
      label: 'Zwinger belegt heute',
      value: `${kennelsOccupied} / ${kennelsTotal}`,
      sub: `${occupancyPct} % Auslastung`,
      bar: occupancyPct,
    },
    {
      label: 'Umsatz diesen Monat',
      value: formatEuro(monthlyRevenue),
      sub: new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      bar: null,
    },
    {
      label: 'Jahresumsatz',
      value: formatEuro(yearlyRevenue),
      sub: new Date().getFullYear().toString(),
      bar: null,
    },
    {
      label: 'Kunden · Hunde',
      value: `${customerCount ?? 0} · ${dogCount ?? 0}`,
      sub: 'Gesamt erfasst',
      bar: null,
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.full_name ? `Willkommen, ${profile.full_name}` : 'Willkommen'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/kunden"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + Neuer Kunde
          </Link>
          <Link
            href="/buchungen"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            + Neue Buchung
          </Link>
        </div>
      </div>

      {/* Überfällige Abholungen */}
      {overdueBookings && overdueBookings.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            ⚠ {overdueBookings.length} überfällige{' '}
            {overdueBookings.length === 1 ? 'Abholung' : 'Abholungen'}
          </p>
          <ul className="space-y-1">
            {(overdueBookings as unknown as BookingRow[]).map((b) => {
              const dogNames = b.booking_dogs.map((bd) => bd.dogs?.name).filter(Boolean).join(', ')
              return (
                <li key={b.id} className="text-sm text-amber-700">
                  {b.customers?.last_name_1}, {b.customers?.first_name_1}
                  {dogNames && ` — ${dogNames}`}
                  {b.end_date && (
                    <> · fällig {new Date(b.end_date).toLocaleDateString('de-DE')}</>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* KPI Kacheln */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{kpi.value}</p>
            {kpi.bar !== null ? (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-gray-700 transition-all"
                    style={{ width: `${kpi.bar}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">{kpi.sub}</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400">{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tagesübersicht */}
      <h2 className="text-base font-semibold text-gray-700 mb-4">Tagesübersicht</h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-5">
        <TagesKarte
          title="Heute — Ankünfte"
          items={(todayArrivals as unknown as BookingRow[]) ?? []}
          emptyText="Keine Ankünfte heute"
        />
        <TagesKarte
          title="Heute — Abholungen"
          items={(todayDepartures as unknown as BookingRow[]) ?? []}
          emptyText="Keine Abholungen heute"
        />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TagesKarte
          title="Morgen — Ankünfte"
          items={(tomorrowArrivals as unknown as BookingRow[]) ?? []}
          emptyText="Keine Ankünfte morgen"
        />
        <TagesKarte
          title="Morgen — Abholungen"
          items={(tomorrowDepartures as unknown as BookingRow[]) ?? []}
          emptyText="Keine Abholungen morgen"
        />
      </div>
    </div>
  )
}
