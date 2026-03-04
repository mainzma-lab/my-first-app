type Props = {
  status: string
  isInactive?: boolean
  size?: 'sm' | 'xs'
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  im_prozess:         { label: 'Interessent',        className: 'bg-blue-100 text-blue-700' },
  probebesuch:        { label: 'Probebesuch',        className: 'bg-yellow-100 text-yellow-700' },
  neukunde_gewonnen:  { label: 'Stammkunde',         className: 'bg-green-100 text-green-700' },
  absage_kunde:       { label: 'Abgesagt (Kunde)',   className: 'bg-red-100 text-red-700' },
  absage_gudrun:      { label: 'Abgesagt (Betrieb)', className: 'bg-red-100 text-red-700' },
  tel_nicht_erreicht: { label: 'Nicht erreicht',     className: 'bg-gray-100 text-gray-600' },
  buchung_bestaetigt: { label: 'Buchung bestätigt',  className: 'bg-teal-100 text-teal-700' },
  termin_geaendert:   { label: 'Termin geändert',    className: 'bg-orange-100 text-orange-700' },
  storniert:          { label: 'Storniert',          className: 'bg-gray-100 text-gray-500' },
}

export default function StatusBadge({ status, isInactive = false, size = 'sm' }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
        {config.label}
      </span>
      {isInactive && (
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-500">
          Inaktiv
        </span>
      )}
    </span>
  )
}
