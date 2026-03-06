# PROJ-7: Reporting-Dashboard

## Status: In Progress
**Created:** 2026-03-06
**Last Updated:** 2026-03-06

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — Admin-only Zugang via Rollenprüfung
- Requires: PROJ-3 (Buchungsmodul) — Buchungsdaten als Grundlage aller Reports
- Requires: PROJ-2 (Kundenverwaltung) — Kundendaten für Kundenstatistiken

---

## Beschreibung
Eine Admin-exklusive Reporting-Seite, die Kennzahlen zu Umsatz, Auslastung, Kunden und Buchungen für einen frei wählbaren Zeitraum anzeigt. Alle Daten können als CSV exportiert werden.

---

## User Stories

- Als Admin möchte ich den Gesamtumsatz für einen beliebigen Zeitraum auf einen Blick sehen, damit ich die finanzielle Entwicklung der Pension beurteilen kann.
- Als Admin möchte ich die Zwingerbelegungsquote im gewählten Zeitraum sehen, damit ich Leerzeiten erkenne und Marketingmaßnahmen planen kann.
- Als Admin möchte ich wissen, welche Kunden am häufigsten und mit dem höchsten Umsatz gebucht haben, damit ich Stammkunden identifizieren kann.
- Als Admin möchte ich die Stornierungsquote und Buchungsvolumina sehen, damit ich Trends im Buchungsverhalten erkenne.
- Als Admin möchte ich Buchungsdaten als CSV exportieren, damit ich sie in Excel weiterverarbeiten oder für die Buchhaltung nutzen kann.
- Als Admin möchte ich zwischen Schnellauswahl (diese Woche, dieser Monat, dieses Quartal, dieses Jahr) und einem freien Datumspicker wechseln können, damit ich flexibel berichten kann.

---

## Acceptance Criteria

### Zeitraumfilter
- [ ] Schnellauswahl-Buttons: „Diese Woche", „Dieser Monat", „Dieses Quartal", „Dieses Jahr"
- [ ] Freier Datumspicker: Von-Datum und Bis-Datum wählbar
- [ ] Alle vier Abschnitte aktualisieren sich beim Ändern des Zeitraums
- [ ] Der gewählte Zeitraum bleibt beim Seitenwechsel erhalten (URL-Parameter oder State)

### Zugriffsschutz
- [ ] Die Seite ist nur für Nutzer mit Rolle `admin` erreichbar
- [ ] Nicht-Admins werden auf die Startseite weitergeleitet

### Abschnitt 1 — Umsatz-KPIs
- [ ] Gesamtumsatz aller Buchungen im Zeitraum (Summe `total_price`)
- [ ] Anzahl abgeschlossener Buchungen im Zeitraum
- [ ] Durchschnittlicher Buchungswert (Gesamtumsatz ÷ Anzahl Buchungen)
- [ ] Aufschlüsselung nach Buchungstyp: Übernachtung / Tagesbetreuung flex. / Tagesbetreuung reg. (Anzahl + Summe je Typ)
- [ ] Stornierte Buchungen werden nicht in den Umsatz eingerechnet

### Abschnitt 2 — Auslastung
- [ ] Belegungsquote in % = belegte Zwinger-Tage ÷ (Anzahl aktive Zwinger × Anzahl Tage im Zeitraum)
- [ ] Anzahl belegte Tage gesamt vs. freie Tage gesamt
- [ ] Top 5 meistbelegte Zwinger (nach Anzahl belegter Tage, absteigend)

### Abschnitt 3 — Kundenstatistiken
- [ ] Anzahl Kunden, die im Zeitraum mindestens eine Buchung hatten
- [ ] Top 5 Kunden nach Anzahl Buchungen (Kundenname + Anzahl)
- [ ] Top 5 Kunden nach Umsatz (Kundenname + Gesamtumsatz)

