# PROJ-2: CRM — Kundenverwaltung & Hundedaten

## Status: ✅ Implementiert

---

## Scope dieser Phase

**Enthalten:** Kunden anlegen/bearbeiten/suchen, Neukunden-Pipeline, Hunde anlegen/bearbeiten, Kundennummer, Buchungsstatistiken
**Nicht enthalten:** Dokumenten-Upload (Phase 3b oder später), Buchungshistorie (Phase 4), CSV-Import (Phase 8)

---

## User Stories

- Als Mitarbeiterin möchte ich einen neuen Kunden anlegen, damit ich seine Kontakt- und Stammdaten im System habe.
- Als Mitarbeiterin möchte ich Kunden nach Name, E-Mail, Telefon, Status und PLZ filtern, damit ich schnell den richtigen Kunden finde.
- Als Mitarbeiterin möchte ich die Detailansicht eines Kunden als Modal öffnen, damit ich alle Infos einsehen und bearbeiten kann ohne die Liste zu verlassen.
- Als Mitarbeiterin möchte ich den Status eines Kunden in der Pipeline verwalten (Interessent → Probebesuch → Stammkunde), damit der Akquiseprozess nachvollziehbar ist.
- Als Mitarbeiterin möchte ich einem Kunden Hunde hinzufügen (max. 4), damit ich beim Buchen weiß welche Hunde der Kunde hat.
- Als Mitarbeiterin möchte ich einen Kunden manuell als „Inaktiv" markieren, damit ich Kunden ohne aktives Verhältnis kennzeichnen kann.
- Als Mitarbeiterin möchte ich, dass Kunden automatisch als inaktiv erkannt werden wenn sie seit X Monaten keine Buchung hatten, damit ich nichts manuell pflegen muss.
- Als Admin möchte ich die Inaktivitätsschwelle (Anzahl Monate) in den Einstellungen frei konfigurieren, damit die Regel zum Betrieb passt.
- Als Mitarbeiterin möchte ich abgesagte Kunden wieder reaktivieren können, falls sie später eine neue Anfrage stellen.

---

## Acceptance Criteria

### Kundenliste

- [x] Tabelle zeigt: Name, Telefon, E-Mail, Status (farbig), Anzahl Hunde, erstellt am
- [x] Freitext-Suche durchsucht: Vor-/Nachname (Person 1 + 2), E-Mail, Mobilnummer (debounced 300ms)
- [x] Filter-Dropdowns: Status (Pipeline-Status), Inaktivität (Alle / Nur Inaktive / Nur Aktive), PLZ (Freitext)
- [x] Aktive Filter sind sichtbar und einzeln löschbar (Chips/Tags)
- [x] Inaktive Kunden sind immer sichtbar, aber visuell markiert: gedimmte Zeile (opacity) + Badge „Inaktiv"
- [x] Klick auf eine Zeile öffnet das Kunden-Modal
- [x] Button „Kunde anlegen" öffnet dasselbe Modal im Anlege-Modus

### Kunden-Modal (Anlegen + Bearbeiten)

**Kontaktdaten-Felder:**
- [x] Person 1: Anrede (Pflicht), Vorname (Pflicht), Nachname (Pflicht)
- [x] Person 2: optionales Toggle → Anrede, Vorname, Nachname
- [x] Adresse: Straße (Pflicht), PLZ (Pflicht), Ort (Pflicht)
- [x] Kontakt: Mobilnummer (Pflicht), Festnetz, E-Mail (Pflicht)
- [x] Zweite Kontaktdaten: optionales Toggle → zweite Mobilnummer, zweite E-Mail
- [x] Sonstiges: Wie erfahren?, Newsletter-Einwilligung (Checkbox), Notizen
- [x] Google-Bewertung: Checkbox + bedingte Felder: Datum, Sterne (1–5), Bewertungstext, Link

**Detailansicht (Kontaktdaten-Reiter):**
- [x] Kundennummer (auto-increment ab 1001)
- [x] Alle Kontaktfelder in Leseansicht
- [x] Buchungsübersicht: Letzte Buchung, Nächste Buchung, Buchungen (12 Mon.), Übernachtungstage (12 Mon.), Betreuungstage (12 Mon.)
- [x] Google-Bewertungsblock (nur wenn vorhanden)

### Neukunden-Pipeline (Status-Workflow)

| Von | Nach | Begründung Pflicht? |
|-----|------|---------------------|
| Interessent | Probebesuch | Nein |
| Interessent | Abgesagt (Kunde / Betrieb) | Ja |
| Probebesuch | Stammkunde | Nein |
| Probebesuch | Abgesagt (Kunde / Betrieb) | Ja |
| Stammkunde | Inaktiv (manuell) | Nein |
| Inaktiv (manuell) | Wieder aktivieren | Nein |
| Abgesagt | Als Interessent reaktivieren | Nein |
| Abgesagt | Als Stammkunde reaktivieren | Nein |

