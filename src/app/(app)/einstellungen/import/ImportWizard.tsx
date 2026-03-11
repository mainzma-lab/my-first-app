'use client'

import { useState, useRef } from 'react'
import {
  checkDuplicates,
  executeImport,
  type DuplicateInfo,
  type ImportRow,
  type ImportResult,
} from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemField = {
  key: string
  label: string
  required: boolean
  section: 'Kundendaten' | 'Hund 1' | 'Hund 2'
}

type ValidationRow = ImportRow & {
  errors: string[]
}

// ─── System Fields ────────────────────────────────────────────────────────────

const SYSTEM_FIELDS: SystemField[] = [
  { key: 'salutation', label: 'Anrede', required: false, section: 'Kundendaten' },
  { key: 'first_name_1', label: 'Vorname', required: true, section: 'Kundendaten' },
  { key: 'last_name_1', label: 'Nachname', required: true, section: 'Kundendaten' },
  { key: 'first_name_2', label: 'Vorname 2', required: false, section: 'Kundendaten' },
  { key: 'last_name_2', label: 'Nachname 2', required: false, section: 'Kundendaten' },
  { key: 'email', label: 'E-Mail', required: true, section: 'Kundendaten' },
  { key: 'mobile_phone', label: 'Mobiltelefon', required: true, section: 'Kundendaten' },
  { key: 'phone', label: 'Festnetz', required: false, section: 'Kundendaten' },
  { key: 'street', label: 'Straße + Hausnummer', required: true, section: 'Kundendaten' },
  { key: 'zip', label: 'PLZ', required: true, section: 'Kundendaten' },
  { key: 'city', label: 'Ort', required: true, section: 'Kundendaten' },
  { key: 'referral_source', label: 'Wie auf uns aufmerksam?', required: false, section: 'Kundendaten' },
  { key: 'newsletter_consent', label: 'Newsletter-Einwilligung', required: false, section: 'Kundendaten' },
  { key: 'notes', label: 'Notizen', required: false, section: 'Kundendaten' },
  { key: 'dog1_name', label: 'Name (Hund 1)', required: false, section: 'Hund 1' },
  { key: 'dog1_breed', label: 'Rasse (Hund 1)', required: false, section: 'Hund 1' },
  { key: 'dog1_birth_date', label: 'Geburtsdatum (Hund 1)', required: false, section: 'Hund 1' },
  { key: 'dog1_gender', label: 'Geschlecht (Hund 1)', required: false, section: 'Hund 1' },
  { key: 'dog1_neutered', label: 'Kastriert (Hund 1)', required: false, section: 'Hund 1' },
  { key: 'dog2_name', label: 'Name (Hund 2)', required: false, section: 'Hund 2' },
  { key: 'dog2_breed', label: 'Rasse (Hund 2)', required: false, section: 'Hund 2' },
  { key: 'dog2_birth_date', label: 'Geburtsdatum (Hund 2)', required: false, section: 'Hund 2' },
  { key: 'dog2_gender', label: 'Geschlecht (Hund 2)', required: false, section: 'Hund 2' },
  { key: 'dog2_neutered', label: 'Kastriert (Hund 2)', required: false, section: 'Hund 2' },
]

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

function detectDelimiter(line: string): ',' | ';' {
  const commas = (line.match(/,/g) || []).length
  const semicolons = (line.match(/;/g) || []).length
  return semicolons >= commas ? ';' : ','
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Remove BOM
  const clean = text.replace(/^\uFEFF/, '')
  const lines = clean.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter)
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))

  return { headers, rows }
}

// ─── Auto-mapping ─────────────────────────────────────────────────────────────

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
}

