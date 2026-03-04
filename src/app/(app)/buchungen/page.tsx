import { getBookings, getAvailableKennels, getActiveCustomersForAutocomplete } from './actions'
import BuchungsListe from './BuchungsListe'

export default async function BuchungenPage() {
  const [bookings, kennels, customers] = await Promise.all([
    getBookings(),
    getAvailableKennels(),
    getActiveCustomersForAutocomplete(),
  ])

  return <BuchungsListe initialBookings={bookings} kennels={kennels} allActiveCustomers={customers} />
}