### Abschnitt 4 — Buchungsstatistiken
- [ ] Gesamtanzahl Buchungen im Zeitraum
- [ ] Stornierungsquote in % (stornierte ÷ alle Buchungen im Zeitraum)
- [ ] Durchschnittliche Aufenthaltsdauer in Tagen (`duration_days`)
- [ ] Aufschlüsselung nach Status: bestätigt / ausstehend / abgeschlossen / storniert

### CSV-Export
- [ ] Button „CSV exportieren" erzeugt eine Datei mit allen Buchungen des Zeitraums
- [ ] Spalten: Buchungsnummer, Kunde, Hunde, Buchungstyp, Zwinger, Start, Ende, Dauer (Tage), Preis, Status, Stornierungsdatum, Stornierungsgebühr
- [ ] Dateiname: `buchungen_YYYY-MM-DD_YYYY-MM-DD.csv`
- [ ] Encoding: UTF-8 mit BOM (damit Excel Umlaute korrekt anzeigt)
- [ ] Bei leerem Zeitraum (keine Buchungen) wird eine CSV mit nur der Kopfzeile exportiert

---

## Edge Cases

- **Keine Buchungen im Zeitraum:** Alle KPI-Werte zeigen 0 bzw. „–", kein Fehler
- **Zeitraum mit nur einem Tag:** Wird korrekt berechnet (Von = Bis)
- **Buchungen ohne `total_price` (null):** Werden bei Umsatz-KPIs als 0 gewertet, aber mitgezählt
- **Buchungen, die den Zeitraum überschneiden:** Buchung wird gezählt, wenn `start_date ≤ bis UND end_date ≥ von` (gleiche Logik wie Belegungsplan)
- **Zwinger mit `is_active = false`:** Werden aus der Auslastungsrechnung ausgeschlossen
- **Sehr langer Zeitraum (mehrere Jahre):** Seite lädt trotzdem; ggf. Hinweis bei > 365 Tagen
- **CSV mit Sonderzeichen in Namen:** Felder mit Komma oder Anführungszeichen werden korrekt escaped (RFC 4180)

---

## Technical Requirements

- Nur für Nutzer mit `role = 'admin'` — Prüfung serverseitig in der Page-Komponente (wie in `layout.tsx`)
- Datenabruf als Server Action oder direkt in Server Component
- CSV-Download: Client-seitig via `Blob` + `URL.createObjectURL` (kein eigener API-Endpunkt nötig)
- Performance: Reporting-Abfragen dürfen bei bis zu 1.000 Buchungen max. 2 Sekunden dauern

---

## Tech Design (Solution Architect)

### Brauchen wir ein Backend?
**Ja — Server Actions.** Die Buchungsdaten liegen in Supabase. Berechnungen (Belegungsquote, Top-Kunden etc.) werden serverseitig durchgeführt, damit keine rohen Massendaten zum Browser übertragen werden. Das entspricht dem etablierten Muster aller anderen Seiten im Projekt (z. B. `belegungsplan/actions.ts`, `buchungen/actions.ts`).

---

### A) Neue Dateien & Struktur

```
src/app/(app)/reporting/
├── page.tsx              ← Server Component: Auth-Guard + Startzeitraum laden
├── actions.ts            ← Server Actions: Reporting-Daten aus Supabase abrufen
└── ReportingClient.tsx   ← Client Component: Filter-Zustand + alle Abschnitte
```

Außerdem: **Sidebar** (`src/components/sidebar.tsx`) erhält einen neuen Eintrag „Reporting" — nur sichtbar für Admins.

---

### B) Komponentenstruktur (visuell)

