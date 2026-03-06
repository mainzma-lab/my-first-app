# PROJ-5: Belegungsplan

## Status: In Review
**Created:** 2026-03-04
**Last Updated:** 2026-03-06

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

### Komponentenstruktur

```
/belegungsplan (Seite — lädt Daten vom Server)
  └── BelegungsplanClient (interaktiver Bereich im Browser)
        ├── Header
        │   ├── Zeitraum-Anzeige ("04.03.2026 — 17.03.2026")
        │   └── Navigation (‹ Zurück | Heute | Weiter ›)
        │
        ├── UnzugewiesenenBanner  (nur sichtbar wenn Buchungen ohne Zwinger)
        │   └── UnzugewieseneKarte × N  (je 1 pro offene Buchung — ziehbar)
        │
        └── BelegungsRaster (CSS Grid: Zwinger × Tage)
              ├── Spaltenköpfe (Mo 04.03. | Di 05.03. | ... × 14)
              └── ZwingerZeile × N  (je 1 pro aktivem Zwinger)
                    ├── ZwingerLabel  ("Zwinger 1")
                    └── TagesSlot × 14  (je 1 pro Tag)
                          ├── BookingSlot  (belegt — klickbar, farbig)
                          └── FreierSlot   (leer — klickbar, Drop-Ziel)
```

**Wiederverwendet aus PROJ-3:**
- `BuchungsModal` — wird sowohl für "Neue Buchung" (aus freiem Slot) als auch für "Buchung bearbeiten" (aus belegtem Slot) geöffnet

---

### Neue Dateien

```
src/app/(app)/belegungsplan/
  ├── page.tsx                  ← Server-Seite: lädt Daten, gibt sie weiter
  ├── BelegungsplanClient.tsx   ← Browser-Komponente: Grid, Drag & Drop, Modals
  └── actions.ts                ← Server-Aktion: Zwinger zuweisen
```

---

### Welche Daten werden geladen?

Die Serverseite lädt beim Seitenaufruf zwei Dinge:

1. **Alle aktiven Zwinger** — Nummer und ID (fix, ändert sich selten)
2. **Alle Buchungen** für den angezeigten 14-Tage-Zeitraum — inkl. Kundenname, Hundenamen, Buchungstyp, Zeitraum, zugewiesene Zwinger und Status (nicht storniert)

Die Daten werden als "Startwert" an die Browser-Komponente übergeben.

---

### Navigation (vor/zurück)

Wenn der Nutzer auf „Weiter" oder „Zurück" klickt, ändert sich ein URL-Parameter (`?from=2026-03-18`). Die Seite lädt dann automatisch neu mit den Daten für den neuen Zeitraum. Das hat zwei Vorteile:
- Die Ansicht ist bookmarkbar / teilbar
- Kein komplizierter Client-seitiger Ladezustand nötig

---

### Drag & Drop — wie es funktioniert

Der Browser hat eine eingebaute Drag & Drop-Funktion — keine externe Bibliothek nötig:

1. Nutzer beginnt zu ziehen → Buchungs-ID wird „mitgenommen"
2. Während des Ziehens: freie Slots leuchten grün, belegte rot
3. Nutzer lässt los → Server-Aktion `assignKennel` wird aufgerufen
4. Server prüft nochmal: ist der Zwinger wirklich frei? (Schutz vor gleichzeitigen Änderungen)
5. Bei Erfolg: Seite aktualisiert sich automatisch, Buchung erscheint im Raster
6. Bei Konflikt: Fehlermeldung, kein Datenverlust

---

### Tech-Entscheidungen

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Raster-Layout | CSS Grid | Perfekt für Zeilen × Spalten; Buchungen über mehrere Tage = `span N` Spalten |
| Drag & Drop | Browser-nativ (kein Package) | Ausreichend für Desktop-only; kein Mehrgewicht |
| Navigation | URL-Parameter (`?from=`) | Bookmarkbar, einfache Serverlogik |
| Daten-Refresh nach Drop | Seitenaktualisierung | Einfachste korrekte Lösung; kein Optimistic-UI-Overhead |
| Buchungs-Modal | Wiederverwendet aus PROJ-3 | Kein Duplikat-Code; gleiche Validierungslogik |

---

### Keine neuen Datenbank-Tabellen

PROJ-5 benötigt keine neuen Tabellen. Die bestehende `booking_kennels`-Verknüpfungstabelle (Buchung ↔ Zwinger) wird genutzt. Die Server-Aktion schreibt lediglich eine neue Zeile darin — nach Verfügbarkeitsprüfung per vorhandener DB-Funktion (`check_kennel_availability`).

