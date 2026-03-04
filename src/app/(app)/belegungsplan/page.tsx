import { getBelegungsplanData } from './actions'
import { getActiveCustomersForAutocomplete } from '../buchungen/actions'
import BelegungsplanClient from './BelegungsplanClient'

function addDaysUTC(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0]
}

// Always load a 90-day window: today-14 to today+75
export default async function BelegungsplanPage() {
  const todayUTC = new Date().toISOString().split('T')[0]
  const startDate = addDaysUTC(todayUTC, -14)
  const endDate = addDaysUTC(todayUTC, 75)

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