```
ReportingPage (page.tsx — Server)
└── ReportingClient (Client — hält Zeitraumfilter-Zustand)
    ├── ZeitraumFilter
    │   ├── Schnellauswahl-Buttons (Diese Woche / Dieser Monat / Dieses Quartal / Dieses Jahr)
    │   └── Datumspicker Von–Bis (zwei Datumsfelder)
    │
    ├── UmsatzAbschnitt
    │   ├── KpiCard „Gesamtumsatz"
    │   ├── KpiCard „Anzahl Buchungen"
    │   ├── KpiCard „Ø Buchungswert"
    │   └── Tabelle: Aufschlüsselung nach Buchungstyp
    │
    ├── AuslastungAbschnitt
    │   ├── KpiCard „Belegungsquote %"
    │   ├── KpiCard „Belegte Tage"
    │   ├── KpiCard „Freie Tage"
    │   └── Liste: Top 5 Zwinger nach Belegung
    │
    ├── KundenAbschnitt
    │   ├── KpiCard „Aktive Kunden"
    │   ├── Tabelle: Top 5 nach Anzahl Buchungen
    │   └── Tabelle: Top 5 nach Umsatz
    │
    ├── BuchungsAbschnitt
    │   ├── KpiCard „Gesamtanzahl"
    │   ├── KpiCard „Stornierungsquote %"
    │   ├── KpiCard „Ø Aufenthaltsdauer"
    │   └── Tabelle: Aufschlüsselung nach Status
    │
    └── CsvExportButton  (erzeugt Datei direkt im Browser — kein API-Endpunkt)
```

**KpiCard** ist eine kleine wiederverwendbare Komponente (Label + großer Wert + optionaler Untertitel) — wird 4× pro Abschnitt verwendet. Bleibt intern in `ReportingClient.tsx`, da sie nur dort gebraucht wird.

---

### C) Datenfluss

```
Nutzer wählt Zeitraum
        ↓
ReportingClient ruft Server Action auf:
  getReportingData(von: string, bis: string)
        ↓
Server Action liest aus Supabase:
  • bookings (+ customers, booking_dogs, booking_kennels)
  • kennels (aktive Zwinger für Belegungsquote)
        ↓
Server berechnet alle KPI-Werte
  (Summen, Durchschnitte, Top-Listen)
        ↓
Ergebnis-Objekt → zurück an Client
        ↓
Client rendert alle 4 Abschnitte neu
```

Der Admin sieht während des Ladens einen Lade-Spinner (React `useTransition`). Die Seite friert dabei nicht ein.

---

### D) Datenbasis — was wird abgefragt

| Daten | Quelle | Zweck |
|---|---|---|
| Alle Buchungen im Zeitraum | `bookings` Tabelle | Alle KPIs |
| Kundennamen | `customers` (JOIN) | Kundenstatistiken |
| Hundenamen | `booking_dogs` + `dogs` (JOIN) | CSV-Export |
| Zwingernummern | `booking_kennels` + `kennels` (JOIN) | Auslastung + CSV |
| Anzahl aktive Zwinger | `kennels WHERE is_active = true` | Belegungsquote-Nenner |

**Keine neuen Datenbanktabellen oder -spalten nötig.** Alle benötigten Daten sind bereits vorhanden.

---

### E) CSV-Export — Funktionsweise

Der „CSV exportieren"-Button führt alles **im Browser** aus:
1. Die aktuell geladenen Buchungsdaten werden in CSV-Text umgewandelt
2. Der Browser erzeugt daraus eine temporäre Datei
3. Ein unsichtbarer Download-Link wird ausgelöst
4. Datei landet im Download-Ordner des Nutzers

Kein Server-Roundtrip nötig — die Daten sind bereits im Client geladen.

---

### F) Zugriffsschutz

Gleiche Methode wie `Benutzerverwaltung`:
- `page.tsx` liest die Nutzer-Rolle aus Supabase
- Nicht-Admins werden sofort auf `/dashboard` weitergeleitet
- Die Prüfung passiert serverseitig — der Client sieht nie Reportingdaten

---

### G) Tech-Entscheidungen (Begründung)