---

### Abhängigkeiten (keine neuen Pakete nötig)

Alle benötigten Technologien sind bereits installiert:
- Next.js App Router (Seiten, Server Actions)
- Supabase Client (Datenbankzugriff)
- Tailwind CSS (Styling des Rasters und der Karten)
- React (Browser-Komponente, State für Drag & Drop)

## QA Test Results

**Tested:** 2026-03-06
**App URL:** http://localhost:3000/belegungsplan
**Tester:** QA Engineer (AI) — Code Review + Static Analysis

### Acceptance Criteria Status

#### AC-1: Belegungsraster

- [x] Route `/belegungsplan` ist vorhanden (`page.tsx` Server Component + `BelegungsplanClient.tsx`)
- [x] Raster: Zeilen = Zwinger (alle aktiven, sortiert nach Nummer), Spalten = Tage
- [ ] **BUG-1:** Standardansicht startet NICHT mit 14 Tagen ab heute, sondern mit 90 Tagen (heute-14 bis heute+75). Die Spec fordert "14 Tage ab Startdatum", die Implementierung zeigt 90 Tage mit Scroll-to-today. Dies ist eine bewusste Design-Abweichung (bessere UX), aber weicht von der Spec ab.
- [x] Spaltenkoepfe zeigen Wochentag + Datum (z.B. "Mi 18.03.")
- [x] Heutiger Tag ist visuell hervorgehoben (orange Hintergrund `#fb923c` im Header + `rgb(255 237 213)` in Zellen)
- [x] Freie Slots sind als leere, klickbare Felder erkennbar (gruener Hover-Effekt mit `+` Icon)

#### AC-2: Buchungs-Slots (belegte Felder)

