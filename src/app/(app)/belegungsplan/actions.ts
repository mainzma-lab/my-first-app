'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { BookingWithDetails, Kennel } from '../buchungen/actions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUUID(s: string) { return UUID_RE.test(s) }

function mapBookingRow(b: Record<string, unknown>): BookingWithDetails {
  const customer = b.customers as { first_name_1: string; last_name_1: string } | null
  const bookingDogs = (b.booking_dogs as { dogs: { id: string; name: string } | null }[] | null) ?? []
  const bookingKennels = (b.booking_kennels as { kennels: { id: string; number: number } | null }[] | null) ?? []

  return {
    id: b.id as string,
    customer_id: b.customer_id as string,
    booking_type: b.booking_type as BookingWithDetails['booking_type'],
    start_date: b.start_date as string,
    end_date: b.end_date as string,
    duration_days: b.duration_days as number,
    total_price: b.total_price as number | null,
    notes: b.notes as string | null,
    medication_notes: b.medication_notes as string | null,
    medication_schedule: b.medication_schedule as string | null,
    items_list: b.items_list as string | null,
    frequency: b.frequency as string | null,
    status: b.status as BookingWithDetails['status'],
    cancellation_date: b.cancellation_date as string | null,
    cancellation_fee: b.cancellation_fee as number | null,
    cancellation_reason: b.cancellation_reason as string | null,
    created_at: b.created_at as string,
    customer_name: customer
      ? `${customer.first_name_1} ${customer.last_name_1}`
      : 'Unbekannt',
    dogs: bookingDogs
      .map(bd => bd.dogs)
      .filter((d): d is { id: string; name: string } => d !== null),
    kennels: bookingKennels
      .map(bk => bk.kennels)
      .filter((k): k is { id: string; number: number } => k !== null),
  }
}

const BOOKING_SELECT = `
  *,
  customers(first_name_1, last_name_1),
  booking_dogs(dog_id, dogs(id, name)),
  booking_kennels(kennel_id, kennels(id, number))
`

export async function getBelegungsplanData(
  from: string,
  to: string
): Promise<{ kennels: Kennel[]; bookings: BookingWithDetails[] }> {
  const supabase = await createClient()

  const [{ data: kennelsData }, { data: bookingsData }] = await Promise.all([
    supabase
      .from('kennels')
      .select('id, number, size, has_heating, is_active')
      .eq('is_active', true)
      .order('number', { ascending: true }),
    supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .neq('status', 'storniert')
      .lte('start_date', to)
      .gte('end_date', from),
  ])

  return {
    kennels: (kennelsData ?? []) as Kennel[],
    bookings: ((bookingsData ?? []) as Record<string, unknown>[]).map(mapBookingRow),
  }
}

export async function assignKennel(
  bookingId: string,
  kennelId: string
): Promise<{ error: string | null }> {
  if (!isUUID(bookingId) || !isUUID(kennelId)) return { error: 'Ungültige Parameter.' }

  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('start_date, end_date')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const { data: available } = await supabase.rpc('check_kennel_availability', {
    p_kennel_id: kennelId,
    p_start_date: booking.start_date,
    p_end_date: booking.end_date,
    p_exclude_booking_id: bookingId,
  })

  if (!available) {
    return { error: 'Dieser Zwinger ist für den Buchungszeitraum bereits belegt.' }
  }

  const { error } = await supabase
    .from('booking_kennels')
    .insert({ booking_id: bookingId, kennel_id: kennelId })

  if (error) return { error: 'Fehler beim Zuweisen des Zwingers.' }

  revalidatePath('/belegungsplan')
  revalidatePath('/buchungen')
  return { error: null }
}

export async function moveBooking(
  bookingId: string,
  oldKennelId: string,
  newKennelId: string,
  newStartDate: string,
): Promise<{ error: string | null }> {
  if (!isUUID(bookingId) || !isUUID(oldKennelId) || !isUUID(newKennelId)) return { error: 'Ungültige Parameter.' }

  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('start_date, end_date')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Buchung nicht gefunden.' }

  // Preserve duration
  const [sy, sm, sd] = booking.start_date.split('-').map(Number)
  const [ey, em, ed] = booking.end_date.split('-').map(Number)
  const durationDays = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000)
  const [nsy, nsm, nsd] = newStartDate.split('-').map(Number)
  const newEndDate = new Date(Date.UTC(nsy, nsm - 1, nsd + durationDays)).toISOString().split('T')[0]

  const { data: available } = await supabase.rpc('check_kennel_availability', {
    p_kennel_id: newKennelId,
    p_start_date: newStartDate,
    p_end_date: newEndDate,
    p_exclude_booking_id: bookingId,
  })

  if (!available) return { error: 'Dieser Zwinger ist für den gewählten Zeitraum bereits belegt.' }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ start_date: newStartDate, end_date: newEndDate })
    .eq('id', bookingId)

  if (updateError) return { error: 'Fehler beim Verschieben der Buchung.' }

  if (oldKennelId !== newKennelId) {
    await supabase.from('booking_kennels').delete().eq('booking_id', bookingId).eq('kennel_id', oldKennelId)
    const { error: kennelError } = await supabase
      .from('booking_kennels')
      .insert({ booking_id: bookingId, kennel_id: newKennelId })
    if (kennelError) return { error: 'Fehler beim Zuweisen des Zwingers.' }
  }

  revalidatePath('/belegungsplan')
  revalidatePath('/buchungen')
  return { error: null }
}

export async function resizeBooking(
  bookingId: string,
  newStartDate: string,
  newEndDate: string,
): Promise<{ error: string | null }> {
  if (!isUUID(bookingId)) return { error: 'Ungültige Parameter.' }

  const supabase = await createClient()

  if (new Date(newStartDate) > new Date(newEndDate)) {
    return { error: 'Das Startdatum darf nicht nach dem Enddatum liegen.' }
  }

  const { data: kennelAssignments } = await supabase
    .from('booking_kennels')
    .select('kennel_id')
    .eq('booking_id', bookingId)

  for (const { kennel_id } of kennelAssignments ?? []) {
    const { data: available } = await supabase.rpc('check_kennel_availability', {
      p_kennel_id: kennel_id,
      p_start_date: newStartDate,
      p_end_date: newEndDate,
      p_exclude_booking_id: bookingId,
    })
    if (!available) return { error: 'Zwinger ist für den gewählten Zeitraum bereits belegt.' }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ start_date: newStartDate, end_date: newEndDate })
    .eq('id', bookingId)

  if (error) return { error: 'Fehler beim Anpassen des Zeitraums.' }

  revalidatePath('/belegungsplan')
  revalidatePath('/buchungen')
  return { error: null }
}
