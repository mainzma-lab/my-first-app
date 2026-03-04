import { getBelegungsplanData } from './actions'
import { getActiveCustomersForAutocomplete } from '../buchungen/actions'
import BelegungsplanClient from './BelegungsplanClient'

type Props = {
  searchParams: Promise<{ from?: string }>
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default async function BelegungsplanPage({ searchParams }: Props) {
  const params = await searchParams
  const startDate = params.from ?? new Date().toISOString().split('T')[0]
  const endDate = addDays(startDate, 13)

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
      endDate={endDate}
    />
  )
}
