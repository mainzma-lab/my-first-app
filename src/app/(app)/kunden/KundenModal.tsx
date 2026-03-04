'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getCustomerDetails,
  updateCustomerStatus,
  setManuallyInactive,
  reactivateCustomer,
  type FullCustomer,
  type Dog,
} from './actions'
import {
  getCustomerBookings,
  getAvailableKennels,
  getActiveCustomersForAutocomplete,
  type BookingWithDetails,
  type Kennel,
  type CustomerForAutocomplete,
} from '../buchungen/actions'
import KundenFormular from './KundenFormular'
import HundeSection from './HundeSection'
import KundenBuchungenSection from './KundenBuchungenSection'
import StatusBadge from './StatusBadge'
import BuchungsModal from '../buchungen/BuchungsModal'

type CustomerOverview = Record<string, unknown>

type Props = {
  customer: CustomerOverview | null
  isOpen: boolean
  isNewCustomer: boolean
  onClose: () => void
  inactivityThreshold: number
}

type Tab = 'kontaktdaten' | 'hunde' | 'buchungen'

function isInactive(customer: FullCustomer | null, threshold: number): boolean {
  if (!customer) return false
  if (customer.is_manually_inactive) return true
  if (customer.status !== 'neukunde_gewonnen') return false
  if (!customer.last_stay_date) return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - threshold)
  return new Date(customer.last_stay_date as string) < cutoff
}

// Pipeline transition config
type Transition = {
  label: string
  newStatus?: string
  action?: 'inaktiv' | 'reaktivieren'
  requiresReason?: boolean
}

function getTransitions(customer: FullCustomer | null, inactive: boolean): Transition[] {
  if (!customer) return []
  const { status } = customer
  const transitions: Transition[] = []

  if (status === 'im_prozess') {
    transitions.push({ label: 'Probebesuch vereinbart', newStatus: 'probebesuch' })
    transitions.push({ label: 'Abgesagt (Kunde)', newStatus: 'absage_kunde', requiresReason: true })
    transitions.push({ label: 'Abgesagt (Betrieb)', newStatus: 'absage_gudrun', requiresReason: true })
  }
  if (status === 'probebesuch') {
    transitions.push({ label: 'Stammkunde werden', newStatus: 'neukunde_gewonnen' })
    transitions.push({ label: 'Abgesagt (Kunde)', newStatus: 'absage_kunde', requiresReason: true })
    transitions.push({ label: 'Abgesagt (Betrieb)', newStatus: 'absage_gudrun', requiresReason: true })
  }
  if (status === 'neukunde_gewonnen' && !inactive) {
    transitions.push({ label: 'Als Inaktiv markieren', action: 'inaktiv' })
  }
  if (inactive && customer.is_manually_inactive) {
    transitions.push({ label: 'Wieder aktivieren', action: 'reaktivieren' })
  }
  if (status === 'absage_kunde' || status === 'absage_gudrun') {
    transitions.push({ label: 'Als Interessent reaktivieren', newStatus: 'im_prozess' })
    transitions.push({ label: 'Als Stammkunde reaktivieren', newStatus: 'neukunde_gewonnen' })
  }

  return transitions
}

