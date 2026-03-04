'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionState = { error: string | null; success: string | null; customerId?: string }

// ─── Types ────────────────────────────────────────────────────────────────────

export type FullCustomer = {
  id: string
  salutation: string
  first_name_1: string
  last_name_1: string
  salutation_2: string | null
  first_name_2: string | null
  last_name_2: string | null
  street: string
  zip: string
  city: string
  mobile_phone: string
  phone: string | null
  second_mobile_phone: string | null
  email: string
  second_email: string | null
  referral_source: string | null
  newsletter_consent: boolean
  newsletter_consent_date: string | null
  status: string
  status_reason: string | null
  notes: string | null
  is_manually_inactive: boolean
  has_google_review: boolean
  google_review_date: string | null
  google_review_stars: number | null
  google_review_text: string | null
  google_review_link: string | null
  customer_number: number | null
  created_at: string
  updated_at: string
  // From customer_overview (computed)
  last_stay_date: string | null
  next_booking_date: string | null
  bookings_last_12_months: number
  pension_days_last_12_months: number
  daycare_days_last_12_months: number
}

export type Dog = {
  id: string
  customer_id: string
  name: string
  breed: string
  birth_date: string
  gender: string
  is_neutered: boolean
  behavioral_notes: string | null
  compatibility_notes: string | null
}

// ─── Customer CRUD ────────────────────────────────────────────────────────────

export async function createCustomer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const salutation = formData.get('salutation') as string
  const first_name_1 = (formData.get('first_name_1') as string)?.trim()
  const last_name_1 = (formData.get('last_name_1') as string)?.trim()
  const salutation_2 = (formData.get('salutation_2') as string) || null
  const first_name_2 = (formData.get('first_name_2') as string)?.trim() || null
  const last_name_2 = (formData.get('last_name_2') as string)?.trim() || null
  const street = (formData.get('street') as string)?.trim()
  const zip = (formData.get('zip') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const mobile_phone = (formData.get('mobile_phone') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || null
  const second_mobile_phone = (formData.get('second_mobile_phone') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const second_email = (formData.get('second_email') as string)?.trim().toLowerCase() || null
  const referral_source = (formData.get('referral_source') as string)?.trim() || null
  const newsletter_consent = formData.get('newsletter_consent') === 'on'
  const notes = (formData.get('notes') as string)?.trim() || null
  const has_google_review = formData.get('has_google_review') === 'on'
  const google_review_date = (formData.get('google_review_date') as string) || null
  const google_review_stars = formData.get('google_review_stars') ? parseInt(formData.get('google_review_stars') as string, 10) : null
  const google_review_text = (formData.get('google_review_text') as string)?.trim() || null
  const google_review_link = (formData.get('google_review_link') as string)?.trim() || null

  if (!salutation || !first_name_1 || !last_name_1 || !street || !zip || !city || !mobile_phone || !email) {
    return { error: 'Bitte alle Pflichtfelder ausfüllen.', success: null }
  }

  // Email uniqueness check
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { error: 'Diese E-Mail-Adresse ist bereits registriert.', success: null }
  }

  // Get current user for created_by
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser!.id)
    .single()

  const { data: newCustomer, error } = await supabase.from('customers').insert({
    salutation,
    first_name_1,
    last_name_1,
    salutation_2,
    first_name_2,
    last_name_2,
    street,
    zip,
    city,
    mobile_phone,
    phone,
    second_mobile_phone,
    email,
    second_email,
    referral_source,
    newsletter_consent,
    newsletter_consent_date: newsletter_consent ? new Date().toISOString() : null,
    notes,
    has_google_review,
    google_review_date: has_google_review ? google_review_date : null,
    google_review_stars: has_google_review ? google_review_stars : null,
    google_review_text: has_google_review ? google_review_text : null,
    google_review_link: has_google_review ? google_review_link : null,
    created_by: profile?.id ?? null,
  }).select('id').single()

  if (error) {
    return { error: 'Fehler beim Anlegen des Kunden.', success: null }
  }

  revalidatePath('/kunden')
  return { error: null, success: `${first_name_1} ${last_name_1} wurde erfolgreich angelegt.`, customerId: newCustomer.id }
}

