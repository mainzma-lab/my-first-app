'use client'

import { useState, useEffect } from 'react'
import {
  type BookingWithDetails,
  type Kennel,
  type CustomerForAutocomplete,
  createBooking,
  updateBooking,
  updateBookingStatus,
  cancelBooking,
  calculatePrice,
  checkKennelAvailability,
  getBookingDetails,
} from './actions'
import BuchungsStatusBadge from './BuchungsStatusBadge'

type Props = {
  booking: BookingWithDetails | null
  isOpen: boolean
  onClose: () => void
  kennels: Kennel[]
  allActiveCustomers: CustomerForAutocomplete[]
  prefilledCustomerId?: string
  prefilledCustomerName?: string
  prefilledKennelIds?: string[]
  prefilledStartDate?: string
  onSaved: (booking: BookingWithDetails, isNew: boolean) => void
  onStatusChanged: (booking: BookingWithDetails) => void
  onCancelled: (id: string) => void
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  uebernachtung: 'Übernachtung',
  tagesbetreuung_flexibel: 'Tagesbetreuung (flexibel)',
  tagesbetreuung_regelmaessig: 'Tagesbetreuung (regelmäßig)',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPrice(price: number | null) {
  if (price === null) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
}

const inputClass = 'w-full h-9 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
const textareaClass = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
const labelClass = 'block text-xs font-medium text-gray-600 mb-0.5'
const sectionClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2 pb-1 border-b border-gray-100'

export default function BuchungsModal({
  booking,
  isOpen,
  onClose,
  kennels,
  allActiveCustomers,
  prefilledCustomerId,
  prefilledCustomerName,
  prefilledKennelIds,
  prefilledStartDate,
  onSaved,
  onStatusChanged,
  onCancelled,
}: Props) {
  const isNew = booking === null

  // ─── Mode & Step ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view')
  const [step, setStep] = useState<1 | 2>(1)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [availableDogs, setAvailableDogs] = useState<{ id: string; name: string }[]>([])

  const [bookingType, setBookingType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDogs, setSelectedDogs] = useState<string[]>([])
  const [displayPrice, setDisplayPrice] = useState('')
  const [priceOverridden, setPriceOverridden] = useState(false)

  // Step 2 fields
  const [selectedKennels, setSelectedKennels] = useState<string[]>([])
  const [kennelWarnings, setKennelWarnings] = useState<Map<string, boolean>>(new Map())
  const [medicationNotes, setMedicationNotes] = useState('')
  const [medicationSchedule, setMedicationSchedule] = useState('')
  const [itemsList, setItemsList] = useState('')
  const [frequency, setFrequency] = useState('')
  const [notes, setNotes] = useState('')

  // ─── Cancel dialog ────────────────────────────────────────────────────────
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelFee, setCancelFee] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)

  // ─── Saving / errors ──────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)

  // ─── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    if (isNew) {
      setMode('create')
      setStep(1)
      setFormError(null)
      setSelectedDogs([])
      setSelectedKennels([])
      setKennelWarnings(new Map())
      setMedicationNotes('')
      setMedicationSchedule('')
      setItemsList('')
      setFrequency('')
      setNotes('')
      setDisplayPrice('')
      setPriceOverridden(false)
      setBookingType('')
      setStartDate('')
      setEndDate('')

      if (prefilledCustomerId && prefilledCustomerName) {
        setSelectedCustomerId(prefilledCustomerId)
        setSelectedCustomerName(prefilledCustomerName)
        setCustomerSearch(prefilledCustomerName)
        const cust = allActiveCustomers.find(c => c.id === prefilledCustomerId)
        setAvailableDogs(cust?.dogs ?? [])
      } else {
        setSelectedCustomerId('')
        setSelectedCustomerName('')
        setCustomerSearch('')
        setAvailableDogs([])
      }

      if (prefilledKennelIds && prefilledKennelIds.length > 0) {
        setSelectedKennels(prefilledKennelIds)
      }
      if (prefilledStartDate) {
        setStartDate(prefilledStartDate)
      }
    } else if (booking) {
      setMode('view')
      setStep(1)
      setFormError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isNew])

  // Pre-fill edit form when switching to edit mode
  useEffect(() => {
    if (mode === 'edit' && booking) {
      setBookingType(booking.booking_type)
      setStartDate(booking.start_date)
      setEndDate(booking.end_date)
      setSelectedDogs(booking.dogs.map(d => d.id))
      setSelectedKennels(booking.kennels.map(k => k.id))
      setKennelWarnings(new Map())
      setMedicationNotes(booking.medication_notes ?? '')
      setMedicationSchedule(booking.medication_schedule ?? '')
      setItemsList(booking.items_list ?? '')
      setFrequency(booking.frequency ?? '')
      setNotes(booking.notes ?? '')
      setDisplayPrice(booking.total_price !== null ? String(booking.total_price) : '')
      setPriceOverridden(true) // existing price should not be auto-replaced

      const custId = booking.customer_id
      setSelectedCustomerId(custId)
      const cust = allActiveCustomers.find(c => c.id === custId)
      const name = booking.customer_name
      setSelectedCustomerName(name)
      setCustomerSearch(name)
      setAvailableDogs(cust?.dogs ?? booking.dogs)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ─── Auto price calculation ───────────────────────────────────────────────
  useEffect(() => {
    if (priceOverridden || !bookingType || !startDate || !endDate || selectedDogs.length === 0) return
    if (new Date(endDate) < new Date(startDate)) return

    const dogCount = Math.min(selectedDogs.length, 2)
    const freq = bookingType === 'tagesbetreuung_regelmaessig' ? frequency || null : null

    setIsPriceCalculating(true)
    calculatePrice(bookingType, startDate, endDate, dogCount, freq).then(price => {
      setIsPriceCalculating(false)
      if (price !== null) setDisplayPrice(String(price))
    })
  }, [bookingType, startDate, endDate, selectedDogs.length, frequency, priceOverridden])

  // ─── Customer autocomplete ────────────────────────────────────────────────
  const filteredCustomers = allActiveCustomers.filter(c => {
    const q = customerSearch.toLowerCase()
    return (
      c.first_name_1.toLowerCase().includes(q) ||
      c.last_name_1.toLowerCase().includes(q)
    )
  }).slice(0, 8)

  function selectCustomer(c: CustomerForAutocomplete) {
    setSelectedCustomerId(c.id)
    setSelectedCustomerName(`${c.first_name_1} ${c.last_name_1}`)
    setCustomerSearch(`${c.first_name_1} ${c.last_name_1}`)
    setAvailableDogs(c.dogs)
    setSelectedDogs([])
    setShowDropdown(false)
  }

  // ─── Kennel toggle ────────────────────────────────────────────────────────
  async function toggleKennel(kennelId: string) {
    if (selectedKennels.includes(kennelId)) {
      setSelectedKennels(prev => prev.filter(k => k !== kennelId))
      setKennelWarnings(prev => { const m = new Map(prev); m.delete(kennelId); return m })
      return
    }
    if (selectedKennels.length >= 3) return

    setSelectedKennels(prev => [...prev, kennelId])

    if (startDate && endDate) {
      const available = await checkKennelAvailability(
        kennelId, startDate, endDate, booking?.id
      )
      setKennelWarnings(prev => {
        const m = new Map(prev)
        if (!available) m.set(kennelId, true)
        else m.delete(kennelId)
        return m
      })
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setIsSaving(true)
    setFormError(null)

    const fd = new FormData()
    if (mode === 'create') fd.set('customer_id', selectedCustomerId)
    fd.set('booking_type', bookingType)
    fd.set('start_date', startDate)
    fd.set('end_date', endDate)
    fd.set('total_price', displayPrice)
    fd.set('notes', notes)
    fd.set('medication_notes', medicationNotes)
    if (bookingType === 'uebernachtung') {
      fd.set('medication_schedule', medicationSchedule)
      fd.set('items_list', itemsList)
    }
    if (bookingType === 'tagesbetreuung_regelmaessig') {
      fd.set('frequency', frequency)
    }
    for (const dogId of selectedDogs) fd.append('dog_ids', dogId)
    for (const kennelId of selectedKennels) fd.append('kennel_ids', kennelId)

    let result
    if (mode === 'create') {
      result = await createBooking({ error: null, success: null }, fd)
    } else {
      result = await updateBooking(booking!.id, { error: null, success: null }, fd)
    }

    if (result.error) {
      setFormError(result.error)
      setIsSaving(false)
      return
    }

    // Re-fetch to get full details
    if (mode === 'create') {
      // Fetch the latest booking for this customer to get the new one
      // For simplicity, close and let the list refresh via revalidatePath
      // Actually we need to return the new booking — fetch by searching recent
      // Instead, we call getBookings internally — but simpler: close modal and let server revalidation handle it
      // Since we need to pass the new booking to onSaved, fetch it
      // The page will revalidate but we need the object for optimistic update
      // Workaround: fetch the most recent booking for this customer
      const { getCustomerBookings } = await import('./actions')
      const customerBookings = await getCustomerBookings(selectedCustomerId)
      const newest = customerBookings[0]
      if (newest) onSaved(newest, true)
      else onSaved({ id: 'unknown', customer_id: selectedCustomerId, customer_name: selectedCustomerName, booking_type: bookingType as BookingWithDetails['booking_type'], start_date: startDate, end_date: endDate, duration_days: 0, total_price: displayPrice ? parseFloat(displayPrice) : null, notes, medication_notes: medicationNotes, medication_schedule: medicationSchedule, items_list: itemsList, frequency: frequency || null, status: 'geplant', cancellation_date: null, cancellation_fee: null, cancellation_reason: null, created_at: new Date().toISOString(), dogs: [], kennels: [] }, true)
    } else {
      const updated = await getBookingDetails(booking!.id)
      if (updated) onSaved(updated, false)
    }

    setIsSaving(false)
  }

  // ─── Status actions ───────────────────────────────────────────────────────
  async function handleStatusChange(newStatus: 'aktiv' | 'abgeschlossen') {
    if (!booking) return
    setIsSaving(true)
    const result = await updateBookingStatus(booking.id, newStatus)
    if (result.error) { setFormError(result.error); setIsSaving(false); return }
    const updated = await getBookingDetails(booking.id)
    if (updated) onStatusChanged(updated)
    setIsSaving(false)
    onClose()
  }

  async function handleCancel() {
    if (!booking) return
    setCancelError(null)
    if (!cancelReason.trim()) { setCancelError('Bitte einen Grund angeben.'); return }
    setIsSaving(true)
    const fee = cancelFee ? parseFloat(cancelFee) : null
    const result = await cancelBooking(booking.id, fee, cancelReason)
    if (result.error) { setCancelError(result.error); setIsSaving(false); return }
    onCancelled(booking.id)
    setIsSaving(false)
  }

  if (!isOpen) return null

  // ─── Detail view ──────────────────────────────────────────────────────────
  function DetailView() {
    if (!booking) return null
    const canEdit = booking.status === 'geplant'
    const canActivate = booking.status === 'geplant'
    const canComplete = booking.status === 'aktiv'
    const canCancel = booking.status === 'geplant' || booking.status === 'aktiv'

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Buchungs-ID</span>
            <p className="font-mono text-gray-700 text-xs">{booking.id.slice(0, 8)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Erstellt am</span>
            <p className="text-gray-900">{formatDate(booking.created_at.slice(0, 10))}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Kunde</span>
            <p className="text-gray-900 font-medium">{booking.customer_name}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Typ</span>
            <p className="text-gray-900">{BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Zeitraum</span>
            <p className="text-gray-900">
              {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
              <span className="text-gray-400 text-xs ml-1">({booking.duration_days} {booking.duration_days === 1 ? 'Tag' : 'Tage'})</span>
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Preis</span>
            <p className="text-gray-900 font-medium">{formatPrice(booking.total_price)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Hunde</span>
            <p className="text-gray-900">
              {booking.dogs.length > 0 ? booking.dogs.map(d => d.name).join(', ') : <span className="italic text-gray-400">Keine</span>}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Zwinger</span>
            <p className="text-gray-900">
              {booking.kennels.length > 0
                ? booking.kennels.map(k => `Zwinger ${k.number}`).join(', ')
                : <span className="italic text-gray-400">Nicht zugewiesen</span>}
            </p>
          </div>
          {booking.frequency && (
            <div>
              <span className="text-gray-500 text-xs">Frequenz</span>
              <p className="text-gray-900">{booking.frequency === '1x_woche' ? '1× pro Woche' : '2× pro Woche'}</p>
            </div>
          )}
        </div>

        {booking.medication_notes && (
          <div>
            <p className="text-xs text-gray-500">Medikamentengabe</p>
            <p className="text-sm text-gray-800 mt-0.5">{booking.medication_notes}</p>
          </div>
        )}
        {booking.medication_schedule && (
          <div>
            <p className="text-xs text-gray-500">Medikamentenplan</p>
            <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{booking.medication_schedule}</p>
          </div>
        )}
        {booking.items_list && (
          <div>
            <p className="text-xs text-gray-500">Gepäckliste</p>
            <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{booking.items_list}</p>
          </div>
        )}
        {booking.notes && (
          <div>
            <p className="text-xs text-gray-500">Interne Notizen</p>
            <p className="text-sm text-gray-800 mt-0.5">{booking.notes}</p>
          </div>
        )}

        {booking.status === 'storniert' && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-1">
            <p className="text-xs font-medium text-red-700">Storniert</p>
            {booking.cancellation_date && <p className="text-xs text-red-600">Datum: {formatDate(booking.cancellation_date)}</p>}
            {booking.cancellation_fee !== null && <p className="text-xs text-red-600">Gebühr: {formatPrice(booking.cancellation_fee)}</p>}
            {booking.cancellation_reason && <p className="text-xs text-red-600">Grund: {booking.cancellation_reason}</p>}
          </div>
        )}

        {formError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">{formError}</div>
        )}

        {/* Status actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {canEdit && (
            <button
              onClick={() => { setMode('edit'); setStep(1) }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Bearbeiten
            </button>
          )}
          {canActivate && (
            <button
              onClick={() => handleStatusChange('aktiv')}
              disabled={isSaving}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              Aktivieren
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => handleStatusChange('abgeschlossen')}
              disabled={isSaving}
              className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-500 disabled:opacity-50 transition-colors"
            >
              Abschließen
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => { setShowCancelDialog(true); setCancelFee(''); setCancelReason(''); setCancelError(null) }}
              disabled={isSaving}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Stornieren
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Step 1 form ──────────────────────────────────────────────────────────
  function Step1Form() {
    return (
      <div className="space-y-4">
        {formError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">{formError}</div>
        )}

        {/* Customer autocomplete (only in create mode) */}
        {mode === 'create' && (
          <div className="relative">
            <label className={labelClass}>Kunde *</label>
            <input
              type="text"
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value)
                setSelectedCustomerId('')
                setSelectedCustomerName('')
                setAvailableDogs([])
                setSelectedDogs([])
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Name eingeben…"
              className={inputClass}
            />
            {showDropdown && customerSearch.length >= 1 && filteredCustomers.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectCustomer(c) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {c.first_name_1} {c.last_name_1}
                      {c.dogs.length > 0 && (
                        <span className="ml-2 text-xs text-gray-400">{c.dogs.map(d => d.name).join(', ')}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Booking type */}
        <div>
          <label className={labelClass}>Buchungstyp *</label>
          <select
            value={bookingType}
            onChange={e => { setBookingType(e.target.value); setPriceOverridden(false) }}
            className={inputClass}
          >
            <option value="" disabled>— Typ wählen —</option>
            <option value="uebernachtung">Übernachtung</option>
            <option value="tagesbetreuung_flexibel">Tagesbetreuung (flexibel)</option>
            <option value="tagesbetreuung_regelmaessig">Tagesbetreuung (regelmäßig)</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Von *</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPriceOverridden(false) }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Bis *</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPriceOverridden(false) }}
              className={inputClass}
            />
          </div>
        </div>

        {/* Dogs */}
        <div>
          <label className={labelClass}>Hunde</label>
          {availableDogs.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5 border border-amber-200">
              ⚠ Für diesen Kunden sind keine Hunde erfasst. Die Buchung kann trotzdem gespeichert werden.
            </p>
          ) : (
            <div className="space-y-1">
              {availableDogs.map(dog => (
                <label key={dog.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDogs.includes(dog.id)}
                    onChange={e => {
                      setSelectedDogs(prev =>
                        e.target.checked ? [...prev, dog.id] : prev.filter(id => id !== dog.id)
                      )
                      setPriceOverridden(false)
                    }}
                    className="rounded border-gray-300"
                  />
                  {dog.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div>
          <label className={labelClass}>
            Preis (€)
            {isPriceCalculating && <span className="ml-2 text-gray-400 font-normal">Berechne…</span>}
            {!isPriceCalculating && !priceOverridden && displayPrice && (
              <span className="ml-2 text-gray-400 font-normal">automatisch berechnet</span>
            )}
            {priceOverridden && <span className="ml-2 text-gray-400 font-normal">manuell</span>}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={displayPrice}
            onChange={e => { setDisplayPrice(e.target.value); setPriceOverridden(true) }}
            placeholder="0.00"
            className={inputClass}
          />
          {priceOverridden && displayPrice && (
            <button
              type="button"
              onClick={() => setPriceOverridden(false)}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800"
            >
              Automatisch berechnen
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Step 2 form ──────────────────────────────────────────────────────────
  function Step2Form() {
    const showKennels = true
    const showMedSchedule = bookingType === 'uebernachtung'
    const showItems = bookingType === 'uebernachtung'
    const showFrequency = bookingType === 'tagesbetreuung_regelmaessig'

    return (
      <div className="space-y-4">
        {formError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">{formError}</div>
        )}

        {/* Kennels */}
        {showKennels && (
          <div>
            <p className={sectionClass}>Zwingerzuweisung (max. 3)</p>
            {(!startDate || !endDate) && (
              <p className="text-xs text-amber-600 mb-2">Bitte zuerst Start- und Enddatum im ersten Schritt auswählen, um die Verfügbarkeit zu prüfen.</p>
            )}
            <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto">
              {kennels.map(kennel => {
                const selected = selectedKennels.includes(kennel.id)
                const hasWarning = kennelWarnings.get(kennel.id) === true
                const disabled = !selected && selectedKennels.length >= 3
                return (
                  <button
                    key={kennel.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleKennel(kennel.id)}
                    title={hasWarning ? `Zwinger ${kennel.number}: Konflikt für diesen Zeitraum!` : `Zwinger ${kennel.number} (${kennel.size})`}
                    className={`rounded-md border text-xs font-medium py-1.5 transition-colors ${
                      selected
                        ? hasWarning
                          ? 'bg-amber-100 border-amber-400 text-amber-800'
                          : 'bg-gray-900 border-gray-900 text-white'
                        : disabled
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {kennel.number}
                    {hasWarning && <span className="ml-0.5">⚠</span>}
                  </button>
                )
              })}
            </div>
            {kennelWarnings.size > 0 && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                ⚠ Ein oder mehrere Zwinger sind für diesen Zeitraum möglicherweise bereits belegt. Die Buchung kann trotzdem gespeichert werden.
              </p>
            )}
          </div>
        )}

        {/* Medication */}
        <div>
          <p className={sectionClass}>Medikamente & Pflegehinweise</p>
          <div>
            <label className={labelClass}>Medikamentengabe</label>
            <textarea
              rows={2}
              value={medicationNotes}
              onChange={e => setMedicationNotes(e.target.value)}
              className={textareaClass}
              placeholder="Art der Medikamente, Dosierung…"
            />
          </div>
          {showMedSchedule && (
            <div className="mt-2">
              <label className={labelClass}>Medikamentenplan</label>
              <textarea
                rows={3}
                value={medicationSchedule}
                onChange={e => setMedicationSchedule(e.target.value)}
                className={textareaClass}
                placeholder="Zeitplan für die Medikamentengabe…"
              />
            </div>
          )}
        </div>

        {showItems && (
          <div>
            <p className={sectionClass}>Gepäck</p>
            <label className={labelClass}>Gepäckliste</label>
            <textarea
              rows={3}
              value={itemsList}
              onChange={e => setItemsList(e.target.value)}
              className={textareaClass}
              placeholder="Mitgebrachte Gegenstände…"
            />
          </div>
        )}

        {showFrequency && (
          <div>
            <p className={sectionClass}>Frequenz</p>
            <label className={labelClass}>Häufigkeit pro Woche *</label>
            <select
              value={frequency}
              onChange={e => { setFrequency(e.target.value); setPriceOverridden(false) }}
              className={inputClass}
            >
              <option value="" disabled>— Frequenz wählen —</option>
              <option value="1x_woche">1× pro Woche</option>
              <option value="2x_woche">2× pro Woche</option>
            </select>
          </div>
        )}

        <div>
          <p className={sectionClass}>Notizen</p>
          <label className={labelClass}>Interne Notizen</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={textareaClass}
            placeholder="Interne Hinweise zur Buchung…"
          />
        </div>
      </div>
    )
  }

  // ─── Cancel dialog ────────────────────────────────────────────────────────
  if (showCancelDialog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Buchung stornieren</h3>
          <div>
            <label className={labelClass}>Stornierungsgebühr (€, optional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cancelFee}
              onChange={e => setCancelFee(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Stornierungsgrund *</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className={textareaClass}
              placeholder="Grund für die Stornierung…"
            />
          </div>
          {cancelError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">{cancelError}</div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Storniere…' : 'Stornieren bestätigen'}
            </button>
            <button
              onClick={() => setShowCancelDialog(false)}
              disabled={isSaving}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main modal ───────────────────────────────────────────────────────────
  const title = isNew
    ? 'Neue Buchung'
    : mode === 'edit'
      ? 'Buchung bearbeiten'
      : booking?.customer_name ?? 'Buchung'

  const isFormMode = mode === 'create' || mode === 'edit'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {!isNew && booking && mode === 'view' && <BuchungsStatusBadge status={booking.status} />}
            {isFormMode && (
              <span className="text-xs text-gray-400">Schritt {step} von 2</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'view' && <DetailView />}
          {isFormMode && step === 1 && <Step1Form />}
          {isFormMode && step === 2 && <Step2Form />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 shrink-0 flex justify-between items-center">
          <div>
            {isFormMode && step === 2 && (
              <button
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Zurück
              </button>
            )}
            {mode === 'edit' && (
              <button
                onClick={() => setMode('view')}
                disabled={isSaving}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {isFormMode && step === 1 && (
              <button
                onClick={() => {
                  if (!selectedCustomerId && mode === 'create') { setFormError('Bitte einen Kunden auswählen.'); return }
                  if (!bookingType) { setFormError('Bitte einen Buchungstyp wählen.'); return }
                  if (!startDate || !endDate) { setFormError('Bitte Start- und Enddatum auswählen.'); return }
                  setFormError(null)
                  setStep(2)
                }}
                className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
              >
                Weiter →
              </button>
            )}
            {isFormMode && step === 2 && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Speichern…' : 'Speichern'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