// ─── Detail view (read-only Kontaktdaten) ────────────────────────────────────
function KundeDetailView({ customer }: { customer: FullCustomer }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE')

  const rows: [string, string | null | undefined][] = [
    ['Kundennummer', customer.customer_number ? String(customer.customer_number) : null],
    ['Anrede', customer.salutation],
    ['Name', `${customer.first_name_1} ${customer.last_name_1}`],
    customer.first_name_2
      ? ['Person 2', `${customer.salutation_2 ? customer.salutation_2 + ' ' : ''}${customer.first_name_2} ${customer.last_name_2}`]
      : ['', null],
    ['Adresse', `${customer.street}, ${customer.zip} ${customer.city}`],
    ['Mobilnummer', customer.mobile_phone],
    customer.second_mobile_phone ? ['2. Mobilnummer', customer.second_mobile_phone] : ['', null],
    customer.phone ? ['Festnetz', customer.phone] : ['', null],
    ['E-Mail', customer.email],
    customer.second_email ? ['2. E-Mail', customer.second_email] : ['', null],
    customer.referral_source ? ['Wie erfahren?', customer.referral_source] : ['', null],
    ['Newsletter', customer.newsletter_consent ? 'Eingewilligt' : 'Nicht eingewilligt'],
    customer.notes ? ['Notizen', customer.notes] : ['', null],
    customer.status_reason ? ['Status-Begründung', customer.status_reason] : ['', null],
  ]

  return (
    <div className="space-y-4">
      <dl className="space-y-2">
        {rows
          .filter(([label, value]) => label && value)
          .map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-2">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="col-span-2 text-sm text-gray-900">{value}</dd>
            </div>
          ))}
      </dl>

      {/* Booking stats */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Buchungsübersicht</p>
        {([
          ['Letzte Buchung', customer.last_stay_date ? fmt(customer.last_stay_date) : '—'],
          ['Nächste Buchung', customer.next_booking_date ? fmt(customer.next_booking_date) : '—'],
          ['Buchungen (12 Monate)', String(customer.bookings_last_12_months ?? 0)],
          ['Übernachtungstage (12 Mon.)', String(customer.pension_days_last_12_months ?? 0)],
          ['Betreuungstage (12 Mon.)', String(customer.daycare_days_last_12_months ?? 0)],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-2">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="col-span-2 text-sm text-gray-900">{value}</dd>
          </div>
        ))}
      </div>

      {customer.has_google_review && (
        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Google Bewertung</p>
          {customer.google_review_stars && (
            <p className="text-sm text-yellow-600">
              {'★'.repeat(customer.google_review_stars)}{'☆'.repeat(5 - customer.google_review_stars)}
              {' '}({customer.google_review_stars}/5)
              {customer.google_review_date && (
                <span className="ml-2 text-gray-400 text-xs">
                  {new Date(customer.google_review_date).toLocaleDateString('de-DE')}
                </span>
              )}
            </p>
          )}
          {customer.google_review_text && (
            <p className="text-sm text-gray-700 italic">&ldquo;{customer.google_review_text}&rdquo;</p>
          )}
          {customer.google_review_link && (
            <a
              href={customer.google_review_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Bewertung auf Google ansehen ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function KundenModal({
  customer,
  isOpen,
  isNewCustomer,
  onClose,
  inactivityThreshold,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('kontaktdaten')
  const [isEditing, setIsEditing] = useState(false)
  const [details, setDetails] = useState<{ customer: FullCustomer; dogs: Dog[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [createdCustomerId, setCreatedCustomerId] = useState<string | undefined>()
  const [, startTransition] = useTransition()

  // Buchungen tab state
  const [customerBookings, setCustomerBookings] = useState<BookingWithDetails[]>([])
  const [showBuchungsModal, setShowBuchungsModal] = useState(false)
  const [buchungsKennels, setBuchungsKennels] = useState<Kennel[]>([])
  const [buchungsCustomers, setBuchungsCustomers] = useState<CustomerForAutocomplete[]>([])

  const customerId = createdCustomerId ?? (customer?.id as string | undefined)

  // Load details when modal opens for existing customer
  useEffect(() => {
    if (!isOpen) {
      setDetails(null)
      setIsEditing(false)
      setActiveTab('kontaktdaten')
      setPendingTransition(null)
      setReasonText('')
      setCreatedCustomerId(undefined)
      setCustomerBookings([])
      return
    }
    if (isNewCustomer) {
      setIsEditing(true)
      return
    }
    if (!customerId) return

    setIsLoading(true)
    Promise.all([
      getCustomerDetails(customerId),
      getCustomerBookings(customerId),
    ]).then(([customerResult, bookingsResult]) => {
      setDetails(customerResult)
      setCustomerBookings(bookingsResult)
      setIsLoading(false)
    })
  }, [isOpen, customerId, isNewCustomer])

  async function refreshDetails() {
    if (!customerId) return
    const [customerResult, bookingsResult] = await Promise.all([
      getCustomerDetails(customerId),
      getCustomerBookings(customerId),
    ])
    setDetails(customerResult)
    setCustomerBookings(bookingsResult)
  }

  async function handleTransition(transition: Transition) {
    if (!details?.customer) return

    if (transition.requiresReason) {
      setPendingTransition(transition)
      return
    }

    if (transition.action === 'inaktiv') {
      await setManuallyInactive(details.customer.id)
      await refreshDetails()
      return
    }
    if (transition.action === 'reaktivieren') {
      await reactivateCustomer(details.customer.id)
      await refreshDetails()
      return
    }
    if (transition.newStatus) {
      await updateCustomerStatus(details.customer.id, transition.newStatus)
      await refreshDetails()
    }
  }

  async function confirmTransition() {
    if (!pendingTransition?.newStatus || !details?.customer) return
    startTransition(async () => {
      await updateCustomerStatus(details.customer.id, pendingTransition.newStatus!, reasonText || undefined)
      await refreshDetails()
      setPendingTransition(null)
      setReasonText('')
    })
  }

  if (!isOpen) return null

  const fullCustomer = details?.customer ?? null
  const dogs = details?.dogs ?? []
  const inactive = isInactive(fullCustomer, inactivityThreshold)
  const transitions = getTransitions(fullCustomer, inactive)

  const title = fullCustomer
    ? `${fullCustomer.first_name_1} ${fullCustomer.last_name_1}`
    : isNewCustomer
    ? 'Neuer Kunde'
    : '…'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal card */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {fullCustomer && (
              <StatusBadge status={fullCustomer.status} isInactive={inactive} />
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs (for existing customers, or after new customer was just created) */}
        {(!isNewCustomer || details !== null) && (
          <div className="flex gap-1 border-b border-gray-200 px-4 bg-gray-50">
            {(['kontaktdaten', 'hunde', 'buchungen'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-4 text-sm font-medium rounded-t-md border -mb-px transition-colors ${
                  activeTab === tab
                    ? 'bg-white border-gray-200 border-b-white text-gray-900'
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70'
                }`}
              >
                {tab === 'kontaktdaten'
                  ? 'Kontaktdaten'
                  : tab === 'hunde'
                  ? `Hunde (${dogs.length})`
                  : `Buchungen (${customerBookings.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Laden…
            </div>
          ) : activeTab === 'kontaktdaten' ? (
            isEditing ? (
              <KundenFormular
                customer={fullCustomer ?? undefined}
                onSuccess={async (newCustomerId?: string) => {
                  if (isNewCustomer && newCustomerId) {
                    setCreatedCustomerId(newCustomerId)
                    setIsEditing(false)
                    setIsLoading(true)
                    const [result, bookings] = await Promise.all([
                      getCustomerDetails(newCustomerId),
                      getCustomerBookings(newCustomerId),
                    ])
                    setDetails(result)
                    setCustomerBookings(bookings)
                    setIsLoading(false)
                    setActiveTab('hunde')
                  } else {
                    setIsEditing(false)
                    refreshDetails()
                  }
                }}
                onCancel={() => {
                  if (isNewCustomer) onClose()
                  else setIsEditing(false)
                }}
              />
            ) : fullCustomer ? (
              <KundeDetailView customer={fullCustomer} />
            ) : null
          ) : activeTab === 'hunde' ? (
            <HundeSection
              dogs={dogs}
              customerId={customerId!}
              onRefresh={refreshDetails}
            />
          ) : (
            <KundenBuchungenSection
              bookings={customerBookings}
              onNewBooking={async () => {
                const [kennels, customers] = await Promise.all([
                  getAvailableKennels(),
                  getActiveCustomersForAutocomplete(),
                ])
                setBuchungsKennels(kennels)
                setBuchungsCustomers(customers)
                setShowBuchungsModal(true)
              }}
            />
          )}
        </div>

        {/* Footer: pipeline transitions + edit button */}
        {!isEditing && (!isNewCustomer || details !== null) && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleTransition(t)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    t.action === 'reaktivieren'
                      ? 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                      : t.action === 'inaktiv'
                      ? 'border border-gray-300 text-gray-500 hover:bg-gray-100'
                      : t.newStatus?.startsWith('absage')
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-gray-900 text-white hover:bg-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setIsEditing(true); setActiveTab('kontaktdaten') }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Bearbeiten
            </button>
          </div>
        )}
      </div>

      {/* Buchungs-Modal (Neue Buchung aus Kundenprofil) */}
      {showBuchungsModal && customerId && fullCustomer && (
        <BuchungsModal
          booking={null}
          isOpen={showBuchungsModal}
          onClose={() => setShowBuchungsModal(false)}
          kennels={buchungsKennels}
          allActiveCustomers={buchungsCustomers}
          prefilledCustomerId={customerId}
          prefilledCustomerName={`${fullCustomer.first_name_1} ${fullCustomer.last_name_1}`}
          onSaved={async () => {
            setShowBuchungsModal(false)
            const bookings = await getCustomerBookings(customerId)
            setCustomerBookings(bookings)
          }}
          onStatusChanged={() => {}}
          onCancelled={() => {}}
        />
      )}

      {/* Reason modal (for Abgesagt) */}
      {pendingTransition && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">{pendingTransition.label}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Begründung *
              </label>
              <textarea
                rows={3}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="Bitte Begründung eingeben…"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmTransition}
                disabled={!reasonText.trim()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Bestätigen
              </button>
              <button
                onClick={() => { setPendingTransition(null); setReasonText('') }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
