# PROJ-3: Buchungsmodul

## Status: ✅ Implementiert

---

## Scope dieser Phase

**Enthalten:** Buchungen anlegen/bearbeiten/stornieren, Buchungsliste mit Filtern + CSV-Export, Buchungsdetail-Modal, Buchungshistorie im Kundenprofil, automatische Preisberechnung, Zwingerkonflikterkennung
**Nicht enthalten:** Automatische Status-Änderungen per Cronjob (Phase 5), Online-Kundenbuchungsportal (Phase 9), Rechnungsstellung (Phase 6)

---

## User Stories

- Als Mitarbeiterin möchte ich eine neue Buchung für einen bestehenden Kunden anlegen, damit der Aufenthalt oder die Betreuung geplant ist.
- Als Mitarbeiterin möchte ich eine Buchung direkt aus dem Kundenprofil heraus erstellen, damit ich nicht zur separaten Buchungsseite wechseln muss.
- Als Mitarbeiterin möchte ich alle Buchungen in einer übersichtlichen Liste sehen und filtern, damit ich den Überblick behalte.
- Als Mitarbeiterin möchte ich, dass der Preis automatisch aus der Preistabelle berechnet wird, damit ich keine Rechenfehler mache.
- Als Mitarbeiterin möchte ich einen Zwinger zuweisen und bei Konflikten gewarnt werden, damit ich Doppelbelegungen erkenne.
- Als Mitarbeiterin möchte ich einen Aufenthalt auf 2–3 Zwinger aufteilen, wenn ein Zwinger nicht durchgängig verfügbar ist.
- Als Mitarbeiterin möchte ich eine Buchung stornieren und dabei Gebühr und Grund erfassen, damit der Audit Trail vollständig ist.
- Als Mitarbeiterin möchte ich die Buchungshistorie eines Kunden direkt im Kundenprofil sehen.
- Als Mitarbeiterin möchte ich die gefilterte Buchungsliste als CSV exportieren, damit ich sie in Excel weiterverarbeiten kann.

---

## Acceptance Criteria

### Buchungsliste (`/buchungen`)

- [ ] Tabelle zeigt: Buchungsnummer/ID (kurz), Kundenname, Hunde, Buchungstyp, Zeitraum, Preis, Status (farbig)
- [ ] Filter: Status (`geplant` / `aktiv` / `abgeschlossen` / `storniert`), Datumsbereich (von–bis auf `start_date`), Freitext-Suche nach Kundenname
- [ ] Aktive Filter als Chips mit × löschbar
- [ ] Button „+ Neue Buchung" oben rechts
- [ ] Klick auf Zeile öffnet Buchungs-Modal
- [ ] CSV-Export Button: exportiert aktuell gefilterte Buchungen mit Buchungsdaten, Kundendaten, Hundedaten und Zwingernummern

### Buchungs-Modal (Anlegen + Bearbeiten)

**Schritt 1 — Grunddaten:**
- [ ] Kunde auswählen (Suchfeld mit Autocomplete — nur aktive Kunden, keine Inaktiven)
- [ ] Buchungstyp wählen: Übernachtung / Tagesbetreuung flexibel / Tagesbetreuung regelmäßig
- [ ] Start- und Enddatum
- [ ] Hunde wählen: Checkboxen aus den Hunden des gewählten Kunden (1–4); Warnung wenn keine Hunde erfasst, Buchung trotzdem möglich
- [ ] Preis: automatisch berechnet (`calculate_booking_price`), manuell überschreibbar

**Schritt 2 — Typ-spezifische Felder:**

| Feld | Übernachtung | Tagesbetreuung flexibel | Tagesbetreuung regelm. |
|------|:---:|:---:|:---:|
| Zwingerzuweisung (1–3 Zwinger) | ✅ | ✅ | ✅ |
| Medikamentengabe (`medication_notes`) | ✅ | ✅ | ✅ |
| Medikamentenplan (`medication_schedule`) | ✅ | — | — |
| Gepäckliste (`items_list`) | ✅ | — | — |
| Frequenz (1×/2× pro Woche) | — | — | ✅ |
| Interne Notizen (`notes`) | ✅ | ✅ | ✅ |

- [ ] **Zwingerzuweisung:** Bis zu 3 Zwinger wählbar (Multi-Select), je Zwinger Verfügbarkeit für den gewählten Zeitraum geprüft; Warnung (kein Blockieren) wenn Konflikt
- [ ] **Tagesbetreuung regelmäßig:** Enddatum entspricht Monatsende; Preis ist Monatspreis (nicht tagesbasiert)
- [ ] Alle Pflichtfelder validiert vor dem Speichern

**Detailansicht (Lesen + Status):**
- [ ] Alle Buchungsfelder in Leseansicht
- [ ] Status-Badge (farbig): geplant=blau, aktiv=grün, abgeschlossen=grau, storniert=rot
- [ ] Status-Buttons (kontextabhängig):
  - `geplant` → [Aktivieren] [Stornieren]
  - `aktiv` → [Abschließen] [Stornieren]
  - `abgeschlossen` → keine weiteren Aktionen
  - `storniert` → keine weiteren Aktionen
- [ ] [Bearbeiten] Button → wechselt in Bearbeitungsansicht (nur für `geplant`-Buchungen)
- [ ] [Stornieren] öffnet Bestätigungs-Dialog mit: Stornierungsgebühr (optional, €), Stornierungsgrund (Freitext, Pflicht)

### Buchungen im Kundenprofil (neuer Reiter)

- [ ] KundenModal erhält dritten Reiter „Buchungen (N)"
- [ ] Hervorgehobene Karte für nächste/aktuelle Buchung (Status `geplant` oder `aktiv`)
- [ ] Chronologische Liste aller weiteren Buchungen (neueste zuerst)
- [ ] Button „+ Neue Buchung" → öffnet Buchungs-Modal mit vorausgefülltem Kunden

