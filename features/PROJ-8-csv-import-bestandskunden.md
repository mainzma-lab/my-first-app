# PROJ-8: CSV-Import Bestandskunden

## Status: Planned
**Created:** 2026-03-08
**Last Updated:** 2026-03-08

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — Admin-only Zugang
- Requires: PROJ-2 (CRM — Kundenverwaltung & Hundedaten) — Datenmodell Customers + Dogs + das Ziel der importierten Daten

---

## Beschreibung

Ein mehrstufiger Import-Assistent (Wizard), der es einem Admin ermöglicht, bis zu ~1.000 Bestandskunden mit ihren Hunden aus einer einzigen CSV-Datei in das System zu laden. Jede CSV-Zeile entspricht einem Kunden mit bis zu zwei Hunden (in separaten Spalten). Der Assistent führt durch: Datei-Upload → Spalten-Mapping → Vorschau & Validierung → Duplikat-Prüfung → Import → Ergebnisbericht.

---

## User Stories

- Als Admin möchte ich eine CSV-Datei mit Bestandskundendaten hochladen, damit ich nicht jeden der ~500–1.000 Kunden manuell anlegen muss.
- Als Admin möchte ich die CSV-Spalten manuell den Systemfeldern zuordnen, damit ich auch dann importieren kann, wenn meine CSV-Spalten andere Namen haben.
- Als Admin möchte ich vor dem Import eine Vorschau der erkannten Daten sehen, damit ich Fehler im Mapping früh erkennen kann.
- Als Admin möchte ich erkannte Duplikate (gleiche E-Mail-Adresse) einzeln entscheiden können, damit kein Datenverlust entsteht und keine ungewollten Doppeleinträge entstehen.
- Als Admin möchte ich nach dem Import einen klaren Ergebnisbericht sehen (erfolgreich / übersprungen / Fehler), damit ich weiß, was importiert wurde und was nachzuarbeiten ist.
- Als Admin möchte ich, dass Hunde automatisch dem richtigen Kunden zugeordnet werden, damit ich keinen zweiten Import-Schritt für Hunde brauche.

---

## Acceptance Criteria

### Zugang & Navigation
- [ ] Die Import-Seite ist unter `/einstellungen/import` erreichbar
- [ ] Nur Nutzer mit Rolle `admin` können auf die Seite zugreifen — Nicht-Admins werden auf `/dashboard` weitergeleitet
- [ ] Sidebar-Eintrag unter „Verwaltung" (admin-only): „Datenimport"

### Schritt 1 — Datei-Upload
- [ ] Nutzer kann eine CSV-Datei per Datei-Auswahl-Dialog hochladen (kein Drag & Drop nötig)
- [ ] Erlaubtes Format: `.csv` (UTF-8 oder UTF-8 mit BOM; Komma oder Semikolon als Trennzeichen)
- [ ] Maximale Dateigröße: 5 MB
- [ ] Bei falschem Dateiformat oder zu großer Datei: klare Fehlermeldung, kein Weiterleiten zu Schritt 2
- [ ] Nach erfolgreichem Upload wird die erste Zeile (Kopfzeile) und eine Vorschau der ersten 3 Datenzeilen angezeigt
- [ ] Automatische Erkennung des Trennzeichens (Komma vs. Semikolon)

### Schritt 2 — Spalten-Mapping
- [ ] Für jedes Systemfeld wird ein Dropdown angezeigt, aus dem der Nutzer die passende CSV-Spalte auswählen kann
- [ ] Pflichtfelder sind klar gekennzeichnet: Vorname 1, Nachname 1, E-Mail, Straße, PLZ, Ort, Mobiltelefon
- [ ] Optional mappbare Felder: Anrede, Vorname 2, Nachname 2, Festnetz, Newsletter-Einwilligung, Notizen, Wie kennengelernt
- [ ] Hund-1-Felder: Name, Rasse, Geburtsdatum, Geschlecht, Kastriert (alle optional — wenn leer, wird kein Hund angelegt)
- [ ] Hund-2-Felder: identische Felder wie Hund 1 (alle optional)
- [ ] System versucht eine automatische Vorbelgung des Mappings anhand gängiger Spaltenbezeichnungen (z.B. „email" → E-Mail, „vorname" → Vorname 1) — Nutzer kann überschreiben
- [ ] Nicht gemappte Pflichtfelder blockieren den Weitergang zu Schritt 3 (Validierungsfehler)

