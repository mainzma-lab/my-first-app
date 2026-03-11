'use client'

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingWithDetails, Kennel, CustomerForAutocomplete } from '../buchungen/actions'
import { assignKennel, moveBooking, resizeBooking } from './actions'
import BuchungsModal from '../buchungen/BuchungsModal'

// ─── Layout constants ─────────────────────────────────────────────────────────
const KENNEL_COL_W = 120  // px – sticky left column
const DAY_COL_W    = 80   // px – each day column
const TOTAL_DAYS   = 90   // today-14 … today+75

// ─── Booking type config ──────────────────────────────────────────────────────
const BOOKING_TYPES = [
  { value: 'uebernachtung',               label: 'Übernachtung',       bg: '#c7d2fe', text: '#3730a3', dot: '#818cf8' },
  { value: 'tagesbetreuung_flexibel',     label: 'Tagesbetr. (flex.)', bg: '#fde68a', text: '#92400e', dot: '#fbbf24' },
  { value: 'tagesbetreuung_regelmaessig', label: 'Tagesbetr. (reg.)',  bg: '#a7f3d0', text: '#065f46', dot: '#34d399' },
] as const

type FilterType = 'all' | typeof BOOKING_TYPES[number]['value']

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

// ─── Drag operation types ──────────────────────────────────────────────────────
type DragOp =
  | { kind: 'unassigned'; bookingId: string }
  | { kind: 'move'; bookingId: string; dayOffset: number; oldKennelId: string }
  | { kind: 'resize-start'; bookingId: string; kennelId: string }
  | { kind: 'resize-end'; bookingId: string; kennelId: string }

// ─── Niedersachsen: gesetzliche Feiertage ─────────────────────────────────────
const FEIERTAGE_NDS = new Set([
  // 2025
  '2025-01-01', // Neujahr
  '2025-04-18', // Karfreitag
  '2025-04-21', // Ostermontag
  '2025-05-01', // Tag der Arbeit
  '2025-05-29', // Christi Himmelfahrt
  '2025-06-09', // Pfingstmontag
  '2025-10-03', // Tag der Deutschen Einheit
  '2025-10-31', // Reformationstag
  '2025-12-25', // 1. Weihnachtstag
  '2025-12-26', // 2. Weihnachtstag
  // 2026
  '2026-01-01', // Neujahr
  '2026-04-03', // Karfreitag
  '2026-04-06', // Ostermontag
  '2026-05-01', // Tag der Arbeit
  '2026-05-14', // Christi Himmelfahrt
  '2026-05-25', // Pfingstmontag
  '2026-10-03', // Tag der Deutschen Einheit
  '2026-10-31', // Reformationstag
  '2026-12-25', // 1. Weihnachtstag
  '2026-12-26', // 2. Weihnachtstag
])

