import { getBelegungsplanData } from './actions'
import { getActiveCustomersForAutocomplete } from '../buchungen/actions'
import BelegungsplanClient from './BelegungsplanClient'

function addDaysUTC(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0]
}

function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export default async function BelegungsplanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const params = await searchParams
  const todayUTC = new Date().toISOString().split('T')[0]
  const startDate = params.from && isValidDateStr(params.from) ? params.from : addDaysUTC(todayUTC, -14)
  const endDate = addDaysUTC(startDate, 89)

  const [{ kennels, bookings }, allActiveCustomers] = await Promise.all([
    getBelegungsplanData(startDate, endDate),
    getActiveCustomersForAutocomplete(),
  ])

  return (
    <BelegungsplanClient
      kennels={kennels}
      bookings={bookings}
      allActiveCustomers={allActiveCustomers}
      startDate={startDate}
    />
  )
}