### Schritt 3 — Vorschau & Validierung
- [ ] Die ersten 10 Datenzeilen werden als Tabelle angezeigt (mit den gemappten Werten)
- [ ] Zeilen mit Validierungsfehlern werden rot hervorgehoben mit Fehlerbeschreibung (z.B. „E-Mail ungültig", „PLZ muss 5 Ziffern haben")
- [ ] Gesamtstatistik angezeigt: X Zeilen gesamt, Y gültig, Z mit Fehlern
- [ ] Zeilen mit Fehlern werden beim Import übersprungen (kein Abbruch des gesamten Imports)
- [ ] Nutzer kann zwischen „alle Zeilen anzeigen" und „nur fehlerhafte Zeilen anzeigen" umschalten
- [ ] Button „Weiter" ist nur aktiv, wenn mindestens 1 gültige Zeile vorhanden ist

### Schritt 4 — Duplikat-Prüfung
- [ ] System prüft alle gültigen Zeilen auf Duplikate anhand der E-Mail-Adresse
- [ ] Erkannte Duplikate werden in einer Liste angezeigt: CSV-Daten (links) vs. vorhandener Datensatz (rechts)
- [ ] Für jedes Duplikat kann der Nutzer wählen:
  - „Überspringen" — Datensatz wird nicht importiert
  - „Trotzdem importieren" — Datensatz wird als neuer Kunde angelegt (doppelte E-Mail erlaubt)
- [ ] Wenn keine Duplikate vorhanden: Schritt 4 wird übersprungen (direkt zu Schritt 5)
- [ ] Standardauswahl für alle Duplikate: „Überspringen" (sicher-zuerst Ansatz)
- [ ] „Alle überspringen" und „Alle importieren" als Schnellauswahl-Buttons

