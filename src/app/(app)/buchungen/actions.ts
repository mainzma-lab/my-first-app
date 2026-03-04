'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionState = { error: string | null; success: string | null }

// ─── Types ────────────────────────────────────────────────────────────────────

export type Booking = {
  id: string
  customer_id: string
  booking_type: 'uebernachtung' | 'tagesbetreuung_flexibel' | 'tagesbetreuung_regelmaessig'
  start_date: string
  end_date: string
  duration_days: number
  total_price: number | null
  notes: string | null
  medication_notes: string | null
  medication_schedule: string | null
  items_list: string | null
  frequency: string | null
  status: 'geplant' | 'aktiv' | 'abgeschlossen' | 'storniert'
  cancellation_date: string | null
  cancellation_fee: number | null
  cancellation_reason: string | null
  created_at: string
}

export type BookingWithDetails = Booking & {
  customer_name: string
  dogs: { id: string; name: string }[]
  kennels: { id: string; number: number }[]
}

export type Kennel = {
  id: string
  number: number
  size: string
  has_heating: boolean
  is_active: boolean
}

export type CustomerForAutocomplete = {
  id: string
  first_name_1: string
  last_name_1: string
  dogs: { id: string; name: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getBookings(): Promise<BookingWithDetails[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('created_at', { ascending: false })
  return ((data ?? []) as Record<string, unknown>[]).map(mapBookingRow)
}

export async function getBookingDetails(id: string): Promise<BookingWithDetails | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', id)
    .single()
  if (!data) return null
  return mapBookingRow(data as Record<string, unknown>)
}

export async function getCustomerBookings(customerId: string): Promise<BookingWithDetails[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('customer_id', customerId)
    .order('start_date', { ascending: false })
  return ((data ?? []) as Record<string, unknown>[]).map(mapBookingRow)
}

export async function getAvailableKennels(): Promise<Kennel[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kennels')
    .select('id, number, size, has_heating, is_active')
    .eq('is_active', true)
    .order('number', { ascending: true })
  return (data ?? []) as Kennel[]
}

export async function getActiveCustomersForAutocomplete(): Promise<CustomerForAutocomplete[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('id, first_name_1, last_name_1, status, is_manually_inactive, dogs(id, name)')
    .not('status', 'in', '("absage_kunde","absage_gudrun")')
    .eq('is_manually_inactive', false)
    .order('last_name_1', { ascending: true })
  return (data ?? []) as CustomerForAutocomplete[]
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createBooking(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const customer_id = formData.get('customer_id') as string
  const booking_type = formData.get('booking_type') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const total_price_raw = formData.get('total_price') as string
  const notes = (formData.get('notes') as string)?.trim() || null
  const medication_notes = (formData.get('medication_notes') as string)?.trim() || null
  const medication_schedule = (formData.get('medication_schedule') as string)?.trim() || null
  const items_list = (formData.get('items_list') as string)?.trim() || null
  const frequency = (formData.get('frequency') as string) || null
  const dog_ids = formData.getAll('dog_ids') as string[]
  const kennel_ids = formData.getAll('kennel_ids') as string[]

  if (!customer_id || !booking_type || !start_date || !end_date) {
    return { error: 'Bitte alle Pflichtfelder ausfüllen.', success: null }
  }

  if (new Date(end_date) < new Date(start_date)) {
    return { error: 'Das Enddatum darf nicht vor dem Startdatum liegen.', success: null }
  }

  const total_price = total_price_raw ? parseFloat(total_price_raw) : null

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id,
      booking_type,
      start_date,
      end_date,
      total_price,
      notes,
      medication_notes,
      medication_schedule,
      items_list,
      frequency,
    })
    .select('id')
    .single()

  if (error || !booking) {
    return { error: 'Fehler beim Anlegen der Buchung.', success: null }
  }

  if (dog_ids.length > 0) {
    await supabase.from('booking_dogs').insert(
      dog_ids.map(dog_id => ({ booking_id: booking.id, dog_id }))
    )
  }

  if (kennel_ids.length > 0) {
    await supabase.from('booking_kennels').insert(
      kennel_ids.map(kennel_id => ({ booking_id: booking.id, kennel_id }))
    )
  }

  revalidatePath('/buchungen')
  revalidatePath('/kunden')
  return { error: null, success: 'Buchung wurde angelegt.' }
}

