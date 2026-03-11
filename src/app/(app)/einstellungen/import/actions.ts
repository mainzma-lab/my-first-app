'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DuplicateInfo = {
  email: string
  existingCustomer: {
    id: string
    first_name_1: string
    last_name_1: string
    email: string
    city: string
    customer_number: number | null
  }
}

export type ImportRow = {
  rowIndex: number
  salutation: string | null
  first_name_1: string
  last_name_1: string
  first_name_2: string | null
  last_name_2: string | null
  street: string
  zip: string
  city: string
  mobile_phone: string
  phone: string | null
  email: string
  referral_source: string | null
  newsletter_consent: boolean
  notes: string | null
  dog1_name: string | null
  dog1_breed: string | null
  dog1_birth_date: string | null
  dog1_gender: string | null
  dog1_neutered: boolean | null
  dog2_name: string | null
  dog2_breed: string | null
  dog2_birth_date: string | null
  dog2_gender: string | null
  dog2_neutered: boolean | null
}

export type ImportResultRow = {
  rowIndex: number
  success: boolean
  error?: string
  dogsImported: number
  dogWarnings: string[]
}

export type ImportResult = {
  customersImported: number
  dogsImported: number
  duplicatesSkipped: number
  errorsSkipped: number
  errors: ImportResultRow[]
  dogWarnings: string[]
}

// ─── Check Duplicates ─────────────────────────────────────────────────────────

export async function checkDuplicates(
  emails: string[]
): Promise<{ duplicates: DuplicateInfo[]; error: string | null }> {
  const supabase = await createClient()

  // Admin check
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return { duplicates: [], error: 'Nicht authentifiziert' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profile?.role !== 'admin') return { duplicates: [], error: 'Keine Berechtigung' }

  // Normalize emails
  const normalizedEmails = [...new Set(emails.map((e) => e.toLowerCase().trim()))]

  const { data: existingCustomers, error } = await supabase
    .from('customers')
    .select('id, first_name_1, last_name_1, email, city, customer_number')
    .in('email', normalizedEmails)

  if (error) {
    return { duplicates: [], error: `Datenbankfehler: ${error.message}` }
  }

  const duplicates: DuplicateInfo[] = (existingCustomers || []).map((c) => ({
    email: c.email,
    existingCustomer: {
      id: c.id,
      first_name_1: c.first_name_1,
      last_name_1: c.last_name_1,
      email: c.email,
      city: c.city,
      customer_number: c.customer_number,
    },
  }))

  return { duplicates, error: null }
}

// ─── Execute Import ───────────────────────────────────────────────────────────