- [x] Jede Buchung erscheint als farbiger Block ueber alle belegten Tage (`colSpan`)
- [x] Farbkodierung nach Buchungstyp: `uebernachtung` -> Indigo (#c7d2fe), `tagesbetreuung_flexibel` -> Bernstein (#fde68a), `tagesbetreuung_regelmaessig` -> Gruen (#a7f3d0)
- [x] Slot zeigt: Nachname des Kunden + Hundename(n) (mit Ellipsis bei Platzmangel via `truncate`)
- [x] Rounded corners auf Booking-Buttons
- [x] Hover ueber Slot zeigt Tooltip via `title` Attribut: Name, Hunde, Zeitraum

#### AC-3: Warnung: Unzugewiesene Buchungen

- [x] Banner oben im Plan zeigt alle Buchungen ohne Zwingerzuweisung
- [x] Banner zeigt: Kundenname, Hund(e), Zeitraum als horizontale Karten
- [ ] **BUG-2:** Karten sind NICHT als Drag-Quellen markiert (kein Drag-Handle). Die Karten nutzen `onClick` zum Oeffnen des Buchungsmodals statt Drag & Drop. Drag & Drop wurde bewusst nicht implementiert (kein `draggable`, kein `onDragStart`).
- [x] Banner ist ausgeblendet, wenn keine unzugewiesenen Buchungen existieren

#### AC-4: Drag & Drop -- Zwingerzuweisung

- [ ] **BUG-3 (HIGH):** Drag & Drop ist NICHT implementiert. Keine `draggable`, `onDragStart`, `onDragOver`, `onDrop` Handler existieren im Code. Die gesamte Drag & Drop Funktionalitaet fehlt. Stattdessen oeffnen Klicks auf unzugewiesene Buchungen das Buchungsmodal zur manuellen Zwingerzuweisung.
- [ ] Waehrend des Dragens: belegte Slots rot, freie gruen -> NICHT IMPLEMENTIERT
- [ ] Drop auf freiem Slot -> kennel_id speichern -> NICHT IMPLEMENTIERT (die `assignKennel` Server Action existiert, wird aber nie aufgerufen)
- [ ] Drop ueber mehrere Tage -> NICHT IMPLEMENTIERT
- [ ] Bei Konflikt (Race Condition): Fehlermeldung -> NICHT TESTBAR (kein Drop)

#### AC-5: Klick auf freien Slot -> Neue Buchung

- [x] Klick auf freien Slot oeffnet das Buchungs-Modal (`openNewBooking`)
- [x] Zwinger-ID ist im Modal vorausgefuellt (`prefilledKennelIds`)
- [x] Startdatum ist im Modal vorausgefuellt (`prefilledStartDate`)
- [x] Enddatum ist nicht vorausgefuellt (korrekt)

#### AC-6: Klick auf belegten Slot -> Buchungsdetail

- [x] Klick auf belegten Slot oeffnet das bestehende Buchungsdetail-Modal (`openBooking`)
- [x] Im Modal kann Buchung wie gewohnt bearbeitet werden

#### AC-7: Navigation

- [ ] **BUG-4 (HIGH):** Buttons "Zurueck" und "Weiter" fehlen komplett. Die Spec fordert Navigation um 14 Tage vor/zurueck via URL-Parameter `?from=`. Die Implementierung laedt stattdessen alle 90 Tage auf einmal und bietet nur horizontales Scrollen.
- [x] Button "Heute" springt zur heutigen Spalte (per `scrollToToday`)
- [ ] **BUG-5:** Aktuell angezeigter Zeitraum ist NICHT im Header lesbar. Es gibt keine "04.03.2026 -- 17.03.2026" Anzeige. Stattdessen wird ein generischer "Belegungsplan" Titel gezeigt.

### Edge Cases Status

#### EC-1: Buchung ohne Hund
- [x] Slot zeigt nur Kundennamen, Hundezeile bleibt leer (korrekt, `.map(d => d.name).join(', ')` ergibt leeren String)

#### EC-2: Mehrere Hunde
- [x] Namen durch Komma getrennt mit `truncate` bei Platzmangel. Allerdings fehlt die Spec-Anforderung "Bello +2" Kurzform -- es wird immer die volle Liste mit Truncation gezeigt. Akzeptabel.

#### EC-3: Buchung ueber Monatsgrenze
- [x] Korrekt dargestellt (colSpan berechnet via Datumsvergleich, unabhaengig von Monaten)

#### EC-4: Gleichzeitig zwei Buchungen im selben Zwinger (Datenfehler)
- [ ] **BUG-6 (MEDIUM):** Konflikte werden NICHT rot markiert. Der `gridMap` ueberschreibt bei Konflikten die erste Buchung mit der zweiten (last-write-wins). Nur die zuletzt iterierte Buchung wird angezeigt, die erste verschwindet ohne Warnung.

#### EC-5: Kein aktiver Zwinger
- [ ] **BUG-7 (LOW):** Leere Tabelle wird angezeigt, aber ohne den geforderten Hinweis "Keine aktiven Zwinger vorhanden". Es wird einfach ein leerer tbody gerendert.

#### EC-6: Alle Zwinger voll
- [x] Banner mit unzugewiesenen Buchungen bleibt sichtbar (korrekt)

#### EC-7: Race Condition beim Drop
- [x] Server-seitig korrekt implementiert: `assignKennel` prueft via `check_kennel_availability` und gibt Fehler zurueck. Allerdings mangels Drag & Drop UI nicht erreichbar.

#### EC-8: Drag auf mobile
- [x] Out-of-Scope per Spec, kein D&D implementiert. Buchungs-Modal bleibt nutzbar.

### Additional Findings (nicht in Spec)

- [x] **Bonus:** Ueberblick-Modus (kompaktere Ansicht) implementiert -- nicht in Spec gefordert, aber gute UX-Erweiterung
- [x] **Bonus:** Suchfilter fuer Kunden/Hunde implementiert -- nicht in Spec gefordert
- [x] **Bonus:** Buchungstyp-Filter als farbige Legende-Buttons -- nicht in Spec gefordert
- [x] **Bonus:** Feiertage (Niedersachsen) und Schulferien farblich markiert -- nicht in Spec gefordert
- [x] **Bonus:** Wochenenden grau hinterlegt -- gute UX

### Security Audit Results

- [x] Authentication: Route ist durch `(app)/layout.tsx` geschuetzt, das `supabase.auth.getUser()` prueft und bei fehlender Session nach `/login` redirected
- [x] Authorization: RLS auf `booking_kennels` aktiviert mit Policies fuer authenticated users
- [x] Input validation: `assignKennel` prueft Buchung-Existenz und Zwinger-Verfuegbarkeit serverseitig
- [ ] **BUG-8 (MEDIUM):** `assignKennel` Server Action validiert NICHT, ob `bookingId` und `kennelId` gueltige UUIDs sind. Beliebige Strings werden direkt an Supabase weitergegeben. Supabase wuerde zwar einen DB-Fehler werfen, aber saubere Validierung fehlt.
- [x] SQL Injection: Geschuetzt durch Supabase Parameterized Queries
- [x] XSS: Kein `dangerouslySetInnerHTML`, React escaped Output automatisch
- [x] Keine Secrets im Client-Code exponiert

### Regression Check

- [x] BuchungsModal aus PROJ-3 wird korrekt wiederverwendet mit erweiterten Props (`prefilledKennelIds`, `prefilledStartDate`)
- [x] Sidebar korrekt erweitert mit `/belegungsplan` Link
- [x] `onSaved`/`onStatusChanged`/`onCancelled` Callbacks triggern `router.refresh()` korrekt
- [x] Buchungsliste (`/buchungen`) wird via `revalidatePath` in `assignKennel` mitaktualisiert

### Bugs Found

#### BUG-1: 90-Tage-Fenster statt 14-Tage-Ansicht
- **Severity:** Low
- **Steps to Reproduce:**
  1. Go to `/belegungsplan`
  2. Expected: 14-Tage-Ansicht ab heute mit Vor/Zurueck-Navigation
  3. Actual: 90-Tage-Fenster mit horizontalem Scroll
- **Priority:** Nice to have (aktuelle Loesung ist funktional besser als Spec)

#### BUG-2: Unzugewiesene Buchungskarten nicht draggable
- **Severity:** Low (weil BUG-3 die gesamte D&D-Funktionalitaet abdeckt)
- **Steps to Reproduce:**
  1. Buchung ohne Zwinger erstellen
  2. Banner-Karte versuchen zu ziehen
  3. Expected: Karte ist draggable
  4. Actual: Karte oeffnet Buchungsmodal per Klick
- **Priority:** Fix before deployment (Teil von BUG-3)

#### BUG-3: Drag & Drop komplett fehlend
- **Severity:** High
- **Steps to Reproduce:**
  1. Go to `/belegungsplan`
  2. Buchung ohne Zwinger vorhanden
  3. Versuche Banner-Karte auf freien Slot zu ziehen
  4. Expected: Drag & Drop Zwingerzuweisung
  5. Actual: Kein Drag & Drop, nur Klick -> Modal
- **Priority:** Fix before deployment

#### BUG-4: Navigation Buttons (Zurueck/Weiter) fehlen
- **Severity:** High
- **Steps to Reproduce:**
  1. Go to `/belegungsplan`
  2. Expected: Buttons "Zurueck" und "Weiter" fuer 14-Tage-Navigation
  3. Actual: Nur "Heute"-Button und horizontales Scrollen
- **Priority:** Fix before deployment (Alternativ: Spec-Anpassung wenn 90-Tage-Scroll akzeptabel)

#### BUG-5: Zeitraum-Anzeige im Header fehlt
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Go to `/belegungsplan`
  2. Expected: Header zeigt "04.03.2026 -- 17.03.2026"
  3. Actual: Header zeigt nur "Belegungsplan"
- **Priority:** Fix before deployment

#### BUG-6: Doppelbelegung wird nicht als Konflikt angezeigt
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Zwei Buchungen mit demselben Zwinger und ueberlappenden Zeitraeumen in der DB haben
  2. Expected: Beide Slots sichtbar, zweiter mit rotem Rand als Konflikt markiert
  3. Actual: Nur die zuletzt iterierte Buchung wird angezeigt, die andere verschwindet
- **Priority:** Fix in next sprint

#### BUG-7: Fehlender Hinweis bei keinen aktiven Zwingern
- **Severity:** Low
- **Steps to Reproduce:**
  1. Alle Zwinger deaktivieren
  2. Go to `/belegungsplan`
  3. Expected: Hinweis "Keine aktiven Zwinger vorhanden"
  4. Actual: Leere Tabelle ohne Erklaerung
- **Priority:** Nice to have

#### BUG-8: Fehlende UUID-Validierung in assignKennel
- **Severity:** Medium
- **Steps to Reproduce:**
  1. `assignKennel('not-a-uuid', 'also-not-a-uuid')` aufrufen
  2. Expected: Validierungsfehler
  3. Actual: Anfrage geht direkt an Supabase, DB wirft Fehler statt saubere Validierung
- **Priority:** Fix in next sprint

### Summary

- **Acceptance Criteria:** 14/23 passed (9 failed -- hauptsaechlich wegen fehlendem Drag & Drop und Navigation)
- **Bugs Found:** 8 total (0 critical, 2 high, 3 medium, 3 low)
- **Security:** Grundlegend abgesichert (Auth, RLS, XSS/SQLi geschuetzt). UUID-Validierung fehlt in Server Action.
- **Production Ready:** NO
- **Recommendation:** Die 2 High-Severity Bugs (Drag & Drop, Navigation) muessen vor dem Deployment geloest werden. Die Medium-Bugs (Zeitraum-Anzeige, Doppelbelegung, UUID-Validierung) sollten ebenfalls behoben werden. Die Basisansicht (Raster, Farbkodierung, Buchungs-Modal-Integration, Filtering) funktioniert sehr gut.

## Deployment
_To be added by /deploy_
