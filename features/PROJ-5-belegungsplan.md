# PROJ-5: Belegungsplan

## Status: Planned
**Created:** 2026-03-04
**Last Updated:** 2026-03-04

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — geschützte Route
- Requires: PROJ-3 (Buchungsmodul) — Buchungsdaten, Zwinger, `booking_kennels`

---

## Scope dieser Phase

**Enthalten:** Visuelles Zwinger-Belegungsraster (2-Wochen-Ansicht), Buchungs-Slots mit Farbkodierung, Drag & Drop zur Zwingerzuweisung, Warnung für unzugewiesene Buchungen, neue Buchung aus dem Plan heraus, Navigation vor/zurück

**Nicht enthalten:** Mobile-Optimierung, Druckansicht, automatische Status-Änderungen per Cronjob

---

## User Stories

- Als Mitarbeiterin möchte ich auf einen Blick sehen, welche Zwinger an welchen Tagen belegt sind, damit ich den Überblick über die Kapazität behalte.
- Als Mitarbeiterin möchte ich Buchungen ohne Zwinger direkt im Belegungsplan per Drag & Drop einem freien Zwinger zuweisen, damit ich nicht ins Buchungs-Modal wechseln muss.
- Als Mitarbeiterin möchte ich auf einen belegten Slot klicken und das Buchungsdetail sehen, damit ich schnell Informationen nachschlagen kann.
- Als Mitarbeiterin möchte ich auf einen freien Slot klicken und direkt eine neue Buchung für diesen Zwinger und Tag anlegen, damit der Workflow schneller ist.
- Als Mitarbeiterin möchte ich sofort sehen, welche Buchungen noch keinen Zwinger zugewiesen haben, damit keine Buchung vergessen wird.
- Als Mitarbeiterin möchte ich im Plan vorwärts und rückwärts navigieren, damit ich zukünftige und vergangene Belegungen prüfen kann.

---

## Acceptance Criteria

### Belegungsraster

- [ ] Route `/belegungsplan` ist vorhanden und zeigt das Raster
- [ ] Raster: Zeilen = Zwinger (alle aktiven, sortiert nach Nummer), Spalten = Tage (14 Tage ab Startdatum)
- [ ] Standardansicht startet mit heute als erstem Tag
- [ ] Spaltenköpfe zeigen Wochentag + Datum (z.B. „Mo 04.03.")
- [ ] Heutiger Tag ist visuell hervorgehoben (z.B. hellblauer Hintergrund der Spalte)
- [ ] Freie Slots sind als leere, klickbare Felder erkennbar (hover-Effekt)

### Buchungs-Slots (belegte Felder)

- [ ] Jede Buchung erscheint als farbiger Block, der sich über alle belegten Tage erstreckt (start_date bis end_date)
- [ ] Farbkodierung nach Buchungstyp:
  - `uebernachtung` → Indigo/Blau
  - `tagesbetreuung_flexibel` → Bernstein/Orange
  - `tagesbetreuung_regelmaessig` → Grün
- [ ] Slot zeigt: Nachname des Kunden + Hundename(n) (bei Platzmangel abgekürzt mit Ellipsis)
- [ ] An-/Abreise-Tag visuell unterscheidbar: linke/rechte Ecken des Blocks leicht abgerundet, mittlere Tage durchgängig
- [ ] Hover über Slot zeigt Tooltip: vollständiger Name, Hunde, Zeitraum, Buchungstyp

### Warnung: Unzugewiesene Buchungen

- [ ] Banner oben im Plan zeigt alle aktiven/geplanten Buchungen ohne Zwingerzuweisung im aktuellen Sichtfenster (± 14 Tage)
- [ ] Banner zeigt: Kundenname, Hund(e), Zeitraum, Buchungstyp als horizontale Karten
- [ ] Karten sind als Drag-Quellen markiert (visuelles Handle)
- [ ] Banner ist ausgeblendet, wenn keine unzugewiesenen Buchungen existieren

### Drag & Drop — Zwingerzuweisung

- [ ] Buchungskarten aus dem Banner können per Drag & Drop auf freie Slots gezogen werden
- [ ] Während des Dragens: belegte Slots sind nicht annehmbar (rot-getönt), freie Slots leuchten grün auf
- [ ] Drop auf freiem Slot: `kennel_id` der Buchung wird gespeichert (Server Action), Banner-Karte verschwindet, Slot erscheint im Raster
- [ ] Drop über mehrere Tage (Buchungszeitraum > 1 Tag): Slot wird korrekt über alle Tage ausgedehnt
- [ ] Bei Konflikt (Slot eigentlich doch belegt durch Race Condition): Fehlermeldung, kein Datenstand korrumpiert, Seite refresht

### Klick auf freien Slot → Neue Buchung

- [ ] Klick auf freien Slot öffnet das Buchungs-Modal (bestehende Komponente aus PROJ-3)
- [ ] Zwingernummer und Startdatum sind im Modal vorausgefüllt
- [ ] Enddatum ist nicht vorausgefüllt (Nutzer wählt es selbst)

### Klick auf belegten Slot → Buchungsdetail

- [ ] Klick auf belegten Slot öffnet das bestehende Buchungsdetail-Modal (aus PROJ-3, read-only Ansicht)
- [ ] Im Modal kann Buchung wie gewohnt bearbeitet werden

### Navigation

- [ ] Buttons „‹ Zurück" und „Weiter ›" verschieben den Sichtbereich um 14 Tage
- [ ] Button „Heute" springt zurück zur Standardansicht (heute = erste Spalte)
- [ ] Aktuell angezeigter Zeitraum ist im Header lesbar (z.B. „04.03.2026 — 17.03.2026")

---

## Edge Cases

- **Buchung ohne Hund:** Slot zeigt nur Kundennamen, keine Hunde-Angabe
- **Mehrere Hunde:** Namen durch Komma getrennt; bei Platzmangel „Bello +2"
- **Buchung über Monatsgrenze:** Slot wird korrekt über die Monatsgrenze dargestellt
- **Gleichzeitig zwei Buchungen im selben Zwinger** (Datenfehler aus Alt-Daten): Beide Slots werden übereinander angezeigt, zweiter wird in auffälliger Farbe (Rot-Rand) markiert als Konflikt
- **Kein aktiver Zwinger:** Leere Tabelle mit Hinweis „Keine aktiven Zwinger vorhanden"
- **Alle Zwinger voll:** Banner mit unzugewiesenen Buchungen bleibt sichtbar, Slots rot für „belegt"
- **Race Condition beim Drop:** Server prüft Verfügbarkeit vor dem Speichern; bei Konflikt → 409-ähnlicher Fehler → Toast-Fehlermeldung, Seite revalidiert
- **Drag auf mobile:** Kein Drag & Drop auf Touch-Geräten (Mobile ist Out-of-Scope); Zwingerzuweisung bleibt über Buchungs-Modal möglich

---

## Technical Notes (für Architecture)

- Client Component für das interaktive Raster (`'use client'`)
- Server Component Wrapper fetcht Buchungsdaten + Kennels via Supabase → gibt als Props weiter
- Drag & Drop: HTML5 native Drag API (kein externe Library nötig für Desktop-only)
- Server Action `assignKennel(bookingId, kennelId)`: prüft Verfügbarkeit, schreibt `booking_kennels`, revalidiert
- Datenabruf: alle Buchungen mit `booking_kennels`, `booking_dogs` für den ±14-Tage-Bereich

---

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
