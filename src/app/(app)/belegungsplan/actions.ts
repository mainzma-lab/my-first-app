'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { BookingWithDetails, Kennel } from '../buchungen/actions'

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
