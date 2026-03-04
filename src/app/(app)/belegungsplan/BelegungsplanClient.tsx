'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingWithDetails, Kennel, CustomerForAutocomplete } from '../buchungen/actions'
import BuchungsModal from '../buchungen/BuchungsModal'
import { assignKennel } from './actions'

type Props = {
  kennels: Kennel[]
  bookings: BookingWithDetails[]
  allActiveCustomers: CustomerForAutocomplete[]
  startDate: string
  endDate: string
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function getDays(startDate: string): string[] {
  return Array.from({ length: 14 }, (_, i) => addDays(startDate, i))
}

function formatDayHeader(dateStr: string): { weekday: string; date: string } {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
    date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
  }
}

function formatDateRange(start: string, end: string): string {
  const fmt = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  return `${fmt(start)} — ${fmt(end)}`
}

// ─── Colors ────────────────────────────────────────────────────────────────────

const SLOT_COLORS: Record<string, string> = {
  uebernachtung: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  tagesbetreuung_flexibel: 'bg-amber-500 hover:bg-amber-600 text-white',
  tagesbetreuung_regelmaessig: 'bg-green-500 hover:bg-green-600 text-white',
}

const BANNER_COLORS: Record<string, string> = {
  uebernachtung: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  tagesbetreuung_flexibel: 'bg-amber-50 border-amber-200 text-amber-800',
  tagesbetreuung_regelmaessig: 'bg-green-50 border-green-200 text-green-800',
}

// ─── Grid computation ──────────────────────────────────────────────────────────

type FreeCell = { type: 'free'; date: string; kennelId: string }
type BookingCell = {
  type: 'booking'
  booking: BookingWithDetails
  span: number
  isStart: boolean
  isEnd: boolean
}
type Cell = FreeCell | BookingCell