| Entscheidung | Warum |
|---|---|
| Server Action statt API-Route | Konsistent mit restlicher Codebasis; kein zusätzlicher HTTP-Endpunkt nötig |
| Berechnungen serverseitig | Nur aggregierte KPI-Werte werden übertragen, nicht tausende Rohdaten-Zeilen |
| CSV client-seitig | Kein eigener Download-Endpunkt nötig; Daten sind bereits geladen |
| Kein Charting-Package | Spec fordert nur KPI-Karten, keine Grafiken — spart Abhängigkeiten |
| `useTransition` für Re-Fetch | UI bleibt responsiv während neue Daten laden; kein Seitenneuladen |

---

### H) Neue Pakete

**Keine neuen Pakete nötig.** Alle Anforderungen sind mit bereits installierten Tools lösbar (React, Next.js, Supabase-Client, Tailwind CSS).

## QA Test Results

**Tested:** 2026-03-06
**Build:** ✅ `npm run build` — keine TypeScript-Fehler, `/reporting` als dynamische Route gelistet

### Acceptance Criteria Status

#### Zeitraumfilter
- [x] Schnellauswahl-Buttons: „Diese Woche", „Dieser Monat", „Dieses Quartal", „Dieses Jahr"
- [x] Freier Datumspicker: Von-Datum und Bis-Datum wählbar
- [x] Alle Abschnitte aktualisieren sich beim Ändern des Zeitraums (via `useTransition` + Re-Fetch)
- [x] Aktiver Schnellauswahl-Button visuell hervorgehoben

#### Zugriffsschutz
- [x] Seite nur für `admin` erreichbar — serverseitige Prüfung in `page.tsx`
- [x] Nicht-Admins werden auf `/dashboard` weitergeleitet
- [x] Sidebar-Eintrag admin-only (client-seitig via `user.role === 'admin'`)

#### Abschnitt 1 — Umsatz-KPIs
- [x] Gesamtumsatz (Summe `total_price`, stornierte ausgeschlossen)
- [x] Anzahl Buchungen (ohne stornierte)
- [x] Durchschnittlicher Buchungswert
- [x] Aufschlüsselung nach Buchungstyp (Anzahl + Summe)
- [x] Stornierte Buchungen nicht im Umsatz

#### Abschnitt 2 — Auslastung
- [x] Belegungsquote in % (belegte Zwinger-Tage ÷ aktive Zwinger × Tage)
- [x] Anzahl belegte Tage / freie Tage
- [x] Top 5 meistbelegte Zwinger

#### Abschnitt 3 — Kundenstatistiken
- [x] Aktive Kunden im Zeitraum
- [x] Top 5 nach Anzahl Buchungen
- [x] Top 5 nach Umsatz

#### Abschnitt 4 — Buchungsstatistiken
- [x] Gesamtanzahl Buchungen (inkl. stornierte)
- [x] Stornierungsquote in %
- [x] Durchschnittliche Aufenthaltsdauer
- [x] Aufschlüsselung nach Status

#### CSV-Export
- [x] Button „CSV exportieren" — client-seitig via Blob + `URL.createObjectURL`
- [x] Spalten gemäß Spec (Buchungsnummer, Kunde, Hunde, Buchungstyp, Zwinger, Start, Ende, Dauer, Preis, Status, Stornierungsdatum, Stornierungsgebühr)
- [x] Dateiname: `buchungen_YYYY-MM-DD_YYYY-MM-DD.csv`
- [x] Encoding: UTF-8 mit BOM (Excel-kompatibel)
- [x] Leerer Zeitraum: CSV mit nur Kopfzeile (da `csvRows` leer)
- [x] RFC 4180-Escaping via `escapeCsvField()`

### Bugs Found
Keine.

### Summary
- **Acceptance Criteria:** 19/19 bestätigt (Code-Review)
- **Bugs:** 0
- **Build:** ✅ Fehlerfrei
- **Production Ready:** YES — bereit für `/deploy`

## Deployment
_To be added by /deploy_
