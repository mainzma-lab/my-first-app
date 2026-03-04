'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import StatusBadge from './StatusBadge'
import KundenModal from './KundenModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomerOverview = Record<string, any>

type Props = {
  customers: CustomerOverview[]
  inactivityThreshold: number
}

function isInactive(customer: CustomerOverview, threshold: number): boolean {
  if (customer.is_manually_inactive) return true
  if (customer.status !== 'neukunde_gewonnen') return false
  if (!customer.last_stay_date) return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - threshold)
  return new Date(customer.last_stay_date) < cutoff
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle Status' },
  { value: 'im_prozess', label: 'Interessent' },
  { value: 'probebesuch', label: 'Probebesuch' },
  { value: 'neukunde_gewonnen', label: 'Stammkunde' },
  { value: 'absage_kunde', label: 'Abgesagt (Kunde)' },
  { value: 'absage_gudrun', label: 'Abgesagt (Betrieb)' },
]

const INAKTIV_OPTIONS = [
  { value: 'all', label: 'Aktiv & Inaktiv' },
  { value: 'nur_aktiv', label: 'Nur Aktive' },
  { value: 'nur_inaktiv', label: 'Nur Inaktive' },
]

export default function KundenListe({ customers, inactivityThreshold }: Props) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inaktivFilter, setInaktivFilter] = useState('all')
  const [plzFilter, setPlzFilter] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOverview | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [, startTransition] = useTransition()

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value)
    const timer = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(timer)
  }, [])

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const inactive = isInactive(c, inactivityThreshold)

      if (inaktivFilter === 'nur_aktiv' && inactive) return false
      if (inaktivFilter === 'nur_inaktiv' && !inactive) return false

      if (statusFilter !== 'all' && c.status !== statusFilter) return false

      if (plzFilter && !c.zip?.startsWith(plzFilter)) return false

      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const matches =
          c.first_name_1?.toLowerCase().includes(q) ||
          c.last_name_1?.toLowerCase().includes(q) ||
          c.first_name_2?.toLowerCase().includes(q) ||
          c.last_name_2?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.mobile_phone?.includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [customers, debouncedSearch, statusFilter, inaktivFilter, plzFilter, inactivityThreshold])

  function openCustomer(customer: CustomerOverview) {
    startTransition(() => {
      setSelectedCustomer(customer)
      setIsNewCustomer(false)
      setIsModalOpen(true)
    })
  }

  function openNewCustomer() {
    setSelectedCustomer(null)
    setIsNewCustomer(true)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setSelectedCustomer(null)
    setIsNewCustomer(false)
  }

  const hasActiveFilters = statusFilter !== 'all' || inaktivFilter !== 'all' || plzFilter !== ''

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
          <p className="mt-1 text-sm text-gray-500">{customers.length} Kunden gesamt</p>
        </div>
        <button
          onClick={openNewCustomer}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Kunde anlegen
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Suche nach Name, E-Mail, Telefon…"
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={inaktivFilter}
          onChange={(e) => setInaktivFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          {INAKTIV_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="PLZ"
          value={plzFilter}
          onChange={(e) => setPlzFilter(e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setStatusFilter('all'); setInaktivFilter('all'); setPlzFilter('') }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Filter zurücksetzen ×
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
              Status: {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              <button onClick={() => setStatusFilter('all')} className="text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
          {inaktivFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
              {INAKTIV_OPTIONS.find(o => o.value === inaktivFilter)?.label}
              <button onClick={() => setInaktivFilter('all')} className="text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
          {plzFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
              PLZ: {plzFilter}
              <button onClick={() => setPlzFilter('')} className="text-gray-400 hover:text-gray-600">×</button>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hunde</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Erstellt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  {customers.length === 0
                    ? 'Noch keine Kunden vorhanden. Legen Sie den ersten Kunden an.'
                    : 'Keine Kunden entsprechen den Filterkriterien.'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const inactive = isInactive(customer, inactivityThreshold)
                return (
                  <tr
                    key={customer.id}
                    onClick={() => openCustomer(customer)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${inactive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {customer.last_name_1}, {customer.first_name_1}
                        {customer.last_name_2 && (
                          <span className="ml-1 text-gray-400 text-xs">
                            + {customer.first_name_2} {customer.last_name_2}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.mobile_phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={customer.status} isInactive={inactive} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.dog_count ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredCustomers.length > 0 && (
        <p className="mt-2 text-xs text-gray-400 text-right">
          {filteredCustomers.length} von {customers.length} Kunden
        </p>
      )}

      <KundenModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        isNewCustomer={isNewCustomer}
        onClose={closeModal}
        inactivityThreshold={inactivityThreshold}
      />
    </>
  )
}
