'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingWithDetails, Kennel, CustomerForAutocomplete } from '../buchungen/actions'
import BuchungsModal from '../buchungen/BuchungsModal'
import { assignKennel } from './actions'

const TOTAL_DAYS = 90
const TODAY_OFFSET = 14 // days before today that the window starts

type Props = {
  kennels: Kennel[]
  bookings: BookingWithDetails[]
  allActiveCustomers: CustomerForAutocomplete[]
  startDate: string // = today - TODAY_OFFSET, server-computed
}

// ─── Date utilities (all UTC-safe, DST-proof) ──────────────────────────────────

function addDaysUTC(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0]
}

function getDays(startDate: string): string[] {
  return Array.from({ length: TOTAL_DAYS }, (_, i) => addDaysUTC(startDate, i))
}

/** Local today (not UTC) — correct for the user's timezone */
function getLocalToday(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDayHeader(dateStr: string): { weekday: string; date: string } {
  const d = new Date(dateStr + 'T00:00:00Z')
  return {
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short', timeZone: 'UTC' }),
    date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
  }
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

  while (dayIndex < TOTAL_DAYS) {
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
}: Props) {
  const router = useRouter()
  const days = getDays(startDate)
  const today = getLocalToday()
  const todayIdx = days.indexOf(today)

  // ─── Refs for scroll-to-today ───────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const todayThRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (containerRef.current && todayThRef.current) {
      const container = containerRef.current
      const col = todayThRef.current
      // Scroll so today is visible ~2 columns from the left edge
      const scrollLeft = col.offsetLeft - 128 - 2 * 88
      container.scrollLeft = Math.max(0, scrollLeft)
    }
  }, [])

  function scrollToToday() {
    if (containerRef.current && todayThRef.current) {
      const container = containerRef.current
      const col = todayThRef.current
      const scrollLeft = col.offsetLeft - 128 - 2 * 88
      container.scrollLeft = Math.max(0, scrollLeft)
    }
  }

  // ─── Modal state ─────────────────────────────────────────────────────────────
  const [modalBooking, setModalBooking] = useState<BookingWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [prefilledKennelIds, setPrefilledKennelIds] = useState<string[] | undefined>()
  const [prefilledStartDate, setPrefilledStartDate] = useState<string | undefined>()

  // ─── Drag & Drop state ───────────────────────────────────────────────────────
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null)
  const [hoverKennelId, setHoverKennelId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  // ─── Unzugewiesene Buchungen ─────────────────────────────────────────────────
  const windowEnd = days[days.length - 1]
  const unassigned = bookings.filter(
    b => b.kennels.length === 0 && b.start_date <= windowEnd && b.end_date >= startDate
  )

  // ─── Conflict check ──────────────────────────────────────────────────────────
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
    if (result.error) setAssignError(result.error)
    router.refresh()
  }

  // ─── Modal helpers ───────────────────────────────────────────────────────────
  function openBookingDetail(booking: BookingWithDetails) {
    setModalBooking(booking)
    setPrefilledKennelIds(undefined)
    setPrefilledStartDate(undefined)
    setIsModalOpen(true)
  }

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
      <div className="px-8 py-4 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Belegungsplan</h1>
        <div className="flex items-center gap-3">
          {todayIdx !== -1 && (
            <button
              onClick={scrollToToday}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Heute
            </button>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500" />
              Übernachtung
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
              Tagesbetreuung (flex.)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
              Tagesbetreuung (regelm.)
            </span>
          </div>
        </div>
      </div>

      {/* ─── Error banner ────────────────────────────────────────────── */}
      {assignError && (
        <div className="mx-8 mt-3 shrink-0 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>⚠ {assignError}</span>
          <button onClick={() => setAssignError(null)} className="ml-4 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* ─── Unzugewiesene Buchungen Banner ──────────────────────────── */}
      {unassigned.length > 0 && (
        <div className="px-8 pt-4 pb-2 shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Ohne Zwinger ({unassigned.length}) — ziehen um zuzuweisen
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(b => {
              const dogs = b.dogs.map(d => d.name)
              const dogLabel =
                dogs.length === 0 ? '' : dogs.length <= 2 ? dogs.join(', ') : `${dogs[0]} +${dogs.length - 1}`
              const color = BANNER_COLORS[b.booking_type] ?? 'bg-gray-50 border-gray-200 text-gray-800'
              const isDragging = draggingBookingId === b.id
              const lastName = b.customer_name.split(' ').slice(-1)[0]
              const fmtDate = (s: string) =>
                new Date(s + 'T00:00:00Z').toLocaleDateString('de-DE', {
                  day: '2-digit', month: '2-digit', timeZone: 'UTC',
                })
              const dateLabel =
                b.start_date === b.end_date
                  ? fmtDate(b.start_date)
                  : `${fmtDate(b.start_date)}–${fmtDate(b.end_date)}`

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
                  className={`flex cursor-grab select-none items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-opacity ${color} ${isDragging ? 'opacity-40' : ''}`}
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

      {/* ─── Scrollable Raster ───────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 overflow-auto px-8 py-4">
        {kennels.length === 0 ? (
          <div className="py-16 text-center text-sm italic text-gray-400">
            Keine aktiven Zwinger vorhanden.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white inline-block min-w-full">
            <table className="border-collapse text-sm" style={{ width: `${128 + TOTAL_DAYS * 88}px` }}>

              {/* ─── colgroup for today column highlight ───────────────── */}
              <colgroup>
                <col style={{ width: '128px' }} />
                {days.map((day, i) => (
                  <col
                    key={day}
                    style={{
                      width: '88px',
                      backgroundColor: i === todayIdx ? 'rgb(239 246 255)' : undefined,
                    }}
                  />
                ))}
              </colgroup>

              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-500">
                    Zwinger
                  </th>
                  {days.map((day, i) => {
                    const { weekday, date } = formatDayHeader(day)
                    const isToday = i === todayIdx
                    return (
                      <th
                        key={day}
                        ref={isToday ? todayThRef : undefined}
                        className={`px-1 py-1.5 text-center text-xs font-medium ${
                          isToday ? 'text-blue-700 font-semibold' : 'text-gray-500'
                        }`}
                      >
                        <div>{weekday}</div>
                        <div className={isToday ? 'font-bold' : 'font-normal'}>{date}</div>
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
                    draggingBookingId !== null && isKennelConflicted(kennel.id, draggingBookingId)

                  return (
                    <tr
                      key={kennel.id}
                      className={`border-b border-gray-100 last:border-0 transition-colors ${
                        isDropTarget ? (hasConflict ? 'bg-red-50' : 'bg-green-50') : ''
                      }`}
                      onDragOver={e => { e.preventDefault(); setHoverKennelId(kennel.id) }}
                      onDragLeave={e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setHoverKennelId(null)
                        }
                      }}
                      onDrop={e => handleDrop(kennel.id, e)}
                    >
                      {/* Kennel label — sticky */}
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
                          const color = SLOT_COLORS[b.booking_type] ?? 'bg-gray-400 text-white hover:bg-gray-500'
                          const roundingClass =
                            cell.isStart && cell.isEnd ? 'rounded' :
                            cell.isStart ? 'rounded-l rounded-r-none' :
                            cell.isEnd ? 'rounded-r rounded-l-none' : 'rounded-none'

                          return (
                            <td key={cellIdx} colSpan={cell.span} className="p-0.5 align-top">
                              <button
                                onClick={() => openBookingDetail(b)}
                                title={`${b.customer_name}${dogs.length > 0 ? ' · ' + dogs.join(', ') : ''} · ${b.start_date} – ${b.end_date}`}
                                className={`h-11 w-full px-2 text-left transition-colors ${color} ${roundingClass}`}
                              >
                                <div className="truncate text-xs font-semibold leading-tight">{lastName}</div>
                                {dogLabel && (
                                  <div className="truncate text-xs font-normal opacity-80 leading-tight">{dogLabel}</div>
                                )}
                              </button>
                            </td>
                          )
                        }

                        // Free cell — drop target + click to new booking
                        return (
                          <td key={cellIdx} className="p-0.5 align-top">
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
      </div>

      {/* ─── Zuweisen-Overlay ────────────────────────────────────────── */}
      {isAssigning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white px-6 py-4 shadow-xl text-sm text-gray-700">
            Zwinger wird zugewiesen…
          </div>
        </div>
      )}

      {/* ─── Buchungs-Modal ──────────────────────────────────────────── */}
      <BuchungsModal
        booking={modalBooking}
        isOpen={isModalOpen}
        onClose={closeModal}
        kennels={kennels}
        allActiveCustomers={allActiveCustomers}
        prefilledKennelIds={prefilledKennelIds}
        prefilledStartDate={prefilledStartDate}
        onSaved={() => { closeModal(); router.refresh() }}
        onStatusChanged={() => { closeModal(); router.refresh() }}
        onCancelled={() => { closeModal(); router.refresh() }}
      />
    </div>
  )
}