const FIELD_ALIASES: Record<string, string> = {
  vorname: 'first_name_1',
  firstname: 'first_name_1',
  vornameinhaber: 'first_name_1',
  nachname: 'last_name_1',
  familienname: 'last_name_1',
  name: 'last_name_1',
  lastname: 'last_name_1',
  surname: 'last_name_1',
  vorname2: 'first_name_2',
  vorname2partner: 'first_name_2',
  partnername: 'first_name_2',
  nachname2: 'last_name_2',
  email: 'email',
  emailadresse: 'email',
  mail: 'email',
  mobil: 'mobile_phone',
  mobiltelefon: 'mobile_phone',
  handy: 'mobile_phone',
  mobilnummer: 'mobile_phone',
  mobile: 'mobile_phone',
  telefon: 'phone',
  festnetz: 'phone',
  tel: 'phone',
  phone: 'phone',
  strasse: 'street',
  strassenr: 'street',
  strassehausnummer: 'street',
  adresse: 'street',
  plz: 'zip',
  postleitzahl: 'zip',
  zipcode: 'zip',
  ort: 'city',
  stadt: 'city',
  wohnort: 'city',
  city: 'city',
  anrede: 'salutation',
  salutation: 'salutation',
  anschreiben: 'salutation',
  notizen: 'notes',
  notiz: 'notes',
  bemerkungen: 'notes',
  bemerkung: 'notes',
  herkunft: 'referral_source',
  wie: 'referral_source',
  newsletter: 'newsletter_consent',
  newslettereinwilligung: 'newsletter_consent',
  einwilligung: 'newsletter_consent',
  hundname: 'dog1_name',
  hund1name: 'dog1_name',
  hundname1: 'dog1_name',
  hund1: 'dog1_name',
  hundrasse: 'dog1_breed',
  rasse: 'dog1_breed',
  hund1rasse: 'dog1_breed',
  hundrasse1: 'dog1_breed',
  hundgeburtsdatum: 'dog1_birth_date',
  geburtsdatumhund: 'dog1_birth_date',
  hund1geburtsdatum: 'dog1_birth_date',
  hundgeburtsdatum1: 'dog1_birth_date',
  hundgeschlecht: 'dog1_gender',
  hund1geschlecht: 'dog1_gender',
  geschlecht: 'dog1_gender',
  hundkastriert: 'dog1_neutered',
  hund1kastriert: 'dog1_neutered',
  kastriert: 'dog1_neutered',
  hund2name: 'dog2_name',
  hundname2: 'dog2_name',
  hund2: 'dog2_name',
  hund2rasse: 'dog2_breed',
  hundrasse2: 'dog2_breed',
  hund2geburtsdatum: 'dog2_birth_date',
  hundgeburtsdatum2: 'dog2_birth_date',
  hund2geschlecht: 'dog2_gender',
  geschlecht2: 'dog2_gender',
  hund2kastriert: 'dog2_neutered',
  kastriert2: 'dog2_neutered',
}

function autoMatch(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const usedSystemFields = new Set<string>()

  for (const header of headers) {
    const norm = normalizeKey(header)
    const systemKey = FIELD_ALIASES[norm]
    if (systemKey && !usedSystemFields.has(systemKey)) {
      mapping[header] = systemKey
      usedSystemFields.add(systemKey)
    } else {
      mapping[header] = ''
    }
  }

  return mapping
}

// ─── Validation ───────────────────────────────────────────────────────────────