### Preisberechnung

- [ ] Übernachtung: `duration_days × Tagespreis(Hundezahl)`
- [ ] Tagesbetreuung flexibel: `duration_days × Tagespreis(Hundezahl)`
- [ ] Tagesbetreuung regelmäßig: `Monatspreis(Hundezahl, Frequenz)` — unabhängig von Dauer
- [ ] Preis-Feld ist vorausgefüllt und manuell überschreibbar
- [ ] Hundezahl = Anzahl der in der Buchung ausgewählten Hunde (1 oder 2; bei 3–4 Hunden = 2er-Preis)

---

## Edge Cases

- **Zwingersplit:** Booking kann bis zu 3 Zwinger gleichzeitig haben. Wenn z. B. Zwinger 5 nur für Tag 1–3 verfügbar, Zwinger 7 für Tag 4–7 → beide zuweisen, Notizfeld erklärt Aufteilung. Kein datumsgenaues Zwinger-Splitting in der DB (booking_kennels hat keine Datumsfelder) — Aufteilung wird in `notes` dokumentiert.
- **Kein Hund erfasst:** Warnung im Formular, Buchung aber speicherbar (z. B. erster Kontakt vor Hundeanmeldung).
- **Buchung bearbeiten:** Nur `geplant`-Buchungen sind voll bearbeitbar. Aktive/abgeschlossene Buchungen → kein Bearbeiten-Button.
- **Stornierungsgebühr:** Optional (kann 0 oder leer bleiben). `cancellation_date` wird automatisch auf today gesetzt.
- **Rücknahme Stornierung:** Nicht möglich — `storniert` ist ein Endzustand.
- **Inaktive Kunden:** Erscheinen nicht in der Kundensuche beim Buchungsanlegen.
- **Tagesbetreuung regelm. Zeitraum:** Start = erster des Monats, Ende = letzter des Monats (oder beliebig — Preis trotzdem Monatspauschale).
- **Hundezahl > 2:** Preismodell hat nur 1-Hund und 2-Hunde-Preise. Bei 3–4 Hunden wird der 2er-Preis genommen (kein Sonderpreis).
- **Zwinger bereits belegt:** Warnung wird angezeigt aber Buchung wird nicht gesperrt — Mitarbeiterin entscheidet.
- **Neuer Kunde ohne Hunde:** Buchung aus Kundenprofil startet mit leerer Hundeauswahl + Warnung.
- **CSV-Export:** Exportiert nur die aktuell angezeigte (gefilterte) Auswahl, nicht alle Buchungen.

---

## Technische Anforderungen

- **URL:** `/buchungen` (Liste), kein URL-State für Modal
- **Datenbank:** Tabellen `bookings`, `booking_dogs`, `booking_kennels` bereits vorhanden. Eine zusätzliche Migration (`20260304040000_booking_frequency.sql`) fügt `frequency frequency_type` zur `bookings`-Tabelle hinzu (notwendig für `tagesbetreuung_regelmaessig`-Preisberechnung)
- **Preisberechnung:** Server Action ruft `calculate_booking_price()` DB-Funktion auf
- **Zwingerverfügbarkeit:** Prüfung via `check_kennel_availability()` DB-Funktion (bereits vorhanden)
- **RLS:** Alle authentifizierten User lesen + schreiben; keine Admin-Einschränkung
- **KundenModal:** Neuer dritter Reiter „Buchungen" — neue Server Action `getCustomerBookings(customerId)`
- **CSV:** Client-seitiger Export (keine Server-Route nötig) via Array → CSV-String → Download-Link

---

## UI-Skizze (Buchungsliste)

```
┌────────────────────────────────────────────────────────────┐
│ Buchungen                            [+ Neue Buchung]  [CSV]│
├───────────────┬──────────┬───────────────┬─────────────────┤
│ 🔍 Kundenname  │ Status ▼ │ Von  [Datum]   │ Bis  [Datum]    │
├───────────────┴──────────┴───────────────┴─────────────────┤
│ Müller, Hans   │ Bello    │ Übernachtung  │ 10.–17.03. │ 340€ │ 🟢 aktiv    │
│ Schmidt, Anna  │ Luna     │ Tagesbetreu.  │ 15.03.     │  45€ │ 🔵 geplant  │
│ Weber, Klaus   │ Rex, Max │ Übernachtung  │ 01.–05.04. │ 520€ │ 🔵 geplant  │
└────────────────────────────────────────────────────────────┘
```

---

## Human-in-the-Loop Checkpoints

- ✅ Buchung anlegen: Beides (Liste + Kundenprofil)
- ✅ Buchungstypen: Alle drei
- ✅ Preis: Automatisch + überschreibbar
- ✅ Buchungsliste: Status + Datum + Kundensuche + CSV-Export
- ✅ Felder Übernachtung: Zwinger, Medikamente, Gepäck, Notizen
- ✅ Stornierung: Status + Gebühr + Grund
- ✅ Zwinger: Warnung (kein Blockieren) + Split auf 2–3 Zwinger
- ✅ Tagesbetreuung regelm.: Eine Buchung pro Monat, Monatspreis
- ✅ Detailansicht: Modal
- ✅ Status-Workflow: Manuell per Buttons
- ✅ Kundenprofil: Statistiken + Neue Buchung + nächste Buchung + Historie
- ✅ CSV: Buchung + Kunde + Hunde + Zwinger
- ✅ Tagesbetreuung: Auch mit Zwinger
- ✅ Hunde: Auswählbar (1–4), Warnung wenn keine vorhanden