// ─── Niedersachsen: Schulferien (Start/Ende inklusiv) ─────────────────────────
const SCHULFERIEN_NDS: [string, string][] = [
  ['2025-04-07', '2025-04-22'], // Osterferien 2025
  ['2025-05-30', '2025-05-30'], // Brückentag Christi Himmelfahrt 2025
  ['2025-07-03', '2025-08-13'], // Sommerferien 2025
  ['2025-10-13', '2025-10-25'], // Herbstferien 2025
  ['2025-12-22', '2026-01-05'], // Weihnachtsferien 2025/26
  ['2026-02-02', '2026-02-03'], // Halbjahresferien 2026
  ['2026-03-23', '2026-04-07'], // Osterferien 2026
  ['2026-05-15', '2026-05-15'], // Brückentag Christi Himmelfahrt 2026
  ['2026-05-26', '2026-05-26'], // Pfingstferien 2026
  ['2026-07-02', '2026-08-12'], // Sommerferien 2026
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function msFromIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
function isoFromMs(ms: number): string {
  return new Date(ms).toISOString().split('T')[0]
}
function dayInfo(iso: string) {
  const ms     = msFromIso(iso)
  const utcDay = new Date(ms).getUTCDay()
  const [, month, day] = iso.split('-').map(Number)
  return {
    weekday: WEEKDAYS[utcDay],
    day,
    month: String(month).padStart(2, '0'),
    isWeekend: utcDay === 0 || utcDay === 6,
  }
}
function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`
}
function formatDateFull(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}
function isSchulferienTag(iso: string): boolean {
  const ms = msFromIso(iso)
  return SCHULFERIEN_NDS.some(([s, e]) => ms >= msFromIso(s) && ms <= msFromIso(e))
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  kennels: Kennel[]
  bookings: BookingWithDetails[]
  allActiveCustomers: CustomerForAutocomplete[]
  startDate: string  // YYYY-MM-DD (always today – 14 days)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BelegungsplanClient({ kennels, bookings, allActiveCustomers, startDate }: Props) {
  const router          = useRouter()
  const containerRef    = useRef<HTMLDivElement>(null)  // overflow-x-auto body scroll container
  const headerScrollRef = useRef<HTMLDivElement>(null)  // sticky date header (overflow-x hidden)
  const toolbarRef      = useRef<HTMLDivElement>(null)  // sticky toolbar
  const [toolbarH, setToolbarH] = useState(0)

  // ── State ──────────────────────────────────────────────────────────────────
  const [filterType, setFilterType]               = useState<FilterType>('all')
  const [search, setSearch]                       = useState('')
  const [isOverview, setIsOverview]               = useState(false)
  const [modalBooking, setModalBooking]           = useState<BookingWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen]             = useState(false)
  const [prefilledKennelIds, setPrefilledKennelIds] = useState<string[]>([])
  const [prefilledStartDate, setPrefilledStartDate] = useState<string | undefined>()
  const [dragOp, setDragOp] = useState<DragOp | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)

  // ── Day list ───────────────────────────────────────────────────────────────
  const days = useMemo<string[]>(() => {
    const startMs = msFromIso(startDate)
    return Array.from({ length: TOTAL_DAYS }, (_, i) => isoFromMs(startMs + i * 86_400_000))
  }, [startDate])

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const todayIdx = useMemo(() => days.indexOf(todayStr), [days, todayStr])

  // ── Colgroup: shared by both header and body tables for aligned column widths ─
  const colgroup = useMemo(() => (
    <colgroup>
      <col style={{ width: KENNEL_COL_W }} />
      {days.map(d => <col key={d} style={{ width: DAY_COL_W }} />)}
    </colgroup>
  ), [days])

  // ── Measure toolbar height so sticky header sits flush below toolbar ────────
  useLayoutEffect(() => {
    if (toolbarRef.current) setToolbarH(toolbarRef.current.getBoundingClientRect().height)
  }, [])

  // ── Scroll to today ────────────────────────────────────────────────────────
  const scrollToToday = useCallback(() => {
    const c = containerRef.current
    if (!c || todayIdx === -1) return
    const newScrollLeft = Math.max(0, KENNEL_COL_W + todayIdx * DAY_COL_W + DAY_COL_W / 2 - c.clientWidth / 2)
    c.scrollLeft = newScrollLeft
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = newScrollLeft
  }, [todayIdx])

  useEffect(() => {
    requestAnimationFrame(scrollToToday)
  }, [scrollToToday])

  // ── Sync header scroll with body scroll (user-initiated scroll) ────────────
  const onBodyScroll = useCallback(() => {
    if (headerScrollRef.current && containerRef.current) {
      headerScrollRef.current.scrollLeft = containerRef.current.scrollLeft
    }
  }, [])

  // ── Filtered bookings ──────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => bookings.filter(b => {
    if (filterType !== 'all' && b.booking_type !== filterType) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!b.customer_name.toLowerCase().includes(q) &&
          !b.dogs.some(d => d.name.toLowerCase().includes(q))) return false
    }
    return true
  }), [bookings, filterType, search])

  // ── Grid map: kennelId → dateStr → booking | 'cont' ───────────────────────
  // First visible day of a booking (even if it started before our window) = booking reference
  const gridMap = useMemo(() => {
    const map: Record<string, Record<string, BookingWithDetails | 'cont'>> = {}
    for (const k of kennels) map[k.id] = {}

    for (const b of filteredBookings) {
      for (const k of b.kennels) {
        if (!map[k.id]) continue
        const startMs = msFromIso(b.start_date)
        const endMs   = msFromIso(b.end_date)
        let first = true
        for (let i = 0; i < days.length; i++) {
          const dayMs = msFromIso(days[i])
          if (dayMs >= startMs && dayMs <= endMs) {
            map[k.id][days[i]] = first ? b : 'cont'
            first = false
          }
        }
      }
    }
    return map
  }, [kennels, filteredBookings, days])

  // ── Conflict detection: kennelId → Set of bookingIds with overlapping entries ─
  const conflictBookingIds = useMemo(() => {
    const visited: Record<string, Record<string, string>> = {}
    const conflicts: Record<string, Set<string>> = {}
    for (const k of kennels) { visited[k.id] = {}; conflicts[k.id] = new Set() }

    for (const b of filteredBookings) {
      for (const k of b.kennels) {
        if (!visited[k.id]) continue
        const startMs = msFromIso(b.start_date)
        const endMs   = msFromIso(b.end_date)
        for (let i = 0; i < days.length; i++) {
          const day   = days[i]
          const dayMs = msFromIso(day)
          if (dayMs >= startMs && dayMs <= endMs) {
            const existing = visited[k.id][day]
            if (existing && existing !== b.id) {
              conflicts[k.id].add(b.id)
              conflicts[k.id].add(existing)
            } else {
              visited[k.id][day] = b.id
            }
          }
        }
      }
    }
    return conflicts
  }, [kennels, filteredBookings, days])

  const unassigned = useMemo(
    () => filteredBookings.filter(b => b.kennels.length === 0),
    [filteredBookings]
  )

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openBooking(b: BookingWithDetails) {
    setModalBooking(b); setPrefilledKennelIds([]); setPrefilledStartDate(undefined); setIsModalOpen(true)
  }
  function openNewBooking(kennelId: string, date: string) {
    setModalBooking(null); setPrefilledKennelIds([kennelId]); setPrefilledStartDate(date); setIsModalOpen(true)
  }
  function closeModal() { setIsModalOpen(false); setModalBooking(null) }

  function getDropDate(e: React.DragEvent): string {
    const scrollLeft = containerRef.current?.scrollLeft ?? 0
    const containerLeft = containerRef.current?.getBoundingClientRect().left ?? 0
    const dayIndex = Math.max(0, Math.min(
      Math.floor((e.clientX - containerLeft - KENNEL_COL_W + scrollLeft) / DAY_COL_W),
      days.length - 1
    ))
    return days[dayIndex]
  }

  async function handleDrop(e: React.DragEvent, targetKennelId: string) {
    e.preventDefault()
    const kind = e.dataTransfer.getData('dragKind')
    const bookingId = e.dataTransfer.getData('bookingId')
    if (!bookingId) return

    let result: { error: string | null }

    if (kind === 'unassigned') {
      result = await assignKennel(bookingId, targetKennelId)
    } else if (kind === 'move') {
      const dayOffset = parseInt(e.dataTransfer.getData('dayOffset') || '0')
      const oldKennelId = e.dataTransfer.getData('oldKennelId')
      const targetDate = getDropDate(e)
      const newStartDate = isoFromMs(msFromIso(targetDate) - dayOffset * 86_400_000)
      result = await moveBooking(bookingId, oldKennelId, targetKennelId, newStartDate)
    } else if (kind === 'resize-start') {
      const currentEnd = e.dataTransfer.getData('currentEnd')
      result = await resizeBooking(bookingId, getDropDate(e), currentEnd)
    } else if (kind === 'resize-end') {
      const currentStart = e.dataTransfer.getData('currentStart')
      result = await resizeBooking(bookingId, currentStart, getDropDate(e))
    } else {
      return
    }

    if (result.error) setDropError(result.error)
    router.refresh()
  }

  // ── Cell hover: direct DOM (avoids Tailwind group-hover Turbopack issues) ──
  function onCellEnter(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    el.style.backgroundColor = '#d1fae5'
    el.style.borderColor     = '#6ee7b7'
    const icon = el.querySelector<HTMLElement>('.ci')
    if (icon) icon.style.opacity = '1'
  }
  function onCellLeave(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    el.style.backgroundColor = ''
    el.style.borderColor     = 'transparent'
    const icon = el.querySelector<HTMLElement>('.ci')
    if (icon) icon.style.opacity = '0'
  }

  const TABLE_W = KENNEL_COL_W + days.length * DAY_COL_W

  // ─── Render ────────────────────────────────────────────────────────────────
  //
  // Why sticky works here:
  //   main (overflow-y-auto, overflow-x-hidden) = vertical scroll container
  //   ├── Toolbar div  sticky top-0 z-30  → sticks in main's vertical scroll
  //   └── Grid div  overflow-x-auto       → horizontal scroll container
  //       └── table
  //           ├── thead  sticky top=toolbarH  (sticks in main, below toolbar)
  //           └── tbody
  //               └── td.kennel-col  sticky left=0  (sticks in overflow-x-auto)
  //
  // overflow-x-hidden on main prevents main from getting a horizontal scrollbar
  // when the 7200px table causes horizontal overflow — so the toolbar never
  // moves sideways.
  return (
    <>
      {/* ── Toolbar — sticky at top of main's scroll viewport ──────────── */}
      <div ref={toolbarRef} className="sticky top-0 z-30 bg-white border-b border-gray-200">
        {/* Title + booking type filter legend */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Belegungsplan</h1>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateFull(days[0])} – {formatDateFull(days[days.length - 1])}</p>
          </div>
          <div className="flex items-center gap-1">
            {BOOKING_TYPES.map(({ value, label, dot }) => {
              const active = filterType === value
              return (
                <button
                  key={value}
                  onClick={() => setFilterType(active ? 'all' : value)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                    active
                      ? 'border-gray-400 bg-gray-100 text-gray-800'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: dot }} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        {/* Search + Heute */}
        <div className="px-6 pb-3 flex items-center gap-3">
          <input
            type="search"
            placeholder="Kunde oder Hund suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-56"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-sm text-gray-500 hover:text-gray-700">
              Zurücksetzen
            </button>
          )}
          <button
            onClick={() => todayIdx !== -1 ? scrollToToday() : router.push('/belegungsplan')}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Heute
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">ab</span>
            <input
              type="date"
              value={startDate}
              onChange={e => { if (e.target.value) router.push('/belegungsplan?from=' + e.target.value) }}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={() => setIsOverview(v => !v)}
            className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${
              isOverview
                ? 'border-gray-400 bg-gray-100 text-gray-800'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Überblick
          </button>
        </div>
      </div>

      {/* ── Unassigned bookings banner ────────────────────────────────────── */}
      {unassigned.length > 0 && (
        <div className="mx-6 mt-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            {unassigned.length} Buchung{unassigned.length !== 1 ? 'en' : ''} ohne Zwinger
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(b => (
              <div
                key={b.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('dragKind', 'unassigned')
                  e.dataTransfer.setData('bookingId', b.id)
                  e.dataTransfer.effectAllowed = 'move'
                  setDragOp({ kind: 'unassigned', bookingId: b.id })
                }}
                onDragEnd={() => setDragOp(null)}
                onClick={() => openBooking(b)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openBooking(b) }}
                className="rounded bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-1 text-xs text-amber-900 transition-colors cursor-grab active:cursor-grabbing select-none"
              >
                {b.customer_name} · {b.dogs.map(d => d.name).join(', ')} · {b.start_date}
              </div>
            ))}
          </div>
        </div>
      )}

      {dropError && (
        <div className="mx-6 mt-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-800">{dropError}</p>
          <button onClick={() => setDropError(null)} className="ml-4 text-red-500 hover:text-red-700 text-sm">✕</button>
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────────────── */}
      {/*                                                                        */}
      {/* Two-div approach: sticky header + scrollable body, scrollLeft synced.  */}
      {/* Avoids the CSS limitation where overflow-x:auto intercepts sticky top  */}
      {/* on <thead>, making it impossible to stick below the toolbar.            */}
      <div className="bg-gray-50">

        {/* ── Sticky date header (overflow-x hidden, scroll synced from body) ── */}
        <div
          ref={headerScrollRef}
          className="sticky z-20 overflow-x-hidden bg-white border-b border-gray-200 shadow-sm"
          style={{ top: toolbarH }}
        >
          <table className="border-collapse text-xs" style={{ width: TABLE_W }}>
            {colgroup}
            <thead>
              <tr>
                <th
                  className="border-r border-gray-200 bg-gray-50 text-left"
                  style={{ width: KENNEL_COL_W, position: 'sticky', left: 0, zIndex: 10 }}
                >
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Zwinger
                  </div>
                </th>
                {days.map((d, i) => {
                  const { weekday, day, month, isWeekend } = dayInfo(d)
                  const isToday     = i === todayIdx
                  const isFeiertag  = !isWeekend && FEIERTAGE_NDS.has(d)
                  const isSchulfrei = !isWeekend && !isFeiertag && isSchulferienTag(d)
                  const thBg =
                    isToday     ? '#fb923c' :
                    isFeiertag  ? '#1B5E20' :
                    isSchulfrei ? '#68B300' :
                    isWeekend   ? '#f3f4f6' : '#ffffff'
                  const textWhite = isToday || isFeiertag || isSchulfrei
                  return (
                    <th
                      key={d}
                      style={{ width: DAY_COL_W, backgroundColor: thBg }}
                      className="border-r border-gray-200 text-center"
                    >
                      <div className={isOverview ? 'py-0.5' : 'py-1.5'}>
                        <div className={`font-bold leading-none ${isOverview ? 'text-[9px]' : 'text-sm'} ${
                          textWhite ? 'text-white' : 'text-gray-800'
                        }`}>
                          {String(day).padStart(2, '0')}.{month}.
                        </div>
                        {!isOverview && (
                          <div className={`text-[10px] leading-none mt-0.5 ${
                            textWhite ? 'text-white' : isWeekend ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {weekday}
                          </div>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
          </table>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div ref={containerRef} onScroll={onBodyScroll} className="overflow-x-auto pb-4">
          <div className="bg-white shadow-sm" style={{ width: TABLE_W }}>
            <table className="border-collapse text-xs" style={{ width: TABLE_W }}>
              {colgroup}
              <tbody>
                {kennels.length === 0 ? (
                  <tr>
                    <td colSpan={days.length + 1} className="py-12 text-center text-sm text-gray-400">
                      Keine aktiven Zwinger vorhanden
                    </td>
                  </tr>
                ) : kennels.map(kennel => {
                  const cells: React.ReactNode[] = []
                  let i = 0

                  while (i < days.length) {
                    const day     = days[i]
                    const cell    = gridMap[kennel.id]?.[day]
                    const isToday = i === todayIdx

                    const isWeekend   = dayInfo(day).isWeekend
                    const isFeiertag  = !isWeekend && FEIERTAGE_NDS.has(day)
                    const isSchulfrei = !isWeekend && !isFeiertag && isSchulferienTag(day)

                    if (!cell) {
                      const kId = kennel.id
                      const dt  = day
                      const isResizeThisRow = dragOp !== null &&
                        (dragOp.kind === 'resize-start' || dragOp.kind === 'resize-end') &&
                        (dragOp as { kennelId: string }).kennelId === kennel.id
                      const isValidDropTarget = dragOp !== null && (
                        dragOp.kind === 'unassigned' ||
                        dragOp.kind === 'move' ||
                        isResizeThisRow
                      )
                      const cellBg = isValidDropTarget
                        ? '#d1fae5'
                        : isToday     ? 'rgb(255 237 213)' :
                          isFeiertag  ? '#e8f5e9' :
                          isSchulfrei ? '#f1f8e9' :
                          isWeekend   ? 'rgb(243 244 246)' : undefined
                      cells.push(
                        <td
                          key={day}
                          className="border-r border-b border-gray-100 p-0.5"
                          style={{ width: DAY_COL_W, backgroundColor: cellBg }}
                          onDragOver={(e) => { if (isValidDropTarget) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                          onDrop={(e) => { if (isValidDropTarget) handleDrop(e, kId) }}
                        >
                          <button
                            onClick={() => openNewBooking(kId, dt)}
                            onMouseEnter={onCellEnter}
                            onMouseLeave={onCellLeave}
                            className={`w-full ${isOverview ? 'h-5' : 'h-10'} rounded flex items-center justify-center`}
                            style={{ border: '1px solid transparent', transition: 'background-color 0.1s' }}
                          >
                            {!isOverview && (
                              <span
                                className="ci select-none text-gray-400 text-base leading-none"
                                style={{ opacity: 0, pointerEvents: 'none', transition: 'opacity 0.1s' }}
                              >
                                +
                              </span>
                            )}
                          </button>
                        </td>
                      )
                      i++

                    } else if (cell === 'cont') {
                      i++

                    } else {
                      const booking = cell
                      const endMs   = msFromIso(booking.end_date)
                      let colSpan   = 1
                      for (let j = i + 1; j < days.length; j++) {
                        if (msFromIso(days[j]) <= endMs) colSpan++
                        else break
                      }

                      const typeConfig   = BOOKING_TYPES.find(t => t.value === booking.booking_type)
                      const bg           = typeConfig?.bg   ?? '#e5e7eb'
                      const textColor    = typeConfig?.text ?? '#374151'
                      const bookedCellBg =
                        isToday     ? 'rgb(255 237 213)' :
                        isFeiertag  ? '#e8f5e9' :
                        isSchulfrei ? '#f1f8e9' :
                        isWeekend   ? 'rgb(243 244 246)' : undefined

                      const isResizeThisRow2 = dragOp !== null &&
                        (dragOp.kind === 'resize-start' || dragOp.kind === 'resize-end') &&
                        (dragOp as { kennelId: string }).kennelId === kennel.id
                      const startInWindow = days.includes(booking.start_date)
                      const endInWindow   = days.includes(booking.end_date)
                      const hasConflict   = conflictBookingIds[kennel.id]?.has(booking.id) ?? false

                      cells.push(
                        <td
                          key={day}
                          colSpan={colSpan}
                          className="border-r border-b border-gray-100 p-0.5"
                          style={{ backgroundColor: bookedCellBg }}
                          onDragOver={(e) => { if (isResizeThisRow2) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                          onDrop={(e) => { if (isResizeThisRow2) handleDrop(e, kennel.id) }}
                        >
                          <div
                            draggable
                            onDragStart={(e) => {
                              const scrollLeft = containerRef.current?.scrollLeft ?? 0
                              const containerLeft = containerRef.current?.getBoundingClientRect().left ?? 0
                              const mouseX = e.clientX - containerLeft + scrollLeft - KENNEL_COL_W
                              const hoverIdx = Math.max(0, Math.floor(mouseX / DAY_COL_W))
                              const startIdx = days.findIndex(d => d === booking.start_date)
                              const dayOffset = Math.max(0, hoverIdx - (startIdx >= 0 ? startIdx : 0))
                              e.dataTransfer.setData('dragKind', 'move')
                              e.dataTransfer.setData('bookingId', booking.id)
                              e.dataTransfer.setData('dayOffset', String(dayOffset))
                              e.dataTransfer.setData('oldKennelId', kennel.id)
                              e.dataTransfer.effectAllowed = 'move'
                              setDragOp({ kind: 'move', bookingId: booking.id, dayOffset, oldKennelId: kennel.id })
                            }}
                            onDragEnd={() => setDragOp(null)}
                            onClick={() => openBooking(booking)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openBooking(booking) }}
                            className={`w-full rounded text-left overflow-hidden select-none cursor-grab active:cursor-grabbing hover:opacity-75 transition-opacity ${
                              isOverview
                                ? 'h-5 px-1 flex items-center'
                                : 'h-12 flex flex-col justify-center relative'
                            } ${hasConflict ? 'ring-2 ring-red-500 ring-inset' : ''}`}
                            style={{ backgroundColor: bg, color: textColor }}
                            title={`${booking.customer_name} · ${booking.dogs.map(d => d.name).join(', ')} · ${booking.start_date} – ${booking.end_date}`}
                          >
                            {/* Left resize handle */}
                            {!isOverview && startInWindow && (
                              <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l"
                                style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation()
                                  e.dataTransfer.setData('dragKind', 'resize-start')
                                  e.dataTransfer.setData('bookingId', booking.id)
                                  e.dataTransfer.setData('currentEnd', booking.end_date)
                                  e.dataTransfer.effectAllowed = 'move'
                                  setDragOp({ kind: 'resize-start', bookingId: booking.id, kennelId: kennel.id })
                                }}
                                onDragEnd={() => setDragOp(null)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}

                            {/* Content */}
                            <div className={isOverview ? 'w-full' : 'px-3 w-full'}>
                              {isOverview ? (
                                <span className="block truncate text-[9px] font-semibold leading-none w-full">
                                  {booking.customer_name.split(' ').at(-1)}
                                </span>
                              ) : (
                                <>
                                  <span className="block truncate text-xs font-semibold leading-tight">
                                    {booking.customer_name.split(' ').at(-1)}
                                  </span>
                                  <span className="block truncate text-[10px] opacity-70 leading-tight">
                                    {booking.dogs.map(d => d.name).join(', ')}
                                  </span>
                                  <span className="block truncate text-[10px] opacity-55 leading-tight">
                                    {formatDate(booking.start_date)}–{formatDate(booking.end_date)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Right resize handle */}
                            {!isOverview && endInWindow && (
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r"
                                style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation()
                                  e.dataTransfer.setData('dragKind', 'resize-end')
                                  e.dataTransfer.setData('bookingId', booking.id)
                                  e.dataTransfer.setData('currentStart', booking.start_date)
                                  e.dataTransfer.effectAllowed = 'move'
                                  setDragOp({ kind: 'resize-end', bookingId: booking.id, kennelId: kennel.id })
                                }}
                                onDragEnd={() => setDragOp(null)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </td>
                      )
                      i += colSpan
                    }
                  }

                  return (
                    <tr key={kennel.id} className="bg-white">
                      <td
                        className="border-r border-b border-gray-200 bg-white"
                        style={{ position: 'sticky', left: 0, zIndex: 5 }}
                      >
                        <div className={`px-3 ${isOverview ? 'py-1' : 'py-2'} flex items-center gap-1.5`}>
                          <span className="font-semibold text-gray-700 text-sm">{kennel.number}</span>
                          {kennel.size && (
                            <span className="text-[10px] text-gray-400 uppercase">{kennel.size}</span>
                          )}
                          {kennel.has_heating && (
                            <span className="text-orange-400 text-[10px]" title="Beheizt">♨</span>
                          )}
                        </div>
                      </td>
                      {cells}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Booking modal ──────────────────────────────────────────────────── */}
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
    </>
  )
}
