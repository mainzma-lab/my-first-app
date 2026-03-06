'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RevenueByType = {
  booking_type: string
  count: number
  total: number
}

export type TopKennel = {
  kennel_number: number
  occupied_days: number
}

export type TopCustomer = {
  customer_name: string
  value: number
}

export type StatusBreakdown = {
  status: string
  count: number
}

export type CsvBookingRow = {
  id: string
  customer_name: string
  dog_names: string
  booking_type: string
  kennel_numbers: string
  start_date: string
  end_date: string
  duration_days: number
  total_price: number | null
  status: string
  cancellation_date: string | null
  cancellation_fee: number | null
}

export type ReportingData = {
  // Umsatz
  totalRevenue: number
  completedBookingsCount: number
  avgBookingValue: number
  revenueByType: RevenueByType[]

  // Auslastung
  occupancyRate: number
  occupiedDays: number
  freeDays: number
  topKennels: TopKennel[]

  // Kunden
  activeCustomerCount: number
  topCustomersByBookings: TopCustomer[]
  topCustomersByRevenue: TopCustomer[]

  // Buchungen
  totalBookingsCount: number
  cancellationRate: number
  avgDuration: number
  statusBreakdown: StatusBreakdown[]

  // CSV
  csvRows: CsvBookingRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bookingTypeLabel(type: string): string {
  if (type === 'uebernachtung') return 'Übernachtung'
  if (type === 'tagesbetreuung_flexibel') return 'Tagesbetreuung flex.'
  if (type === 'tagesbetreuung_regelmaessig') return 'Tagesbetreuung reg.'
  return type
}

function statusLabel(status: string): string {
  if (status === 'geplant') return 'Geplant'
  if (status === 'aktiv') return 'Aktiv'
  if (status === 'abgeschlossen') return 'Abgeschlossen'
  if (status === 'storniert') return 'Storniert'
  return status
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (b < a) return 0
  return Math.floor((b - a) / 86400000) + 1
}

function overlapDays(
  bookingStart: string,
  bookingEnd: string,
  rangeStart: string,
  rangeEnd: string
): number {
  const start = Math.max(new Date(bookingStart).getTime(), new Date(rangeStart).getTime())
  const end = Math.min(new Date(bookingEnd).getTime(), new Date(rangeEnd).getTime())
  if (end < start) return 0
  return Math.floor((end - start) / 86400000) + 1
}

// ─── Main Server Action ───────────────────────────────────────────────────────

export async function getReportingData(von: string, bis: string): Promise<ReportingData> {
  const supabase = await createClient()

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select(`
      id, booking_type, start_date, end_date, duration_days,
      total_price, status, cancellation_date, cancellation_fee,
      customer_id,
      customers(first_name_1, last_name_1),
      booking_dogs(dogs(name)),
      booking_kennels(kennel_id, kennels(number))
    `)
    .lte('start_date', bis)
    .gte('end_date', von)

  const bookings = (rawBookings ?? []) as Record<string, unknown>[]

  const { data: activeKennels } = await supabase
    .from('kennels')
    .select('id, number')
    .eq('is_active', true)

  const kennelCount = activeKennels?.length ?? 0
  const daysInRange = daysBetween(von, bis)

  // ─── Umsatz ────────────────────────────────────────────────────────────────

  const nonCancelled = bookings.filter(b => (b.status as string) !== 'storniert')

  const totalRevenue = nonCancelled.reduce(
    (sum, b) => sum + ((b.total_price as number | null) ?? 0),
    0
  )
  const completedBookingsCount = nonCancelled.length
  const avgBookingValue =
    completedBookingsCount > 0
      ? Math.round((totalRevenue / completedBookingsCount) * 100) / 100
      : 0

  const typeMap = new Map<string, { count: number; total: number }>()
  for (const b of nonCancelled) {
    const type = b.booking_type as string
    const existing = typeMap.get(type) ?? { count: 0, total: 0 }
    existing.count++
    existing.total += (b.total_price as number | null) ?? 0
    typeMap.set(type, existing)
  }
  const revenueByType: RevenueByType[] = Array.from(typeMap.entries()).map(
    ([booking_type, { count, total }]) => ({ booking_type, count, total })
  )

  // ─── Auslastung ────────────────────────────────────────────────────────────

  const kennelDaysMap = new Map<number, number>()
  for (const b of nonCancelled) {
    const bkList =
      (b.booking_kennels as { kennel_id: string; kennels: { number: number } | null }[] | null) ??
      []
    const days = overlapDays(b.start_date as string, b.end_date as string, von, bis)
    for (const bk of bkList) {
      if (bk.kennels) {
        const nr = bk.kennels.number
        kennelDaysMap.set(nr, (kennelDaysMap.get(nr) ?? 0) + days)
      }
    }
  }

  const occupiedDays = Array.from(kennelDaysMap.values()).reduce((a, b) => a + b, 0)
  const totalPossibleDays = kennelCount * daysInRange
  const freeDays = Math.max(0, totalPossibleDays - occupiedDays)
  const occupancyRate =
    totalPossibleDays > 0
      ? Math.round((occupiedDays / totalPossibleDays) * 1000) / 10
      : 0

  const topKennels: TopKennel[] = Array.from(kennelDaysMap.entries())
    .map(([kennel_number, occupied_days]) => ({ kennel_number, occupied_days }))
    .sort((a, b) => b.occupied_days - a.occupied_days)
    .slice(0, 5)

  // ─── Kunden ────────────────────────────────────────────────────────────────

  const customerMap = new Map<string, { name: string; count: number; revenue: number }>()
  for (const b of nonCancelled) {
    const cid = b.customer_id as string
    const customer = b.customers as { first_name_1: string; last_name_1: string } | null
    const name = customer
      ? `${customer.first_name_1} ${customer.last_name_1}`
      : 'Unbekannt'
    const existing = customerMap.get(cid) ?? { name, count: 0, revenue: 0 }
    existing.count++
    existing.revenue += (b.total_price as number | null) ?? 0
    customerMap.set(cid, existing)
  }

  const activeCustomerCount = customerMap.size

  const topCustomersByBookings: TopCustomer[] = Array.from(customerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(c => ({ customer_name: c.name, value: c.count }))

  const topCustomersByRevenue: TopCustomer[] = Array.from(customerMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(c => ({ customer_name: c.name, value: c.revenue }))

  // ─── Buchungsstatistiken ───────────────────────────────────────────────────

  const totalBookingsCount = bookings.length
  const cancelledCount = bookings.filter(b => (b.status as string) === 'storniert').length
  const cancellationRate =
    totalBookingsCount > 0
      ? Math.round((cancelledCount / totalBookingsCount) * 1000) / 10
      : 0

  const durations = nonCancelled.map(b => (b.duration_days as number) ?? 0)
  const avgDuration =
    durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0

  const statusMap = new Map<string, number>()
  for (const b of bookings) {
    const s = b.status as string
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1)
  }
  const statusBreakdown: StatusBreakdown[] = Array.from(statusMap.entries()).map(
    ([status, count]) => ({ status, count })
  )

  // ─── CSV ───────────────────────────────────────────────────────────────────

  const csvRows: CsvBookingRow[] = bookings.map(b => {
    const customer = b.customers as { first_name_1: string; last_name_1: string } | null
    const dogList =
      (b.booking_dogs as { dogs: { name: string } | null }[] | null) ?? []
    const kennelList =
      (b.booking_kennels as { kennel_id: string; kennels: { number: number } | null }[] | null) ??
      []

    return {
      id: b.id as string,
      customer_name: customer
        ? `${customer.last_name_1}, ${customer.first_name_1}`
        : 'Unbekannt',
      dog_names: dogList
        .map(d => d.dogs?.name)
        .filter(Boolean)
        .join('; '),
      booking_type: bookingTypeLabel(b.booking_type as string),
      kennel_numbers: kennelList
        .map(k => k.kennels?.number)
        .filter((n): n is number => n != null)
        .sort((a, b) => a - b)
        .join(', '),
      start_date: b.start_date as string,
      end_date: b.end_date as string,
      duration_days: (b.duration_days as number) ?? 0,
      total_price: b.total_price as number | null,
      status: statusLabel(b.status as string),
      cancellation_date: (b.cancellation_date as string | null) ?? null,
      cancellation_fee: (b.cancellation_fee as number | null) ?? null,
    }
  })

  return {
    totalRevenue,
    completedBookingsCount,
    avgBookingValue,
    revenueByType,
    occupancyRate,
    occupiedDays,
    freeDays,
    topKennels,
    activeCustomerCount,
    topCustomersByBookings,
    topCustomersByRevenue,
    totalBookingsCount,
    cancellationRate,
    avgDuration,
    statusBreakdown,
    csvRows,
  }
}