function parseBirthDate(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const trimmed = raw.trim()

  // DD.MM.YYYY
  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (deMatch) {
    const [, day, month, year] = deMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  return null
}

function parseBoolean(raw: string | null | undefined): boolean {
  if (!raw) return false
  const lower = raw.toLowerCase().trim()
  return lower === 'ja' || lower === 'yes' || lower === '1' || lower === 'true' || lower === 'x'
}

function buildImportRow(
  rowIndex: number,
  rawRow: Record<string, string>
): ValidationRow {
  const errors: string[] = []

  const first_name_1 = rawRow['first_name_1']?.trim() || ''
  const last_name_1 = rawRow['last_name_1']?.trim() || ''
  const email = rawRow['email']?.trim() || ''
  const mobile_phone = rawRow['mobile_phone']?.trim() || ''
  const street = rawRow['street']?.trim() || ''
  const zip = rawRow['zip']?.trim() || ''
  const city = rawRow['city']?.trim() || ''

  if (!first_name_1) errors.push('Vorname fehlt')
  if (!last_name_1) errors.push('Nachname fehlt')
  if (!email) {
    errors.push('E-Mail fehlt')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('E-Mail ungültig')
  }
  if (!mobile_phone) errors.push('Mobiltelefon fehlt')
  if (!street) errors.push('Straße fehlt')
  if (!zip) {
    errors.push('PLZ fehlt')
  } else if (!/^\d{5}$/.test(zip)) {
    errors.push('PLZ muss 5 Ziffern haben')
  }
  if (!city) errors.push('Ort fehlt')

  // Dog handling: promote dog2 to dog1 if dog1 is empty
  let dog1_name = rawRow['dog1_name']?.trim() || null
  let dog1_breed = rawRow['dog1_breed']?.trim() || null
  let dog1_birth_date = parseBirthDate(rawRow['dog1_birth_date'])
  let dog1_gender = rawRow['dog1_gender']?.trim() || null
  let dog1_neutered = rawRow['dog1_neutered'] ? parseBoolean(rawRow['dog1_neutered']) : null

  let dog2_name = rawRow['dog2_name']?.trim() || null
  let dog2_breed = rawRow['dog2_breed']?.trim() || null
  let dog2_birth_date = parseBirthDate(rawRow['dog2_birth_date'])
  let dog2_gender = rawRow['dog2_gender']?.trim() || null
  let dog2_neutered = rawRow['dog2_neutered'] ? parseBoolean(rawRow['dog2_neutered']) : null

  if (!dog1_name && dog2_name) {
    dog1_name = dog2_name
    dog1_breed = dog2_breed
    dog1_birth_date = dog2_birth_date
    dog1_gender = dog2_gender
    dog1_neutered = dog2_neutered
    dog2_name = null
    dog2_breed = null
    dog2_birth_date = null
    dog2_gender = null
    dog2_neutered = null
  }

  return {
    rowIndex,
    salutation: rawRow['salutation']?.trim() || null,
    first_name_1,
    last_name_1,
    first_name_2: rawRow['first_name_2']?.trim() || null,
    last_name_2: rawRow['last_name_2']?.trim() || null,
    street,
    zip,
    city,
    mobile_phone,
    phone: rawRow['phone']?.trim() || null,
    email,
    referral_source: rawRow['referral_source']?.trim() || null,
    newsletter_consent: parseBoolean(rawRow['newsletter_consent']),
    notes: rawRow['notes']?.trim() || null,
    dog1_name,
    dog1_breed,
    dog1_birth_date,
    dog1_gender,
    dog1_neutered,
    dog2_name,
    dog2_breed,
    dog2_birth_date,
    dog2_gender,
    dog2_neutered,
    errors,
  }
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ['Upload', 'Zuordnung', 'Vorschau', 'Duplikate', 'Ergebnis']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  done
                    ? 'bg-green-600 text-white'
                    : active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? '✓' : step}
              </div>
              <span
                className={`mt-1 text-xs ${
                  active ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-0.5 w-12 mx-2 mb-4 ${done ? 'bg-green-600' : 'bg-gray-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImportWizard() {
  const [step, setStep] = useState(1)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validRows, setValidRows] = useState<ValidationRow[]>([])
  const [invalidRows, setInvalidRows] = useState<ValidationRow[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, 'skip' | 'import'>>({})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: File Upload ──────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setFileError('Bitte eine CSV-Datei hochladen')
      return
    }

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Die Datei ist zu groß (max. 5 MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        setFileError('Die Datei enthält keine Daten')
        return
      }
      if (rows.length === 0) {
        setFileError('Die Datei enthält keine Daten')
        return
      }
      if (rows.length > 1000) {
        setFileError('Die Datei enthält mehr als 1.000 Zeilen. Bitte teilen Sie die Datei auf.')
        return
      }
      setCsvHeaders(headers)
      setCsvRawRows(rows)
      setMapping(autoMatch(headers))
    }
    reader.onerror = () => setFileError('Fehler beim Lesen der Datei')
    reader.readAsText(file, 'UTF-8')
  }

  // ── Check mapping completeness ──────────────────────────────────────────────

  function getMissingRequiredFields(): string[] {
    const mappedSystemKeys = new Set(Object.values(mapping).filter(Boolean))
    return SYSTEM_FIELDS
      .filter((f) => f.required && !mappedSystemKeys.has(f.key))
      .map((f) => f.label)
  }

  const missingRequired = getMissingRequiredFields()

  // ── Step 2 → 3: Validate ─────────────────────────────────────────────────────

  function handleGoToPreview() {
    if (missingRequired.length > 0) return

    const valid: ValidationRow[] = []
    const invalid: ValidationRow[] = []
    const seenEmails = new Set<string>()

    csvRawRows.forEach((rawRow, i) => {
      // Build a key-value record from mapping
      const mapped: Record<string, string> = {}
      csvHeaders.forEach((header, hi) => {
        const systemKey = mapping[header]
        if (systemKey) {
          mapped[systemKey] = rawRow[hi] || ''
        }
      })
      const row = buildImportRow(i + 2, mapped) // +2 = header row + 1-indexed

      // Internal duplicate detection: same email appearing twice in CSV
      if (row.email) {
        const emailLower = row.email.toLowerCase()
        if (seenEmails.has(emailLower)) {
          row.errors.push('Doppelte E-Mail-Adresse in der CSV')
        } else {
          seenEmails.add(emailLower)
        }
      }

      if (row.errors.length === 0) {
        valid.push(row)
      } else {
        invalid.push(row)
      }
    })

    setValidRows(valid)
    setInvalidRows(invalid)
    setStep(3)
  }

  // ── Step 3 → 4: Check Duplicates ─────────────────────────────────────────────

  async function handleGoToDuplicates() {
    setLoading(true)
    const emails = validRows.map((r) => r.email).filter(Boolean)
    const { duplicates: found, error } = await checkDuplicates(emails)
    setLoading(false)

    if (error) {
      alert(`Fehler bei Duplikat-Prüfung: ${error}`)
      return
    }

    setDuplicates(found)

    // Default: skip all duplicates
    const decisions: Record<string, 'skip' | 'import'> = {}
    found.forEach((d) => {
      decisions[d.email.toLowerCase()] = 'skip'
    })
    setDuplicateDecisions(decisions)

    if (found.length === 0) {
      // No duplicates → skip step 4, go to import directly
      await runImport(validRows, decisions)
    } else {
      setStep(4)
    }
  }

  // ── Step 4 → 5: Execute Import ───────────────────────────────────────────────

  async function runImport(
    rows: ValidationRow[],
    decisions: Record<string, 'skip' | 'import'>
  ) {
    setLoading(true)
    try {
      const result = await executeImport(rows as ImportRow[], decisions)
      setImportResult(result)
      setStep(5)
    } catch (err) {
      alert(
        `Import fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      )
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStep(1)
    setCsvHeaders([])
    setCsvRawRows([])
    setMapping({})
    setValidRows([])
    setInvalidRows([])
    setDuplicates([])
    setDuplicateDecisions({})
    setImportResult(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl">
      <StepIndicator current={step} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">CSV-Datei auswählen</h2>
          <p className="text-sm text-gray-500 mb-6">
            Unterstützt werden CSV-Dateien mit Komma- oder Semikolon-Trennzeichen und UTF-8-Kodierung.
            Die erste Zeile muss die Spaltenüberschriften enthalten.
          </p>

          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm font-medium text-gray-700">CSV-Datei hierher ziehen oder klicken</p>
              <p className="text-xs text-gray-400 mt-1">Nur .csv Dateien</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </label>

          {fileError && (
            <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {fileError}
            </div>
          )}

          {/* Preview after successful file load */}
          {csvHeaders.length > 0 && csvRawRows.length > 0 && (
            <div className="mt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-green-800">
                  Datei erfolgreich eingelesen: {csvRawRows.length} Datenzeilen, {csvHeaders.length} Spalten
                </p>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {csvHeaders.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvRawRows.slice(0, 3).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-500 whitespace-nowrap max-w-xs truncate">
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvRawRows.length > 3 && (
                <p className="text-xs text-gray-400 mt-1">
                  … und {csvRawRows.length - 3} weitere Zeilen
                </p>
              )}
              <div className="mt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Weiter zur Spaltenzuordnung
                </button>
              </div>
            </div>
          )}

          {csvHeaders.length === 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Pflichtfelder in der CSV:</p>
              <div className="flex flex-wrap gap-1.5">
                {SYSTEM_FIELDS.filter((f) => f.required).map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Column Mapping ── */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Spalten zuordnen</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {csvRawRows.length} Zeilen erkannt. Ordnen Sie die CSV-Spalten den Systemfeldern zu.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    CSV-Spalte
                  </th>
                  <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Beispielwert
                  </th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Systemfeld
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {csvHeaders.map((header, hi) => {
                  const example = csvRawRows[0]?.[hi] || ''
                  return (
                    <tr key={header}>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700 align-middle">
                        {header}
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-400 align-middle truncate max-w-xs">
                        {example || '—'}
                      </td>
                      <td className="py-2 align-middle">
                        <select
                          value={mapping[header] || ''}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [header]: e.target.value }))
                          }
                          className="h-8 text-sm border border-gray-300 rounded-md px-2 bg-white w-full max-w-xs"
                        >
                          <option value="">— ignorieren —</option>
                          {(['Kundendaten', 'Hund 1', 'Hund 2'] as const).map((section) => (
                            <optgroup key={section} label={section}>
                              {SYSTEM_FIELDS.filter((f) => f.section === section).map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.label}
                                  {f.required ? ' *' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-xs text-gray-400">* Pflichtfeld</div>

          {missingRequired.length > 0 && (
            <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              Nicht alle Pflichtfelder sind zugeordnet: {missingRequired.join(', ')}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Zurück
            </button>
            <button
              onClick={handleGoToPreview}
              disabled={missingRequired.length > 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vorschau & Validierung
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Validation ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vorschau & Validierung</h2>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Gültige Zeilen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Fehlerhafte Zeilen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{csvRawRows.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Zeilen gesamt</div>
              </div>
            </div>
          </div>

          {/* Invalid rows */}
          {invalidRows.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h3 className="text-sm font-semibold text-red-700 mb-3">
                Fehlerhafte Zeilen (werden übersprungen)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {invalidRows.map((row) => (
                  <div key={row.rowIndex} className="text-xs">
                    <span className="font-medium text-gray-700">Zeile {row.rowIndex}:</span>{' '}
                    {row.first_name_1 || row.last_name_1
                      ? `${row.first_name_1} ${row.last_name_1} — `
                      : ''}
                    <span className="text-red-600">{row.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid rows preview */}
          {validRows.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">
                  Vorschau gültiger Zeilen (max. 10)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">E-Mail</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">PLZ Ort</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Hunde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {validRows.slice(0, 10).map((row) => (
                      <tr key={row.rowIndex} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {row.first_name_1} {row.last_name_1}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                          {row.email}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                          {row.zip} {row.city}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                          {[row.dog1_name, row.dog2_name].filter(Boolean).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validRows.length > 10 && (
                <div className="px-6 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
                  … und {validRows.length - 10} weitere
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Zurück
            </button>
            {validRows.length === 0 ? (
              <span className="px-4 py-2 text-sm text-gray-400">
                Keine gültigen Zeilen zum Importieren
              </span>
            ) : (
              <button
                onClick={handleGoToDuplicates}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Prüfe Duplikate…' : `${validRows.length} Kunden importieren`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Duplicates ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-amber-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Duplikate gefunden ({duplicates.length})
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Diese E-Mail-Adressen existieren bereits im System. Entscheiden Sie für jeden Eintrag,
              ob er übersprungen oder trotzdem importiert werden soll.
            </p>

            <div className="space-y-3">
              {duplicates.map((dup) => {
                const decision = duplicateDecisions[dup.email.toLowerCase()] || 'skip'
                return (
                  <div
                    key={dup.email}
                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {dup.existingCustomer.first_name_1} {dup.existingCustomer.last_name_1}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dup.email} · {dup.existingCustomer.city}
                        {dup.existingCustomer.customer_number
                          ? ` · #${dup.existingCustomer.customer_number}`
                          : ''}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setDuplicateDecisions((prev) => ({
                            ...prev,
                            [dup.email.toLowerCase()]: 'skip',
                          }))
                        }
                        className={`px-3 py-1.5 text-xs rounded-md font-medium ${
                          decision === 'skip'
                            ? 'bg-gray-700 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Überspringen
                      </button>
                      <button
                        onClick={() =>
                          setDuplicateDecisions((prev) => ({
                            ...prev,
                            [dup.email.toLowerCase()]: 'import',
                          }))
                        }
                        className={`px-3 py-1.5 text-xs rounded-md font-medium ${
                          decision === 'import'
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Trotzdem importieren
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const all: Record<string, 'skip' | 'import'> = {}
                  duplicates.forEach((d) => (all[d.email.toLowerCase()] = 'skip'))
                  setDuplicateDecisions(all)
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Alle überspringen
              </button>
              <span className="text-xs text-gray-300">·</span>
              <button
                onClick={() => {
                  const all: Record<string, 'skip' | 'import'> = {}
                  duplicates.forEach((d) => (all[d.email.toLowerCase()] = 'import'))
                  setDuplicateDecisions(all)
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Alle importieren
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Zurück
            </button>
            <button
              onClick={() => runImport(validRows, duplicateDecisions)}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Importiere…' : 'Import starten'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Result ── */}
      {step === 5 && importResult && (
        <div className="space-y-4">
          {/* Summary card */}
          <div
            className={`rounded-lg border p-6 ${
              importResult.errorsSkipped === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {importResult.errorsSkipped === 0 ? '✓ Import abgeschlossen' : 'Import mit Fehlern'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {importResult.customersImported}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">Kunden importiert</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {importResult.dogsImported}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">Hunde importiert</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {importResult.duplicatesSkipped}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">Duplikate übersprungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.errorsSkipped}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">Fehler</div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {importResult.errors.filter((e) => !e.success).length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h3 className="text-sm font-semibold text-red-700 mb-3">
                Fehler beim Import
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {importResult.errors
                  .filter((e) => !e.success)
                  .map((e) => (
                    <div key={e.rowIndex} className="text-xs text-red-600">
                      Zeile {e.rowIndex}: {e.error}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Dog warnings */}
          {importResult.dogWarnings.length > 0 && (
            <div className="bg-white rounded-lg border border-amber-200 p-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-3">
                Hinweise zu Hunden ({importResult.dogWarnings.length})
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {importResult.dogWarnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700">
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Neuen Import starten
            </button>
            <a
              href="/kunden"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium inline-block"
            >
              Zur Kundenliste
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
