'use client'

import { useActionState, useState, useEffect } from 'react'
import { createCustomer, updateCustomer, type FullCustomer, type ActionState } from './actions'

type Props = {
  customer?: FullCustomer
  onSuccess: (customerId?: string) => void
  onCancel: () => void
}

const initialState: ActionState = { error: null, success: null }

export default function KundenFormular({ customer, onSuccess, onCancel }: Props) {
  const isEdit = !!customer

  const action = isEdit
    ? updateCustomer.bind(null, customer.id)
    : createCustomer

  const [state, formAction, isPending] = useActionState(action, initialState)
  const [showPerson2, setShowPerson2] = useState(
    !!(customer?.first_name_2 || customer?.last_name_2)
  )
  const [showSecondContact, setShowSecondContact] = useState(
    !!(customer?.second_email || customer?.second_mobile_phone)
  )
  const [hasGoogleReview, setHasGoogleReview] = useState(
    customer?.has_google_review ?? false
  )

  // Notify parent on success
  useEffect(() => {
    if (state.success && !isPending) {
      onSuccess(state.customerId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, isPending])

  const inputClass = 'w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
  const textareaClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const sectionClass = 'border-t border-gray-100 pt-4 mt-4'

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          {state.error}
        </div>
      )}

      {/* ── Person 1 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Anrede *</label>
          <select name="salutation" required defaultValue={customer?.salutation ?? ''} className={inputClass}>
            <option value="" disabled>—</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
            <option value="Divers">Divers</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Vorname *</label>
          <input name="first_name_1" type="text" required defaultValue={customer?.first_name_1 ?? ''} className={inputClass} placeholder="Max" />
        </div>
        <div>
          <label className={labelClass}>Nachname *</label>
          <input name="last_name_1" type="text" required defaultValue={customer?.last_name_1 ?? ''} className={inputClass} placeholder="Mustermann" />
        </div>
      </div>

      {/* ── Person 2 ─────────────────────────────────────────── */}
      {!showPerson2 ? (
        <button type="button" onClick={() => setShowPerson2(true)} className="text-sm text-gray-500 hover:text-gray-700 underline">
          + Person 2 hinzufügen
        </button>
      ) : (
        <div className="border-l-2 border-gray-100 pl-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Person 2</span>
            {!customer?.first_name_2 && (
              <button type="button" onClick={() => setShowPerson2(false)} className="text-xs text-gray-400 hover:text-gray-600">Entfernen</button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Anrede</label>
              <select name="salutation_2" defaultValue={customer?.salutation_2 ?? ''} className={inputClass}>
                <option value="">—</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Vorname</label>
              <input name="first_name_2" type="text" defaultValue={customer?.first_name_2 ?? ''} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input name="last_name_2" type="text" defaultValue={customer?.last_name_2 ?? ''} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ── Adresse ──────────────────────────────────────────── */}
      <div className={sectionClass}>
        <div className="mb-3">
          <label className={labelClass}>Straße & Hausnummer *</label>
          <input name="street" type="text" required defaultValue={customer?.street ?? ''} className={inputClass} placeholder="Musterstraße 1" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>PLZ *</label>
            <input name="zip" type="text" required defaultValue={customer?.zip ?? ''} className={inputClass} placeholder="31311" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Ort *</label>
            <input name="city" type="text" required defaultValue={customer?.city ?? ''} className={inputClass} placeholder="Uetze" />
          </div>
        </div>
      </div>

      {/* ── Kontakt ───────────────────────────────────────────── */}
      <div className={sectionClass}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Mobilnummer *</label>
            <input name="mobile_phone" type="tel" required defaultValue={customer?.mobile_phone ?? ''} className={inputClass} placeholder="+49 172 1234567" />
          </div>
          <div>
            <label className={labelClass}>Festnetz</label>
            <input name="phone" type="tel" defaultValue={customer?.phone ?? ''} className={inputClass} placeholder="Optional" />
          </div>
        </div>
        <div className="mb-3">
          <label className={labelClass}>E-Mail *</label>
          <input name="email" type="email" required defaultValue={customer?.email ?? ''} className={inputClass} placeholder="max@beispiel.de" />
        </div>

        {!showSecondContact ? (
          <button type="button" onClick={() => setShowSecondContact(true)} className="text-sm text-gray-500 hover:text-gray-700 underline">
            + Zweite Kontaktdaten hinzufügen
          </button>
        ) : (
          <div className="border-l-2 border-gray-100 pl-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zweite Kontaktdaten</span>
              {!customer?.second_email && !customer?.second_mobile_phone && (
                <button type="button" onClick={() => setShowSecondContact(false)} className="text-xs text-gray-400 hover:text-gray-600">Entfernen</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Zweite Mobilnummer</label>
                <input name="second_mobile_phone" type="tel" defaultValue={customer?.second_mobile_phone ?? ''} className={inputClass} placeholder="+49 163 9876543" />
              </div>
              <div>
                <label className={labelClass}>Zweite E-Mail</label>
                <input name="second_email" type="email" defaultValue={customer?.second_email ?? ''} className={inputClass} placeholder="weitere@beispiel.de" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sonstiges ─────────────────────────────────────────── */}
      <div className={sectionClass}>
        <div className="mb-3">
          <label className={labelClass}>Wie haben Sie von uns erfahren?</label>
          <input name="referral_source" type="text" defaultValue={customer?.referral_source ?? ''} className={inputClass} placeholder="Empfehlung, Google, Instagram…" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            name="newsletter_consent"
            type="checkbox"
            id="newsletter_consent"
            defaultChecked={customer?.newsletter_consent ?? false}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          <label htmlFor="newsletter_consent" className="text-sm text-gray-700">Newsletter-Einwilligung erteilt</label>
        </div>
        <div>
          <label className={labelClass}>Notizen</label>
          <textarea name="notes" rows={2} defaultValue={customer?.notes ?? ''} className={textareaClass} placeholder="Interne Notizen…" />
        </div>
      </div>

      {/* ── Google Bewertung ──────────────────────────────────── */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-3">
          <input
            name="has_google_review"
            type="checkbox"
            id="has_google_review"
            checked={hasGoogleReview}
            onChange={(e) => setHasGoogleReview(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          <label htmlFor="has_google_review" className="text-sm font-medium text-gray-700">Hat eine Google-Bewertung hinterlassen</label>
        </div>

        {hasGoogleReview && (
          <div className="border-l-2 border-yellow-200 pl-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Datum der Bewertung</label>
                <input name="google_review_date" type="date" defaultValue={customer?.google_review_date ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sterne (1–5)</label>
                <select name="google_review_stars" defaultValue={customer?.google_review_stars ?? ''} className={inputClass}>
                  <option value="">—</option>
                  <option value="5">★★★★★ (5)</option>
                  <option value="4">★★★★☆ (4)</option>
                  <option value="3">★★★☆☆ (3)</option>
                  <option value="2">★★☆☆☆ (2)</option>
                  <option value="1">★☆☆☆☆ (1)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Bewertungstext</label>
              <textarea name="google_review_text" rows={2} defaultValue={customer?.google_review_text ?? ''} className={textareaClass} placeholder="Was hat der Kunde geschrieben?" />
            </div>
            <div>
              <label className={labelClass}>Link zur Bewertung</label>
              <input name="google_review_link" type="url" defaultValue={customer?.google_review_link ?? ''} className={inputClass} placeholder="https://maps.google.com/…" />
            </div>
          </div>
        )}
      </div>

      {/* ── Buttons ───────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Speichern…' : isEdit ? 'Änderungen speichern' : 'Kunde anlegen & Hunde erfassen →'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
