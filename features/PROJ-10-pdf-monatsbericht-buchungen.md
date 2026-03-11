# PROJ-10: PDF-Monatsbericht Buchungen

## Status: Planned
**Created:** 2026-03-08
**Last Updated:** 2026-03-08

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — geschützte Route
- Requires: PROJ-3 (Buchungsmodul) — Buchungsdaten als Reportquelle
- Relates to: PROJ-7 (Reporting-Dashboard) — PDF-Export ergänzt den bestehenden CSV-Export

---

## Beschreibung

Ein PDF-Monatsbericht, der alle Buchungen eines frei wählbaren Monats tabellarisch darstellt — zum Ausdrucken oder als digitale Ablage. Der Export wird client-seitig über den Browser-Druck-Dialog (`window.print()`) mit einer druck-optimierten CSS-Ansicht realisiert. Die Daten stammen direkt aus der Reporting-Seite (PROJ-7) oder werden frisch geladen.

---

## User Stories

- Als Admin möchte ich einen Monatsbericht als PDF exportieren, damit ich einen druckbaren Buchungsüberblick für die Buchhaltung oder Ablage habe.
- Als Admin möchte ich den Monat frei auswählen können, damit ich auch Berichte für vergangene Monate erstellen kann.
- Als Admin möchte ich alle Buchungen des Monats tabellarisch mit Preis, Kunde, Hunden und Status sehen, damit der Bericht vollständig ist.
- Als Admin möchte ich die Gesamtsumme der Einnahmen im Bericht sehen, damit der Monatsbericht auch als Umsatznachweis nutzbar ist.

---

## Acceptance Criteria

### Zugang & Auslöser
- [ ] Auf der Reporting-Seite (`/reporting`) gibt es einen neuen Button „PDF-Monatsbericht"
- [ ] Klick öffnet ein kleines Modal zur Monatsauswahl (Monat + Jahr als Dropdown oder `<input type="month">`)
- [ ] Standardmäßig vorausgewählt: der aktuelle Monat
- [ ] Button „Bericht erstellen" lädt die Daten und öffnet die Druckansicht

### Berichtinhalt
- [ ] Berichts-Header:
  - Titel: „Buchungsbericht [Monat] [Jahr]" (z.B. „Buchungsbericht März 2026")
  - Erstellungsdatum: „Erstellt am: DD.MM.YYYY"
- [ ] Tabelle mit allen Buchungen des Monats (Buchung wird gezählt, wenn `start_date` im gewählten Monat liegt)
- [ ] Tabellenspalten:
  - Buchungsnummer (ID, gekürzt auf erste 8 Zeichen)
  - Kunde (Nachname, Vorname)
  - Hunde (Namen kommagetrennt)
  - Zwinger (Nummern kommagetrennt, „–" wenn nicht zugewiesen)
  - Buchungstyp (lesbare Bezeichnung: „Übernachtung" / „Tagesbetreuung flex." / „Tagesbetreuung reg.")
  - Zeitraum (DD.MM. – DD.MM.YYYY)
  - Dauer (X Tage)
  - Preis (€ XX,XX oder „–" wenn null)
  - Status
- [ ] Tabelle ist nach `start_date` aufsteigend sortiert
- [ ] Stornierte Buchungen werden in der Tabelle angezeigt, aber in grauer Schriftfarbe (für den Überblick, aber deutlich als storniert erkennbar)
- [ ] Fußzeile der Tabelle zeigt:
  - Gesamtzahl Buchungen (ohne stornierte)
  - Gesamtumsatz (Summe aller nicht-stornierten Buchungen mit `total_price`)
- [ ] Wenn keine Buchungen im Monat: Tabelle mit Kopfzeile + Text „Keine Buchungen in diesem Zeitraum"

### Druckansicht
- [ ] Die Druckansicht verbirgt alle Navigation, Sidebar und UI-Elemente — nur der Bericht ist sichtbar
- [ ] Schriftgröße und Tabellenlayout sind für A4-Querformat optimiert
- [ ] Seitenumbrüche vermeiden das Zerteilen von Tabellenzeilen
- [ ] Auf der letzten Seite befindet sich die Zusammenfassung (Gesamtumsatz)
- [ ] `window.print()` wird automatisch aufgerufen, wenn die Druckansicht geladen ist
- [ ] Nach dem Drucken (oder Abbruch): Nutzer kann zur Reporting-Seite zurücknavigieren

### Dateiname (beim Speichern als PDF aus dem Druckdialog)
- [ ] Der Seitentitel ist gesetzt auf `buchungsbericht_YYYY-MM.pdf` (z.B. `buchungsbericht_2026-03.pdf`), damit der Browser-Druckdialog ihn als Dateinamen vorschlägt

---

## Edge Cases

- **Monat ohne Buchungen:** Tabelle mit Kopfzeile anzeigen + Text „Keine Buchungen in diesem Zeitraum"; Gesamtumsatz = 0,00 €
- **Buchungen ohne Preis (`total_price = null`):** In der Tabelle als „–" anzeigen; nicht in die Gesamtsumme eingerechnet; Anzahl der Buchungen ohne Preis in der Fußzeile vermerken
- **Buchungen ohne Zwinger:** Spalte zeigt „–"
- **Sehr viele Buchungen (> 100 im Monat):** Tabelle bricht auf mehrere Seiten um (kein Abschneiden)
- **Sehr langer Kundenname oder viele Hunde:** Text bricht um (`word-break`) — kein Überlaufen der Zellen
- **Buchungsnummer-Darstellung:** UUID ist lang — nur erste 8 Zeichen anzeigen (ausreichend für Referenz)
- **Nutzer druckt auf falschem Drucker:** Kein technisches Problem — Browser-Druckdialog gibt Kontrolle an Nutzer

---

## Technical Requirements

- Druckansicht: eigene Route `/reporting/monatsbericht?monat=2026-03` oder Client-seitiger Print-Modus mit `@media print` CSS
- Daten: Server Action `getMonthlyReportData(year, month)` — gibt Buchungen des Monats zurück (mit customer, dogs, kennels JOINs)
- Keine externe PDF-Bibliothek nötig — `window.print()` + `@media print` CSS reicht für tabellarische Berichte
- Performance: Datenladen für einen Monat (max. ~200 Buchungen) < 2 Sekunden

---

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
