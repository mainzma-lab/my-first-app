# PROJ-9: CSV-Export Kundenliste

## Status: Planned
**Created:** 2026-03-08
**Last Updated:** 2026-03-08

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — geschützte Route
- Requires: PROJ-2 (CRM — Kundenverwaltung & Hundedaten) — Kundendaten als Exportquelle

---

## Beschreibung

Ein CSV-Export-Button in der Kundenverwaltung, der die aktuell gefilterte oder vollständige Kundenliste als UTF-8-CSV-Datei herunterlädt. Kein Server-Roundtrip nötig — die bereits geladenen Daten werden client-seitig in eine Datei umgewandelt (identisches Muster wie Buchungs-CSV-Export in PROJ-7).

---

## User Stories

- Als Mitarbeiterin möchte ich die Kundenliste als CSV exportieren, damit ich sie in Excel weiterverarbeiten oder für externe Auswertungen nutzen kann.
- Als Admin möchte ich alle Kunden mit ihren Hunden und Kontaktdaten exportieren, damit ich einen vollständigen Kundenstamm-Auszug für die Buchhaltung oder als Backup habe.
- Als Mitarbeiterin möchte ich wahlweise nur die gefilterten Kunden (z.B. nur aktive) exportieren, damit die CSV nur die für mich relevanten Einträge enthält.

---

## Acceptance Criteria

### Export-Button
- [ ] In der Kundenliste (`/kunden`) gibt es einen Button „CSV exportieren"
- [ ] Der Button ist für alle angemeldeten Nutzer sichtbar (nicht nur Admins)
- [ ] Klick auf den Button löst sofort den Download aus — kein Modal, kein Ladebalken nötig
- [ ] Button ist deaktiviert (`disabled`), wenn die gefilterte Liste leer ist

### Dateiinhalt
- [ ] Die exportierte CSV enthält alle Kunden, die aktuell in der gefilterten Ansicht sichtbar sind (aktiver Filter wird berücksichtigt)
- [ ] Wenn kein Filter aktiv: alle Kunden werden exportiert
- [ ] Spalten:
  - Kundennummer
  - Anrede
  - Vorname 1
  - Nachname 1
  - Vorname 2 (leer wenn nicht vorhanden)
  - Nachname 2 (leer wenn nicht vorhanden)
  - E-Mail
  - Mobiltelefon
  - Festnetz (leer wenn nicht vorhanden)
  - Straße
  - PLZ
  - Ort
  - Status
  - Kunde seit
  - Newsletter-Einwilligung (Ja/Nein)
  - Anzahl Hunde
  - Hund 1 Name
  - Hund 1 Rasse
  - Hund 2 Name (leer wenn nicht vorhanden)
  - Hund 2 Rasse (leer wenn nicht vorhanden)
  - Notizen
- [ ] Erste Zeile ist die Kopfzeile mit deutschen Spaltennamen
- [ ] Encoding: UTF-8 mit BOM (für korrekte Darstellung von Umlauten in Excel)
- [ ] Trennzeichen: Semikolon (`;`) — standard für deutsche Excel-Versionen
- [ ] Felder mit Semikolon oder Anführungszeichen im Inhalt werden korrekt nach RFC 4180 escaped

### Dateiname
- [ ] Dateiname: `kunden_YYYY-MM-DD.csv` (Datum = heutiges Datum)
- [ ] Beispiel: `kunden_2026-03-08.csv`

### Edge Cases
- [ ] Kunden ohne Hunde: Hund-Spalten bleiben leer (kein Fehler)
- [ ] Kunden mit mehr als 2 Hunden: nur Hund 1 und Hund 2 werden exportiert; im Button-Tooltip Hinweis „Export enthält max. 2 Hunde pro Kunde"
- [ ] Leere gefilterte Liste: Button ist deaktiviert (kein leerer Download)
- [ ] Notizen mit Zeilenumbrüchen: korrekt in Anführungszeichen eingeschlossen

---

## Edge Cases

- **Kein Kunde vorhanden:** Button disabled, kein Export möglich
- **Alle Kunden gefiltert heraus:** Button disabled
- **Sehr große Kundenliste (1.000+ Kunden):** Client-seitige Verarbeitung ist ausreichend — CSV-Erzeugung dauert < 1 Sekunde bei 1.000 Zeilen
- **Sonderzeichen in Namen (Umlaute, Accents):** Durch UTF-8 BOM korrekt dargestellt

---

## Technical Requirements

- Client-seitig via `Blob` + `URL.createObjectURL` (kein API-Endpunkt, kein Server-Roundtrip)
- Identisches Muster wie CSV-Export in PROJ-7 (`escapeCsvField()` Funktion wiederverwendbar)
- Keine neuen Server Actions nötig — Daten sind bereits in der Kundenliste geladen
- Trennzeichen Semikolon (nicht Komma) für deutsche Excel-Kompatibilität

---

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