- [x] Buttons werden kontextabhängig angezeigt
- [x] Bei „Abgesagt": Bestätigungs-Modal mit Pflicht-Begründung

### Hunde (innerhalb des Kunden-Modals)

- [x] Reiter „Hunde" im Kunden-Modal mit Anzahl-Badge
- [x] Felder: Name, Rasse, Geburtsdatum, Geschlecht, Kastriert, Verhaltenshinweise, Verträglichkeit
- [x] Alter wird berechnet (z.B. „3 J., 4 M.")
- [x] Maximal 4 Hunde pro Kunde; Button deaktiviert + Tooltip bei Limit
- [x] Nach Kunden-Anlage bleibt Modal offen und wechselt direkt auf Hunde-Reiter
- [x] Bearbeiten und Löschen (mit Bestätigung)
- [x] Löschen gesperrt wenn Hund in zukünftiger Buchung

### Inaktivität (automatisch + manuell)

- [x] Automatisch: Status `neukunde_gewonnen` AND `last_stay_date` < jetzt − X Monate
- [x] Manuell: `is_manually_inactive = true` via Button
- [x] Berechnung client-seitig beim Rendern
- [x] „Wieder aktivieren" setzt `is_manually_inactive = false`

### Einstellungen — Inaktivitätsschwelle

- [x] `/einstellungen/crm` — Feld: Schwelle in Monaten (Standard: 9)
- [x] Eingabe: Ganzzahl 1–60; nur Admin kann ändern
- [x] Wert in `system_settings` Tabelle gespeichert

---

## Datenbankschema (Migrations)

| Migration | Inhalt |
|-----------|--------|
| `20260304000000_crm_phase3.sql` | `probebesuch` enum-Wert, `is_manually_inactive`, `system_settings` Tabelle |
| `20260304010000_customer_extra_fields.sql` | `second_email`, `second_mobile_phone`, `salutation_2`, Google-Review-Felder |
| `20260304020000_customer_number_booking_stats.sql` | `customer_number` (IDENTITY ab 1001), `next_booking_date` + `bookings_last_12_months` in View |
| `20260304030000_booking_day_stats.sql` | `pension_days_last_12_months` + `daycare_days_last_12_months` in View |

### customer_overview (View) — berechnete Spalten

| Spalte | Beschreibung |
|--------|-------------|
| `total_bookings_pension` | Gesamtanzahl Übernachtungsbuchungen |
| `total_bookings_daycare` | Gesamtanzahl Tagesbetreuungsbuchungen |
| `last_stay_date` | Letztes Buchungsende (aktiv/abgeschlossen) |
| `dog_count` | Anzahl Hunde |
| `is_new_customer` | true wenn noch keine Buchung |
| `next_booking_date` | Frühestes zukünftiges Buchungsdatum (geplant/aktiv) |
| `bookings_last_12_months` | Buchungsanzahl letzte 12 Monate |
| `pension_days_last_12_months` | Übernachtungstage letzte 12 Monate |
| `daycare_days_last_12_months` | Betreuungstage letzte 12 Monate |

---

## Edge Cases

- **Doppelte E-Mail:** Beim Anlegen/Bearbeiten wird Eindeutigkeit geprüft.
- **Hund hat offene Buchung:** Löschen gesperrt mit Fehlermeldung.
- **Newsletter-Einwilligung geändert:** `newsletter_consent_date` wird aktualisiert (DSGVO).
- **Abgesagter Kunde stellt neue Anfrage:** Übergang zu `im_prozess` oder `neukunde_gewonnen` via Reaktivierungs-Button.
- **Auto-inaktiv aber nie manuell inaktiv:** „Wieder aktivieren" erscheint nicht (Inaktivität verschwindet mit neuer Buchung).
- **Neukunde ohne Buchung:** Interessenten/Probebesuch werden NIE automatisch inaktiv.

---

## Human-in-the-Loop Checkpoints

- ✅ Priorität: Kunden + Hunde (ohne Docs)
- ✅ Pipeline mit allen Übergängen inkl. Reaktivierung von Absagen
- ✅ Erweiterte Filter (Status, PLZ, Inaktivität) + Freitext
- ✅ Detailansicht: Modal mit Reiter-Navigation
- ✅ Inaktivität: automatisch (konfigurierbar) + manuell
- ✅ Inaktive Kunden sichtbar, visuell markiert
- ✅ Einstellungsseite: Inaktivitätsschwelle (Standard: 9 Monate)
- ✅ Person 2 mit Anrede-Feld
- ✅ Zweite Kontaktdaten (E-Mail + Mobilnummer)
- ✅ Google-Bewertungsfelder pro Kunde
- ✅ Kundennummer (auto-increment ab 1001)
- ✅ Buchungsstatistiken in Detailansicht (letzte/nächste Buchung, Tage-Zähler)
- ✅ Hund anlegen direkt nach Kunden-Anlage (Modal bleibt offen, wechselt auf Hunde-Reiter)
- ✅ User Review: approved