### Schritt 5 — Import & Ergebnisbericht
- [ ] Import-Button startet den serverseitigen Import
- [ ] Während des Imports: Fortschrittsanzeige (Spinner + „Importiere X von Y...")
- [ ] Nach Abschluss: Ergebnisbericht mit:
  - Anzahl erfolgreich importierter Kunden
  - Anzahl erfolgreich importierter Hunde (Hund 1 + Hund 2)
  - Anzahl übersprungener Duplikate
  - Anzahl übersprungener Fehlerzeilen
  - Liste der Fehlerzeilen mit Zeilennummer + Grund (als aufklappbarer Bereich)
- [ ] Button „Zum Kundenstamm" navigiert zur Kundenliste
- [ ] Button „Neuen Import starten" setzt den Wizard zurück

### Datenverarbeitung
- [ ] Importierte Kunden erhalten Status `neukunde_gewonnen` (da es Bestandskunden sind)
- [ ] `customer_since` wird auf das heutige Datum gesetzt, wenn kein Datum in der CSV vorhanden
- [ ] Hunde werden angelegt, wenn mindestens `Name` und `Rasse` gemappt und befüllt sind; fehlende Pflichtfelder (z.B. Geburtsdatum) → Hund wird trotzdem angelegt mit Platzhalter-Geburtsdatum (01.01.2000) + Hinweis im Ergebnisbericht
- [ ] `newsletter_consent` wird auf `false` gesetzt, wenn nicht gemappt oder Wert unklar
- [ ] Groß-/Kleinschreibung bei E-Mail wird normalisiert (lowercase)
- [ ] Leerzeichen am Anfang/Ende aller Felder werden automatisch entfernt (trim)

---

## Edge Cases

- **Leere CSV (nur Kopfzeile):** Fehlermeldung „Die Datei enthält keine Daten", kein Weiterleiten zu Schritt 2
- **CSV ohne Kopfzeile:** Erste Zeile wird als Kopfzeile interpretiert — Nutzer muss im Mapping aufpassen; kein automatisches Erkennen ohne Kopfzeile
- **Spalten mit leerem Wert bei Pflichtfeld:** Zeile wird als ungültig markiert (Schritt 3), beim Import übersprungen
- **E-Mail-Format ungültig:** Zeile wird als ungültig markiert
- **Zeile hat Hund-1-Name aber keine Rasse:** Hund 1 wird trotzdem importiert, Rasse = „Unbekannt"; im Ergebnisbericht vermerkt
- **Zeile hat Hund-2-Daten aber Hund-1 ist leer:** Hund 2 wird als Hund 1 behandelt (keine leere Hund-Slot-Lücke)
- **Kundennamen mit Sonderzeichen (Umlaute):** Korrekt importiert, solange Encoding UTF-8 oder UTF-8+BOM
- **Gleiche E-Mail zweimal in derselben CSV:** Beide Zeilen als Duplikat markiert (interne Duplikate) — Nutzer wird informiert, zweite Zeile übersprungen
- **Sehr lange CSV (>1.000 Zeilen):** Import läuft durch ohne Timeout (serverseitige Verarbeitung)
- **Netzwerkfehler während Import:** Fehlermeldung, bereits importierte Zeilen bleiben erhalten (kein Rollback)
- **Import-Abbruch durch Nutzer:** Wird nicht unterstützt (kein Stop-Button) — Import läuft durch

---

## Technical Requirements

- Nur für Rolle `admin` zugänglich (serverseitige Prüfung in `page.tsx`)
- CSV-Parsing: serverseitig (Server Action) — keine rohen CSV-Daten dauerhaft gespeichert
- Maximale Importgröße: 1.000 Zeilen (darüber: Fehlermeldung „Bitte teilen Sie die Datei auf")
- Performance: Import von 1.000 Zeilen in unter 30 Sekunden
- Keine neuen Datenbanktabellen nötig — schreibt in bestehende `customers` und `dogs` Tabellen

---

## Tech Design (Solution Architect)

### Brauchen wir ein Backend?
**Ja — teilweise.** Der Import-Wizard verarbeitet die CSV-Datei in zwei Phasen:
- **Browser (Schritte 1–3):** Datei einlesen, Spalten erkennen, Mapping und Validierung laufen direkt im Browser — kein Server-Roundtrip, sofortige Rückmeldung.
- **Server (Schritte 4–5):** Duplikat-Prüfung und eigentlicher Import erfordern Datenbankzugriff und laufen als Server Actions — konsistent mit dem Rest der App.

---

### A) Neue Dateien & Struktur

```
src/app/(app)/einstellungen/import/
├── page.tsx           ← Server Component: Admin-Guard + Seiten-Shell
├── ImportWizard.tsx   ← Client Component: gesamter Wizard-Zustand + alle Schritte
└── actions.ts         ← Server Actions: Duplikat-Check + Import-Ausführung
```

Außerdem wird **`src/components/sidebar.tsx`** um den Eintrag „Datenimport" unter der Verwaltungs-Sektion ergänzt (admin-only, identisches Muster wie bestehende Admin-Einträge).

---

### B) Komponentenstruktur (visuell)

```
ImportPage (page.tsx — Server, Admin-Guard)
└── ImportWizard (Client — hält gesamten Wizard-Zustand)
    │
    ├── WizardFortschritt  (Schritt-Anzeige: 1 Upload · 2 Mapping · 3 Vorschau · 4 Duplikate · 5 Import)
    │
    ├── [Schritt 1] UploadSchritt
    │   ├── Datei-Auswahl-Button (<input type="file" accept=".csv">)
    │   └── MiniVorschau  (Kopfzeile + erste 3 Datenzeilen nach erfolgreichem Einlesen)
    │
    ├── [Schritt 2] MappingSchritt
    │   └── MappingTabelle
    │       └── MappingZeile × N  (je 1 pro Systemfeld: Feldname | Pflicht-Badge | Spalten-Dropdown | Beispielwert)
    │
    ├── [Schritt 3] VorschauSchritt
    │   ├── StatistikLeiste  (X gesamt · Y gültig · Z Fehler)
    │   ├── FilterToggle  (Alle / Nur Fehler)
    │   └── VorschauTabelle  (erste 10 Zeilen, Fehlerzeilen rot hervorgehoben mit Fehlerbeschreibung)
    │
    ├── [Schritt 4] DuplikatSchritt  (wird übersprungen wenn keine Duplikate)
    │   ├── SchnellAuswahl  („Alle überspringen" / „Alle importieren")
    │   └── DuplikatKarte × N
    │       ├── CSV-Seite  (Daten aus der Importdatei)
    │       ├── DB-Seite   (vorhandener Datensatz im System)
    │       └── EntscheidungsButtons  (Überspringen / Trotzdem importieren)
    │
    └── [Schritt 5] ImportSchritt
        ├── ImportButton  (startet Server Action)
        ├── Fortschrittsanzeige  (Spinner + „Importiere…")
        └── ErgebnisBericht  (nach Abschluss)
            ├── ErfolgsZähler  (Kunden + Hunde importiert)
            ├── ÜbersprungZähler  (Duplikate + Fehlerzeilen)
            └── FehlerListe  (aufklappbar: Zeilennummer + Grund)
```

---

### C) Datenfluss

```
Schritt 1: Nutzer wählt CSV-Datei
        ↓
Browser liest Datei (FileReader API)
Trennzeichen-Erkennung (Komma vs. Semikolon)
Spaltenköpfe + erste 3 Zeilen → React State
        ↓
Schritt 2: Nutzer ordnet Spalten zu
Mapping-Objekt (Systemfeld → CSV-Spalte) → React State
Auto-Vorbelgung anhand gängiger Spaltenbezeichnungen
        ↓
Schritt 3: Browser wendet Mapping auf alle Zeilen an
Validierung im Browser (Pflichtfelder, E-Mail-Format, PLZ-Format)
Ergebnis (gültige Zeilen + Fehlerzeilen) → React State
        ↓
Schritt 4: Server Action checkDuplicates(emailListe)
→ Vergleich mit Datenbank
→ Duplikat-Liste mit vorhandenen Kundendaten → React State
Nutzer entscheidet pro Duplikat
        ↓
Schritt 5: Server Action executeImport(gültigeZeilen, Duplikat-Entscheidungen)
→ Schreibt Kunden + Hunde in Datenbank
→ Gibt Ergebnisbericht zurück → Anzeige im Browser
```

---

### D) Zwei Server Actions

| Action | Aufgabe |
|--------|---------|
| `checkDuplicates(emails[])` | Empfängt Liste von E-Mail-Adressen, prüft gegen `customers` Tabelle, gibt zurück: welche E-Mails bereits existieren + Kundendaten des Vorhandenen |
| `executeImport(rows[], decisions{})` | Empfängt strukturierte Kundendaten als JSON (keine rohe CSV), schreibt Datensätze in `customers` + `dogs` Tabellen, gibt Ergebnisbericht zurück |

Keine rohen CSV-Daten werden dauerhaft gespeichert — nur der Browser hält die Daten im Speicher.

---

### E) Wie der Wizard seinen Zustand verwaltet

Der `ImportWizard` hält einen einzigen State-Block:

| Zustand | Inhalt |
|---------|--------|
| `currentStep` | Aktueller Schritt (1–5) |
| `csvHeaders` | Spaltenköpfe aus der Datei |
| `csvRows` | Alle eingelesenen Zeilen (als Array von Objekten) |
| `mapping` | Zuordnung: Systemfeld → CSV-Spalte |
| `validRows` / `invalidRows` | Nach Validierung aufgeteilt |
| `duplicates` | Antwort des Duplikat-Checks vom Server |
| `duplicateDecisions` | Nutzer-Entscheidungen pro Duplikat |
| `importResult` | Ergebnisbericht nach dem Import |

Kein externer State-Manager nötig — alles in einer Client-Komponente mit `useState`.

---

### F) Zugriffsschutz

Identisches Muster wie `Reporting` und `Benutzerverwaltung`:
- `page.tsx` prüft Nutzer-Rolle serverseitig
- Nicht-Admins werden auf `/dashboard` weitergeleitet
- Sidebar-Eintrag nur sichtbar wenn `user.role === 'admin'`

---

### G) Tech-Entscheidungen

| Entscheidung | Gewählt | Warum |
|---|---|---|
| CSV-Parsing | Browser-seitig (FileReader + manuelle Aufteilung) | Sofortige Rückmeldung ohne Server-Roundtrip; für strukturierte CSVs mit Komma/Semikolon ausreichend |
| Validierung | Browser-seitig (Schritt 3) | Kein Netzwerkverkehr für Pflichtfeld- und Format-Prüfungen nötig |
| Duplikat-Check | Server Action | Erfordert Datenbankzugriff — kann nicht im Browser erfolgen |
| Import-Ausführung | Server Action | Schreibt in DB, muss serverseitig laufen |
| Wizard-Zustand | React `useState` in einer Client-Komponente | Keine globale State-Lösung nötig; Zustand lebt nur für die Dauer des Wizards |
| Kein Rollback bei Fehler | Bewusste Vereinfachung | Teilweise importierte Kunden bleiben erhalten; Ergebnisbericht zeigt was fehlgeschlagen ist — Admin kann manuell nacharbeiten |

---

### H) Neue Pakete

**Optional: `papaparse`** — robuster CSV-Parser für den Browser. Empfohlen, wenn Kundendaten Sonderzeichen, Zeilenumbrüche in Feldern oder uneinheitliche Anführungszeichen enthalten könnten (häufig bei Exporten aus alten Systemen). Alternativ: eigene einfache Aufteilung, die für saubere CSVs ausreicht.

Alle anderen Anforderungen sind mit bereits installierten Tools lösbar.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