export async function updateBooking(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing || existing.status !== 'geplant') {
    return { error: 'Nur Buchungen im Status "geplant" können bearbeitet werden.', success: null }
  }

  const booking_type = formData.get('booking_type') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const total_price_raw = formData.get('total_price') as string
  const notes = (formData.get('notes') as string)?.trim() || null
  const medication_notes = (formData.get('medication_notes') as string)?.trim() || null
  const medication_schedule = (formData.get('medication_schedule') as string)?.trim() || null
  const items_list = (formData.get('items_list') as string)?.trim() || null
  const frequency = (formData.get('frequency') as string) || null
  const dog_ids = formData.getAll('dog_ids') as string[]
  const kennel_ids = formData.getAll('kennel_ids') as string[]

  if (!booking_type || !start_date || !end_date) {
    return { error: 'Bitte alle Pflichtfelder ausfüllen.', success: null }
  }

  const total_price = total_price_raw ? parseFloat(total_price_raw) : null

  const { error } = await supabase
    .from('bookings')
    .update({
      booking_type,
      start_date,
      end_date,
      total_price,
      notes,
      medication_notes,
      medication_schedule,
      items_list,
      frequency,
    })
    .eq('id', id)

  if (error) {
    return { error: 'Fehler beim Speichern der Buchung.', success: null }
  }

  // Replace dogs and kennels
  await supabase.from('booking_dogs').delete().eq('booking_id', id)
  await supabase.from('booking_kennels').delete().eq('booking_id', id)

  if (dog_ids.length > 0) {
    await supabase.from('booking_dogs').insert(
      dog_ids.map(dog_id => ({ booking_id: id, dog_id }))
    )
  }

  if (kennel_ids.length > 0) {
    await supabase.from('booking_kennels').insert(
      kennel_ids.map(kennel_id => ({ booking_id: id, kennel_id }))
    )
  }

  revalidatePath('/buchungen')
  revalidatePath('/kunden')
  return { error: null, success: 'Buchung wurde gespeichert.' }
}

export async function updateBookingStatus(
  id: string,
  newStatus: 'aktiv' | 'abgeschlossen'
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', id)
  if (error) return { error: 'Fehler beim Aktualisieren des Status.' }
  revalidatePath('/buchungen')
  revalidatePath('/kunden')
  return { error: null }
}

export async function cancelBooking(
  id: string,
  fee: number | null,
  reason: string
): Promise<{ error: string | null }> {
  if (!reason.trim()) return { error: 'Bitte einen Stornierungsgrund angeben.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'storniert',
      cancellation_date: new Date().toISOString().split('T')[0],
      cancellation_fee: fee,
      cancellation_reason: reason.trim(),
    })
    .eq('id', id)
  if (error) return { error: 'Fehler beim Stornieren der Buchung.' }
  revalidatePath('/buchungen')
  revalidatePath('/kunden')
  return { error: null }
}

// ─── Helpers (called from client) ─────────────────────────────────────────────

export async function calculatePrice(
  bookingType: string,
  startDate: string,
  endDate: string,
  dogCount: number,
  frequency?: string | null
): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('calculate_booking_price', {
    p_booking_type: bookingType,
    p_start_date: startDate,
    p_end_date: endDate,
    p_dog_count: dogCount,
    p_frequency: frequency ?? null,
  })
  if (error) return null
  return data as number
}

export async function checkKennelAvailability(
  kennelId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('check_kennel_availability', {
    p_kennel_id: kennelId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_booking_id: excludeBookingId ?? null,
  })
  return data === true
}
