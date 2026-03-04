type Props = {
  status: string
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  geplant: { label: 'Geplant', className: 'bg-blue-100 text-blue-800' },
  aktiv: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
  abgeschlossen: { label: 'Abgeschlossen', className: 'bg-gray-100 text-gray-700' },
  storniert: { label: 'Storniert', className: 'bg-red-100 text-red-700' },
}

export default function BuchungsStatusBadge({ status }: Props) {
  const entry = STATUS_MAP[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${entry.className}`}>
      {entry.label}
    </span>
  )
}