export async function updateCustomer(
  customerId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const salutation = formData.get('salutation') as string
  const first_name_1 = (formData.get('first_name_1') as string)?.trim()
  const last_name_1 = (formData.get('last_name_1') as string)?.trim()
  const salutation_2 = (formData.get('salutation_2') as string) || null
  const first_name_2 = (formData.get('first_name_2') as string)?.trim() || null
  const last_name_2 = (formData.get('last_name_2') as string)?.trim() || null
  const street = (formData.get('street') as string)?.trim()
  const zip = (formData.get('zip') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const mobile_phone = (formData.get('mobile_phone') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || null
  const second_mobile_phone = (formData.get('second_mobile_phone') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const second_email = (formData.get('second_email') as string)?.trim().toLowerCase() || null
  const referral_source = (formData.get('referral_source') as string)?.trim() || null
  const newsletter_consent = formData.get('newsletter_consent') === 'on'
  const notes = (formData.get('notes') as string)?.trim() || null
  const has_google_review = formData.get('has_google_review') === 'on'
  const google_review_date = (formData.get('google_review_date') as string) || null
  const google_review_stars = formData.get('google_review_stars') ? parseInt(formData.get('google_review_stars') as string, 10) : null
  const google_review_text = (formData.get('google_review_text') as string)?.trim() || null
  const google_review_link = (formData.get('google_review_link') as string)?.trim() || null

  if (!salutation || !first_name_1 || !last_name_1 || !street || !zip || !city || !mobile_phone || !email) {
    return { error: 'Bitte alle Pflichtfelder ausfüllen.', success: null }
  }

  // Email uniqueness check (exclude current customer)
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .neq('id', customerId)
    .maybeSingle()

  if (existing) {
    return { error: 'Diese E-Mail-Adresse ist bereits registriert.', success: null }
  }

  // Detect newsletter consent change
  const { data: current } = await supabase
    .from('customers')
    .select('newsletter_consent')
    .eq('id', customerId)
    .single()

  const consentChanged = current?.newsletter_consent !== newsletter_consent

  const { error } = await supabase
    .from('customers')
    .update({
      salutation,
      first_name_1,
      last_name_1,
      salutation_2,
      first_name_2,
      last_name_2,
      street,
      zip,
      city,
      mobile_phone,
      phone,
      second_mobile_phone,
      email,
      second_email,
      referral_source,
      newsletter_consent,
      newsletter_consent_date: consentChanged ? new Date().toISOString() : undefined,
      notes,
      has_google_review,
      google_review_date: has_google_review ? google_review_date : null,
      google_review_stars: has_google_review ? google_review_stars : null,
      google_review_text: has_google_review ? google_review_text : null,
      google_review_link: has_google_review ? google_review_link : null,
    })
    .eq('id', customerId)

  if (error) {
    return { error: 'Fehler beim Speichern.', success: null }
  }

  revalidatePath('/kunden')
  return { error: null, success: 'Kundendaten wurden gespeichert.' }
}

// ─── Customer details fetch (called from client on modal open) ────────────────

export async function getCustomerDetails(
  customerId: string
): Promise<{ customer: FullCustomer; dogs: Dog[] } | null> {
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customer_overview')
    .select('*')
    .eq('id', customerId)
    .single()

  if (!customer) return null

  const { data: dogs } = await supabase
    .from('dogs')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })

  return { customer: customer as FullCustomer, dogs: (dogs ?? []) as Dog[] }
}

// ─── Pipeline status ──────────────────────────────────────────────────────────

export async function updateCustomerStatus(
  customerId: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('customers')
    .update({ status: newStatus, status_reason: reason ?? null })
    .eq('id', customerId)
  revalidatePath('/kunden')
}

export async function setManuallyInactive(customerId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('customers')
    .update({ is_manually_inactive: true })
    .eq('id', customerId)
  revalidatePath('/kunden')
}

export async function reactivateCustomer(customerId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('customers')
    .update({ is_manually_inactive: false })
    .eq('id', customerId)
  revalidatePath('/kunden')
}

// ─── Dogs CRUD ────────────────────────────────────────────────────────────────

export async function createDog(
  customerId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const breed = (formData.get('breed') as string)?.trim()
  const birth_date = formData.get('birth_date') as string
  const gender = formData.get('gender') as string
  const is_neutered = formData.get('is_neutered') === 'true'
  const behavioral_notes = (formData.get('behavioral_notes') as string)?.trim() || null
  const compatibility_notes = (formData.get('compatibility_notes') as string)?.trim() || null

  if (!name || !breed || !birth_date || !gender) {
    return { error: 'Bitte alle Pflichtfelder ausfüllen.', success: null }
  }

  // Check 4-dog limit
  const { count } = await supabase
    .from('dogs')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)

  if ((count ?? 0) >= 4) {
    return { error: 'Dieser Kunde hat bereits 4 Hunde (Maximum erreicht).', success: null }
  }

  const { error } = await supabase.from('dogs').insert({
    customer_id: customerId,
    name,
    breed,
    birth_date,
    gender,
    is_neutered,
    behavioral_notes,
    compatibility_notes,
  })

  if (error) {
    return { error: 'Fehler beim Anlegen des Hundes.', success: null }
  }

  revalidatePath('/kunden')
  return { error: null, success: `${name} wurde hinzugefügt.` }
}

export async function updateDog(
  dogId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const breed = (formData.get('breed') as string)?.trim()
  const birth_date = formData.get('birth_date') as string
  const gender = formData.get('gender') as string
  const is_neutered = formData.get('is_neutered') === 'true'
  const behavioral_notes = (formData.get('behavioral_notes') as string)?.trim() || null
  const compatibility_notes = (formData.get('compatibility_notes') as string)?.trim() || null

  if (!name || !breed || !birth_date || !gender) {
    return { error: 'Bitte alle Pflichtfelder ausfüllen.', success: null }
  }

  const { error } = await supabase
    .from('dogs')
    .update({ name, breed, birth_date, gender, is_neutered, behavioral_notes, compatibility_notes })
    .eq('id', dogId)

  if (error) {
    return { error: 'Fehler beim Speichern.', success: null }
  }

  revalidatePath('/kunden')
  return { error: null, success: `${name} wurde gespeichert.` }
}

export async function deleteDog(dogId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // Check for future bookings
  const { count } = await supabase
    .from('booking_dogs')
    .select('bookings!inner(end_date, status)', { count: 'exact', head: true })
    .eq('dog_id', dogId)
    .gte('bookings.end_date', new Date().toISOString().split('T')[0])
    .neq('bookings.status', 'storniert')

  if ((count ?? 0) > 0) {
    return { error: 'Dieser Hund hat noch bevorstehende Buchungen und kann nicht gelöscht werden.' }
  }

  await supabase.from('dogs').delete().eq('id', dogId)
  revalidatePath('/kunden')
  return { error: null }
}
