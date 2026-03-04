'use client'

import { useActionState, useState, useEffect } from 'react'
import { createDog, updateDog, deleteDog, type Dog } from './actions'

type Props = {
  dogs: Dog[]
  customerId: string
  onRefresh: () => void
}

const initialState = { error: null, success: null }

function computeAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years === 0) return `${months} Monat${months !== 1 ? 'e' : ''}`
  if (months === 0) return `${years} Jahr${years !== 1 ? 'e' : ''}`
  return `${years} J., ${months} M.`
}

function HundFormular({
  customerId,
  dog,
  onSuccess,
  onCancel,
}: {
  customerId: string
  dog?: Dog
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!dog
  const action = isEdit
    ? updateDog.bind(null, dog.id)
    : createDog.bind(null, customerId)

  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success && !isPending) {
      onSuccess()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, isPending])

  const inputClass = 'w-full h-9 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
  const textareaClass = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-0.5'

  return (
    <form action={formAction} className="bg-gray-50 rounded-md p-3 space-y-3 border border-gray-200">
      <p className="text-sm font-medium text-gray-700">{isEdit ? 'Hund bearbeiten' : 'Neuer Hund'}</p>
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Name *</label>
          <input name="name" type="text" required defaultValue={dog?.name ?? ''} className={inputClass} placeholder="Bello" />
        </div>
        <div>
          <label className={labelClass}>Rasse *</label>
          <input name="breed" type="text" required defaultValue={dog?.breed ?? ''} className={inputClass} placeholder="Labrador" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Geburtsdatum *</label>
          <input name="birth_date" type="date" required defaultValue={dog?.birth_date ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Geschlecht *</label>
          <select name="gender" required defaultValue={dog?.gender ?? ''} className={inputClass}>
            <option value="" disabled>—</option>
            <option value="maennlich">Männlich</option>
            <option value="weiblich">Weiblich</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Kastriert *</label>
          <select name="is_neutered" required defaultValue={dog ? String(dog.is_neutered) : ''} className={inputClass}>
            <option value="" disabled>—</option>
            <option value="true">Ja</option>
            <option value="false">Nein</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Verhaltenshinweise</label>
        <textarea
          name="behavioral_notes"
          rows={2}
          defaultValue={dog?.behavioral_notes ?? ''}
          className={textareaClass}
          placeholder="Besonderheiten, Erkrankungen…"
        />
      </div>
      <div>
        <label className={labelClass}>Verträglichkeit</label>
        <textarea
          name="compatibility_notes"
          rows={2}
          defaultValue={dog?.compatibility_notes ?? ''}
          className={textareaClass}
          placeholder="Verträglichkeit mit anderen Hunden…"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Speichern…' : isEdit ? 'Speichern' : 'Hund hinzufügen'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

export default function HundeSection({ dogs, customerId, onRefresh }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDogId, setEditingDogId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(dog: Dog) {
    if (!confirm(`${dog.name} wirklich löschen?`)) return
    const result = await deleteDog(dog.id)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      setDeleteError(null)
      onRefresh()
    }
  }

  const canAddDog = dogs.length < 4

  return (
    <div className="space-y-3">
      {deleteError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
          {deleteError}
        </div>
      )}

      {dogs.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400 italic">Noch keine Hunde erfasst.</p>
      )}

      {dogs.map((dog) => (
        <div key={dog.id}>
          {editingDogId === dog.id ? (
            <HundFormular
              customerId={customerId}
              dog={dog}
              onSuccess={() => { setEditingDogId(null); onRefresh() }}
              onCancel={() => setEditingDogId(null)}
            />
          ) : (
            <div className="flex items-start justify-between rounded-md border border-gray-200 bg-white p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-gray-900">
                  {dog.name}
                  <span className="ml-2 text-xs text-gray-400">{dog.breed}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {dog.gender === 'maennlich' ? 'Männlich' : 'Weiblich'}
                  {' · '}
                  {dog.is_neutered ? 'Kastriert' : 'Nicht kastriert'}
                  {' · '}
                  {computeAge(dog.birth_date)} alt
                </p>
                {dog.behavioral_notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                    ⚠ {dog.behavioral_notes}
                  </p>
                )}
                {dog.compatibility_notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{dog.compatibility_notes}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0 ml-3">
                <button
                  onClick={() => setEditingDogId(dog.id)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(dog)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Löschen
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAddForm ? (
        <HundFormular
          customerId={customerId}
          onSuccess={() => { setShowAddForm(false); onRefresh() }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => { if (canAddDog) setShowAddForm(true) }}
          disabled={!canAddDog}
          title={!canAddDog ? 'Maximum von 4 Hunden pro Kunde erreicht' : undefined}
          className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full"
        >
          + Hund hinzufügen {dogs.length > 0 && `(${dogs.length}/4)`}
        </button>
      )}
    </div>
  )
}