export async function executeImport(
  rows: ImportRow[],
  duplicateDecisions: Record<string, 'skip' | 'import'>
): Promise<ImportResult> {
  const supabase = await createClient()

  // Admin check
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Nicht authentifiziert')

  const { data: profile } = await supabase
    .from('users')
    .select('role, id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Keine Berechtigung')

  const result: ImportResult = {
    customersImported: 0,
    dogsImported: 0,
    duplicatesSkipped: 0,
    errorsSkipped: 0,
    errors: [],
    dogWarnings: [],
  }

  for (const row of rows) {
    const email = row.email.toLowerCase().trim()

    // Check duplicate decision
    if (duplicateDecisions[email] === 'skip') {
      result.duplicatesSkipped++
      continue
    }

    // Validate salutation
    const validSalutations = ['Herr', 'Frau', 'Divers']
    const salutation = validSalutations.includes(row.salutation || '')
      ? row.salutation
      : 'Divers'

    try {
      // Insert customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          salutation,
          first_name_1: row.first_name_1.trim(),
          last_name_1: row.last_name_1.trim(),
          first_name_2: row.first_name_2?.trim() || null,
          last_name_2: row.last_name_2?.trim() || null,
          street: row.street.trim(),
          zip: row.zip.trim(),
          city: row.city.trim(),
          mobile_phone: row.mobile_phone.trim(),
          phone: row.phone?.trim() || null,
          email,
          referral_source: row.referral_source?.trim() || null,
          newsletter_consent: row.newsletter_consent ?? false,
          notes: row.notes?.trim() || null,
          status: 'neukunde_gewonnen',
          customer_since: new Date().toISOString().split('T')[0],
          created_by: profile.id,
        })
        .select('id')
        .single()

      if (customerError) {
        result.errorsSkipped++
        result.errors.push({
          rowIndex: row.rowIndex,
          success: false,
          error: `Kundenfehler: ${customerError.message}`,
          dogsImported: 0,
          dogWarnings: [],
        })
        continue
      }

      result.customersImported++

      // Import dogs
      const dogSlots = [
        {
          name: row.dog1_name,
          breed: row.dog1_breed,
          birth_date: row.dog1_birth_date,
          gender: row.dog1_gender,
          neutered: row.dog1_neutered,
        },
        {
          name: row.dog2_name,
          breed: row.dog2_breed,
          birth_date: row.dog2_birth_date,
          gender: row.dog2_gender,
          neutered: row.dog2_neutered,
        },
      ]

      // If dog1 is empty but dog2 has data, shift dog2 to dog1
      const activeDogs = dogSlots.filter((d) => d.name?.trim())

      let dogsImported = 0
      const dogWarnings: string[] = []

      for (const dog of activeDogs) {
        if (!dog.name?.trim()) continue

        const dogName = dog.name.trim()
        let dogBreed = dog.breed?.trim() || null
        let dogBirthDate = dog.birth_date?.trim() || null
        const dogGenderRaw = dog.gender?.trim().toLowerCase() || null

        // Breed fallback
        if (!dogBreed) {
          dogBreed = 'Unbekannt'
          dogWarnings.push(
            `Zeile ${row.rowIndex}: Hund "${dogName}" ohne Rasse importiert (Rasse = "Unbekannt")`
          )
          result.dogWarnings.push(
            `Zeile ${row.rowIndex}: Hund "${dogName}" ohne Rasse importiert (Rasse = "Unbekannt")`
          )
        }

        // Birth date fallback
        if (!dogBirthDate || !isValidDate(dogBirthDate)) {
          dogBirthDate = '2000-01-01'
          dogWarnings.push(
            `Zeile ${row.rowIndex}: Hund "${dogName}" ohne gültiges Geburtsdatum importiert (01.01.2000)`
          )
          result.dogWarnings.push(
            `Zeile ${row.rowIndex}: Hund "${dogName}" ohne gültiges Geburtsdatum importiert (01.01.2000)`
          )
        }

        // Gender mapping
        let gender: 'maennlich' | 'weiblich' = 'maennlich'
        if (
          dogGenderRaw === 'weiblich' ||
          dogGenderRaw === 'w' ||
          dogGenderRaw === 'female' ||
          dogGenderRaw === 'f' ||
          dogGenderRaw === 'huendin' ||
          dogGenderRaw === 'hündin'
        ) {
          gender = 'weiblich'
        }

        // Neutered
        const isNeutered = dog.neutered ?? false

        const { error: dogError } = await supabase.from('dogs').insert({
          customer_id: customer.id,
          name: dogName,
          breed: dogBreed,
          birth_date: dogBirthDate,
          gender,
          is_neutered: isNeutered,
        })

        if (dogError) {
          dogWarnings.push(
            `Zeile ${row.rowIndex}: Hund "${dogName}" konnte nicht importiert werden: ${dogError.message}`
          )
          result.dogWarnings.push(
            `Zeile ${row.rowIndex}: Hund "${dogName}" konnte nicht importiert werden: ${dogError.message}`
          )
        } else {
          dogsImported++
          result.dogsImported++
        }
      }

      result.errors.push({
        rowIndex: row.rowIndex,
        success: true,
        dogsImported,
        dogWarnings,
      })
    } catch (err) {
      result.errorsSkipped++
      result.errors.push({
        rowIndex: row.rowIndex,
        success: false,
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
        dogsImported: 0,
        dogWarnings: [],
      })
    }
  }

  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidDate(dateStr: string): boolean {
  // Accept YYYY-MM-DD or DD.MM.YYYY
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  const deMatch = /^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)
  if (!isoMatch && !deMatch) return false

  let d: Date
  if (deMatch) {
    const [day, month, year] = dateStr.split('.')
    d = new Date(`${year}-${month}-${day}`)
  } else {
    d = new Date(dateStr)
  }

  return !isNaN(d.getTime())
}