function computeKennelCells(kennel: Kennel, bookings: BookingWithDetails[], days: string[]): Cell[] {
  const windowStart = days[0]
  const windowEnd = days[days.length - 1]

  const kennelBookings = bookings
    .filter(b => b.kennels.some(k => k.id === kennel.id))
    .filter(b => b.start_date <= windowEnd && b.end_date >= windowStart)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const cells: Cell[] = []
  let dayIndex = 0

  for (const booking of kennelBookings) {
    const visibleStart = booking.start_date < windowStart ? windowStart : booking.start_date
    const visibleEnd = booking.end_date > windowEnd ? windowEnd : booking.end_date

    const startIdx = days.indexOf(visibleStart)
    const endIdx = days.indexOf(visibleEnd)
    if (startIdx === -1 || endIdx === -1) continue

    while (dayIndex < startIdx) {
      cells.push({ type: 'free', date: days[dayIndex], kennelId: kennel.id })
      dayIndex++
    }

    cells.push({
      type: 'booking',
      booking,
      span: endIdx - startIdx + 1,
      isStart: booking.start_date >= windowStart,
      isEnd: booking.end_date <= windowEnd,
    })
    dayIndex = endIdx + 1
  }

  while (dayIndex < 14) {
    cells.push({ type: 'free', date: days[dayIndex], kennelId: kennel.id })
    dayIndex++
  }

  return cells
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BelegungsplanClient({
  kennels,
  bookings,
  allActiveCustomers,
  startDate,
  endDate,
}: Props) {
  const router = useRouter()
  const days = getDays(startDate)
  const today = new Date().toISOString().split('T')[0]

  // ─── Modal state ────────────────────────────────────────────────────────────
  const [modalBooking, setModalBooking] = useState<BookingWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [prefilledKennelIds, setPrefilledKennelIds] = useState<string[] | undefined>()
  const [prefilledStartDate, setPrefilledStartDate] = useState<string | undefined>()

  // ─── Drag & Drop state ──────────────────────────────────────────────────────
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null)
  const [hoverKennelId, setHoverKennelId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  // ─── Unzugewiesene Buchungen ────────────────────────────────────────────────
  const unassigned = bookings.filter(
    b => b.kennels.length === 0 && b.start_date <= endDate && b.end_date >= startDate
  )

  // ─── Navigation ─────────────────────────────────────────────────────────────
  function navigate(direction: 'prev' | 'next' | 'today') {
    const newFrom =
      direction === 'today' ? today : addDays(startDate, direction === 'next' ? 14 : -14)
    router.push(`/belegungsplan?from=${newFrom}`)
  }

  // ─── Conflict check ─────────────────────────────────────────────────────────
  function isKennelConflicted(kennelId: string, bookingId: string): boolean {
    const dragged = bookings.find(b => b.id === bookingId)
    if (!dragged) return false
    return bookings.some(
      b =>
        b.id !== bookingId &&
        b.kennels.some(k => k.id === kennelId) &&
        b.start_date <= dragged.end_date &&
        b.end_date >= dragged.start_date
    )
  }

  // ─── Drop handler ────────────────────────────────────────────────────────────
  async function handleDrop(kennelId: string, e: React.DragEvent) {
    e.preventDefault()
    const bookingId = e.dataTransfer.getData('bookingId')
    if (!bookingId) return
    setHoverKennelId(null)
    setDraggingBookingId(null)
    setAssignError(null)
    setIsAssigning(true)
    const result = await assignKennel(bookingId, kennelId)
    setIsAssigning(false)
    if (result.error) {
      setAssignError(result.error)
    }
    router.refresh()
  }

  // ─── Open booking detail ──────────────────────────────────────────────────
  function openBookingDetail(booking: BookingWithDetails) {
    setModalBooking(booking)
    setPrefilledKennelIds(undefined)
    setPrefilledStartDate(undefined)
    setIsModalOpen(true)
  }

  // ─── Open new booking from free slot ─────────────────────────────────────
  function openNewBooking(kennelId: string, date: string) {
    setModalBooking(null)
    setPrefilledKennelIds([kennelId])
    setPrefilledStartDate(date)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setModalBooking(null)
    setPrefilledKennelIds(undefined)
    setPrefilledStartDate(undefined)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Belegungsplan</h1>
            <p className="mt-0.5 text-sm text-gray-500">{formatDateRange(startDate, endDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('prev')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ‹ Zurück
            </button>
            <button
              onClick={() => navigate('today')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Heute
            </button>
            <button
              onClick={() => navigate('next')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Weiter ›
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {/* ─── Fehler ─────────────────────────────────────────────────── */}
        {assignError && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <span>⚠ {assignError}</span>
            <button
              onClick={() => setAssignError(null)}
              className="ml-4 text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* ─── Unzugewiesene Buchungen Banner ──────────────────────────── */}
        {unassigned.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Ohne Zwinger ({unassigned.length}) — ziehen um zuzuweisen
            </p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(b => {
                const dogs = b.dogs.map(d => d.name)
                const dogLabel =
                  dogs.length === 0
                    ? ''
                    : dogs.length <= 2
                      ? dogs.join(', ')
                      : `${dogs[0]} +${dogs.length - 1}`
                const color =
                  BANNER_COLORS[b.booking_type] ?? 'bg-gray-50 border-gray-200 text-gray-800'
                const isDragging = draggingBookingId === b.id
                const lastName = b.customer_name.split(' ').slice(-1)[0]
                const dateLabel =
                  b.start_date === b.end_date
                    ? new Date(b.start_date + 'T12:00:00').toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : `${new Date(b.start_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}–${new Date(b.end_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`

                return (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('bookingId', b.id)
                      setDraggingBookingId(b.id)
                    }}
                    onDragEnd={() => {
                      setDraggingBookingId(null)
                      setHoverKennelId(null)
                    }}
                    className={`flex cursor-grab select-none items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-opacity ${color} ${
                      isDragging ? 'opacity-40' : 'opacity-100'
                    }`}
                    title="Ziehen um Zwinger zuzuweisen"
                  >
                    <span className="text-gray-400">⠿</span>
                    <span>{lastName}</span>
                    {dogLabel && <span className="font-normal opacity-70">· {dogLabel}</span>}
                    <span className="font-normal opacity-60">{dateLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Raster ───────────────────────────────────────────────── */}
        {kennels.length === 0 ? (
          <div className="py-16 text-center text-sm italic text-gray-400">
            Keine aktiven Zwinger vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table
              className="w-full border-collapse text-sm"
              style={{ minWidth: `${128 + 14 * 88}px` }}
            >
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 z-10 w-28 border-r border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-500">
                    Zwinger
                  </th>
                  {days.map(day => {
                    const { weekday, date } = formatDayHeader(day)
                    const isToday = day === today
                    return (
                      <th
                        key={day}
                        className={`min-w-[88px] px-1 py-1.5 text-center text-xs font-medium ${
                          isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                        }`}
                      >
                        <div className="font-semibold">{weekday}</div>
                        <div className="font-normal">{date}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {kennels.map((kennel, rowIdx) => {
                  const cells = computeKennelCells(kennel, bookings, days)
                  const isDropTarget = draggingBookingId !== null && hoverKennelId === kennel.id
                  const hasConflict =
                    draggingBookingId !== null &&
                    isKennelConflicted(kennel.id, draggingBookingId)

                  return (
                    <tr
                      key={kennel.id}
                      className={`border-b border-gray-100 last:border-0 transition-colors ${
                        isDropTarget
                          ? hasConflict
                            ? 'bg-red-50'
                            : 'bg-green-50'
                          : rowIdx % 2 === 1
                            ? 'bg-gray-50/40'
                            : ''
                      }`}
                      onDragOver={e => {
                        e.preventDefault()
                        setHoverKennelId(kennel.id)
                      }}
                      onDragLeave={e => {
                        // Only clear if leaving the row entirely (not entering a child)
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setHoverKennelId(null)
                        }
                      }}
                      onDrop={e => handleDrop(kennel.id, e)}
                    >
                      {/* Kennel label */}
                      <td
                        className={`sticky left-0 z-10 border-r border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 whitespace-nowrap ${
                          rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        Zwinger {kennel.number}
                      </td>

                      {cells.map((cell, cellIdx) => {
                        if (cell.type === 'booking') {
                          const b = cell.booking
                          const dogs = b.dogs.map(d => d.name)
                          const dogLabel =
                            dogs.length === 0
                              ? null
                              : dogs.length <= 2
                                ? dogs.join(', ')
                                : `${dogs[0]} +${dogs.length - 1}`
                          const lastName = b.customer_name.split(' ').slice(-1)[0]
                          const color =
                            SLOT_COLORS[b.booking_type] ?? 'bg-gray-400 text-white hover:bg-gray-500'
                          const roundingClass = cell.isStart && cell.isEnd
                            ? 'rounded'
                            : cell.isStart
                              ? 'rounded-l rounded-r-none'
                              : cell.isEnd
                                ? 'rounded-r rounded-l-none'
                                : 'rounded-none'

                          return (
                            <td key={cellIdx} colSpan={cell.span} className="p-0.5 align-top">
                              <button
                                onClick={() => openBookingDetail(b)}
                                title={`${b.customer_name}${dogs.length > 0 ? ' · ' + dogs.join(', ') : ''} · ${b.start_date} – ${b.end_date}`}
                                className={`h-11 w-full px-2 text-left transition-colors ${color} ${roundingClass}`}
                              >
                                <div className="truncate text-xs font-semibold leading-tight">
                                  {lastName}
                                </div>
                                {dogLabel && (
                                  <div className="truncate text-xs font-normal opacity-80 leading-tight">
                                    {dogLabel}
                                  </div>
                                )}
                              </button>
                            </td>
                          )
                        }

                        // Free cell
                        const isToday = cell.date === today
                        return (
                          <td
                            key={cellIdx}
                            className={`p-0.5 align-top ${isToday ? 'bg-blue-50/60' : ''}`}
                          >
                            <button
                              onClick={() => openNewBooking(cell.kennelId, cell.date)}
                              className="h-11 w-full rounded border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-colors"
                              aria-label={`Neue Buchung für Zwinger ${kennel.number} ab ${cell.date}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Legende ─────────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500" />
            Übernachtung
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
            Tagesbetreuung (flexibel)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
            Tagesbetreuung (regelmäßig)
          </span>
        </div>
      </div>

      {/* ─── Zuweisen-Overlay ──────────────────────────────────────────── */}
      {isAssigning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white px-6 py-4 shadow-xl text-sm text-gray-700">
            Zwinger wird zugewiesen…
          </div>
        </div>
      )}

      {/* ─── Buchungs-Modal ────────────────────────────────────────────── */}
      <BuchungsModal
        booking={modalBooking}
        isOpen={isModalOpen}
        onClose={closeModal}
        kennels={kennels}
        allActiveCustomers={allActiveCustomers}
        prefilledKennelIds={prefilledKennelIds}
        prefilledStartDate={prefilledStartDate}
        onSaved={() => {
          closeModal()
          router.refresh()
        }}
        onStatusChanged={() => {
          closeModal()
          router.refresh()
        }}
        onCancelled={() => {
          closeModal()
          router.refresh()
        }}
      />
    </div>
  )
}
