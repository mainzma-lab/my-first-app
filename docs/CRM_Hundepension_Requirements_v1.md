# CRM Hundepension Schmidt — Requirements Specification

**Version:** 1.0
**Datum:** 03. März 2026
**Zweck:** Vollständige Anforderungsspezifikation für die Entwicklung mit Claude Code

---

## 1. Projektübersicht

### 1.1 Produktbeschreibung
Internes CRM- und Buchungsverwaltungssystem für die Hundepension Schmidt (Lehrte-Hämelerwald). Das System wird ausschließlich von Mitarbeiterinnen und dem Administrator genutzt — kein Kundenzugang.

### 1.2 Tech-Stack
- **Frontend:** Next.js (App Router)
- **Backend/Datenbank:** Supabase (PostgreSQL + Auth + Storage + Row Level Security)
- **Hosting:** Vercel (Frontend) + Supabase Cloud (Backend)
- **Sprache der Benutzeroberfläche:** Deutsch

---

## 2. Authentifizierung & Rollen

### 2.1 Anmeldung
- Login via E-Mail + Passwort (Supabase Auth)
- Kein Self-Registration — Accounts werden vom Admin angelegt
- Passwort-Reset per E-Mail

### 2.2 Rollen
| Rolle | Beschreibung |
|-------|-------------|
| **Admin** | Vollzugriff auf alle Funktionen inkl. Benutzerverwaltung |
| **Mitarbeiter** | Vollzugriff auf CRM, Buchungen, Zwinger, Preise — kein Zugriff auf Benutzerverwaltung |

Beide Rollen können Preise einsehen und ändern. Beide Rollen können alle Daten sehen und bearbeiten.

---

## 3. Datenmodell

### 3.1 Users (Benutzer)
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | UUID, PK | Primärschlüssel |
| email | TEXT, UNIQUE | Login-E-Mail |
| role | ENUM | `admin` \| `mitarbeiter` |
| full_name | TEXT | Anzeigename |
| created_at | TIMESTAMP | Erstellungszeitpunkt |

### 3.2 Customers (Kunden)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| salutation | ENUM | Ja | `Herr` \| `Frau` \| `Divers` |
| first_name_1 | TEXT | Ja | Vorname Person 1 |
| last_name_1 | TEXT | Ja | Nachname Person 1 |
| first_name_2 | TEXT | Nein | Vorname Person 2 |
| last_name_2 | TEXT | Nein | Nachname Person 2 |
| street | TEXT | Ja | Straße + Hausnummer |
| zip | TEXT | Ja | Postleitzahl |
| city | TEXT | Ja | Stadt |
| mobile_phone | TEXT | Ja | Handynummer |
| phone | TEXT | Nein | Festnetznummer |
| email | TEXT | Ja | E-Mail-Adresse |
| customer_since | DATE | Auto | Datum der ersten Buchung |
| referral_source | TEXT | Nein | Wie hat der Kunde von uns erfahren? |
| newsletter_consent | BOOLEAN | Ja | Newsletter-Einwilligung |
| newsletter_consent_date | TIMESTAMP | Auto | Zeitpunkt der Einwilligung |
| status | ENUM | Ja | Siehe Kunden-Status (3.2.1) |
| status_reason | TEXT | Nein | Begründung bei Absage/Stornierung |
| notes | TEXT | Nein | Freitextfeld |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |
| updated_at | TIMESTAMP | Auto | Letzte Änderung |
| created_by | UUID, FK | Auto | Erstellender User |

**Automatisch berechnete Felder (Views/Computed):**
- `total_bookings_pension`: Anzahl Pensionsbuchungen (aus Bookings)
- `total_bookings_daycare`: Anzahl Tagesbetreuungen (aus Bookings)
- `last_stay_date`: Datum des letzten Aufenthalts (aus Bookings)
- `is_new_customer`: Boolean, abgeleitet aus total_bookings = 0

#### 3.2.1 Kunden-Status (Neukunden-Pipeline)
```
Im Prozess
  → Telefonisch nicht erreicht (Rückkehr zu "Im Prozess" möglich)
  → Buchung bestätigt → Neukunde gewonnen
  → Absage durch Kunde (Begründung erforderlich)
  → Absage durch Gudrun (Begründung erforderlich)
  → Termin geändert (neue Buchungsanfrage mit neuem Zeitraum erstellen)
Nach "Buchung bestätigt":
  → Buchung storniert (Grund optional)
```

### 3.3 Dogs (Hunde)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| customer_id | UUID, FK | Ja | Referenz auf Customers |
| name | TEXT | Ja | Hundename |
| breed | TEXT | Ja | Rasse |
| birth_date | DATE | Ja | Geburtsdatum (Alter wird berechnet) |
| gender | ENUM | Ja | `maennlich` \| `weiblich` |
| is_neutered | BOOLEAN | Ja | Kastrationsstatus |
| behavioral_notes | TEXT | Nein | Besondere Verhaltensweisen oder Erkrankungen |
| compatibility_notes | TEXT | Nein | Verträglichkeit mit anderen Hunden |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |
| updated_at | TIMESTAMP | Auto | Letzte Änderung |

**Constraint:** Maximal 4 Hunde pro Kunde.

### 3.4 Dog Documents (Hunde-Dokumente)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| dog_id | UUID, FK | Ja | Referenz auf Dogs |
| document_type | ENUM | Ja | `impfpass` \| `haftpflicht` |
| file_path | TEXT | Ja | Pfad in Supabase Storage |
| file_name | TEXT | Ja | Originaler Dateiname |
| file_size_bytes | INTEGER | Ja | Dateigröße (max. 10 MB = 10.485.760 Bytes) |
| mime_type | ENUM | Ja | `image/jpeg` \| `image/png` \| `application/pdf` |
| uploaded_at | TIMESTAMP | Auto | Upload-Zeitpunkt |
| uploaded_by | UUID, FK | Auto | Hochladender User |

**Validierung:**
- Maximale Dateigröße: 10 MB
- Erlaubte Formate: JPEG, PNG, PDF
- Storage: Supabase Storage Bucket `dog-documents`

### 3.5 Kennels (Zwinger)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| number | INTEGER, UNIQUE | Ja | Zwingernummer (1–30) |
| size | ENUM | Ja | `S` \| `M` \| `L` |
| has_heating | BOOLEAN | Ja | Heizung vorhanden |
| hatch_status | ENUM | Ja | `ja` \| `nein` \| `in_planung` |
| special_note | TEXT | Nein | z.B. "Abstellzwinger", "Lager für Decken" |
| is_active | BOOLEAN | Ja | false für deaktivierte Zwinger |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |

**Seed-Daten (Quelle: Zwingerbeschreibung CSV, abgestimmt):**

| Nr. | Größe | Heizung | Luke | Aktiv | Notiz |
|-----|-------|---------|------|-------|-------|
| 1 | M | Nein | Ja | Ja | — |
| 2 | M | Nein | Ja | Ja | — |
| 3 | M | Nein | Ja | Ja | — |
| 4 | M | Nein | Ja | Ja | — |
| 5 | M | Nein | Ja | Ja | — |
| 6 | L | Ja | Ja | Ja | — |
| 7 | L | Nein | Ja | Ja | — |
| 8 | L | Nein | Ja | Ja | — |
| 9 | L | Ja | Ja | Ja | — |
| 10 | L | Ja | In Planung | Ja | — |
| 11 | L | Nein | In Planung | Ja | — |
| 12 | M | Nein | Nein | Ja | — |
| 13 | M | Nein | Nein | Ja | — |
| 14 | S | Nein | Nein | Ja | — |
| 15 | S | Ja | Nein | Ja | — |
| 16 | M | Ja | Nein | Ja | — |
| 17 | M | Ja | Nein | Ja | — |
| 18 | M | Ja | Nein | Ja | — |
| 19 | M | Ja | Nein | Ja | — |
| 20 | M | Nein | Nein | **Nein** | Abstellzwinger |
| 21 | M | Ja | Nein | Ja | — |
| 22 | M | Nein | Nein | Ja | — |
| 23 | M | Nein | Nein | Ja | — |
| 24 | M | Nein | Nein | Ja | — |
| 25 | M | Nein | Nein | Ja | — |
| 26 | M | Nein | Nein | Ja | — |
| 27 | M | Nein | Nein | Ja | — |
| 28 | M | Nein | Nein | Ja | — |
| 29 | M | Nein | Nein | Ja | — |
| 30 | M | Nein | Nein | **Nein** | Lager für Decken |

### 3.6 Bookings (Buchungen)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| customer_id | UUID, FK | Ja | Referenz auf Customers |
| booking_type | ENUM | Ja | `uebernachtung` \| `tagesbetreuung_flexibel` \| `tagesbetreuung_regelmaessig` |
| start_date | DATE | Ja | Startdatum (Bringtag) |
| end_date | DATE | Ja | Enddatum (Abholtag) |
| duration_days | INTEGER | Auto | Berechnet: end_date - start_date + 1 |
| number_of_dogs | INTEGER | Auto | Aus Booking_Dogs Tabelle |
| total_price | DECIMAL(10,2) | Auto | Berechnet aus Preislogik |
| medication_notes | TEXT | Nein | Welche Medikamente? |
| medication_schedule | TEXT | Nein | Wann Medikamente geben? |
| items_list | TEXT | Nein | Mitgebrachte Gegenstände |
| notes | TEXT | Nein | Freitextfeld für Anmerkungen |
| status | ENUM | Ja | `geplant` \| `aktiv` \| `abgeschlossen` \| `storniert` |
| cancellation_date | DATE | Nein | Datum der Stornierung |
| cancellation_fee | DECIMAL(10,2) | Auto | Berechnet aus Stornierungsbedingungen |
| cancellation_reason | TEXT | Nein | Grund der Stornierung |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |
| updated_at | TIMESTAMP | Auto | Letzte Änderung |
| created_by | UUID, FK | Auto | Erstellender User |

### 3.7 Booking Dogs (Buchung-Hunde-Zuordnung)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| booking_id | UUID, FK | Ja | Referenz auf Bookings |
| dog_id | UUID, FK | Ja | Referenz auf Dogs |

**Constraint:** Nur Hunde des gebuchten Kunden dürfen zugeordnet werden.

### 3.8 Booking Kennels (Buchung-Zwinger-Zuordnung)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| booking_id | UUID, FK | Ja | Referenz auf Bookings |
| kennel_id | UUID, FK | Ja | Referenz auf Kennels |

**Constraints:**
- Maximal 2 Hunde pro Zwinger gleichzeitig
- Keine doppelte Belegung: Kein Zwinger darf im selben Zeitraum von zwei verschiedenen Buchungen belegt werden (es sei denn, selber Kunde mit 2 Hunden)
- Nur aktive Zwinger (`is_active = true`) dürfen zugewiesen werden

### 3.9 Prices (Preise)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| service_type | ENUM | Ja | `uebernachtung` \| `tagesbetreuung_flexibel` \| `tagesbetreuung_regelmaessig` |
| dog_count | INTEGER | Ja | 1 oder 2 |
| frequency | ENUM | Nein | `1x_woche` \| `2x_woche` (nur bei regelmäßig) |
| price_amount | DECIMAL(10,2) | Ja | Preis in Euro |
| is_monthly | BOOLEAN | Ja | true = Monatspreis, false = Tagespreis |
| valid_from | DATE | Ja | Gültig ab |
| valid_to | DATE | Nein | null = aktuell gültig |
| created_by | UUID, FK | Auto | Erstellender User |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |

**Initiale Preise:**

| Leistung | Hunde | Frequenz | Preis | Einheit |
|----------|-------|----------|-------|---------|
| Übernachtung | 1 | — | 38,00 € | pro Tag |
| Übernachtung | 2 | — | 58,00 € | pro Tag |
| Flexible Tagesbetreuung | 1 | — | 30,00 € | pro Tag |
| Flexible Tagesbetreuung | 2 | — | 40,00 € | pro Tag |
| Regelmäßige Tagesbetreuung | 1 | 1x/Woche | 115,00 € | pro Monat |
| Regelmäßige Tagesbetreuung | 1 | 2x/Woche | 225,00 € | pro Monat |
| Regelmäßige Tagesbetreuung | 2 | 1x/Woche | **manuell eintragen** | pro Monat |
| Regelmäßige Tagesbetreuung | 2 | 2x/Woche | **manuell eintragen** | pro Monat |

### 3.10 Waitlist (Warteliste)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| customer_id | UUID, FK | Ja | Referenz auf Customers |
| desired_start_date | DATE | Ja | Gewünschter Starttermin |
| desired_end_date | DATE | Ja | Gewünschter Endtermin |
| number_of_dogs | INTEGER | Ja | Anzahl Hunde |
| booking_type | ENUM | Ja | `uebernachtung` \| `tagesbetreuung_flexibel` |
| notes | TEXT | Nein | Anmerkungen |
| status | ENUM | Ja | `wartend` \| `kontaktiert` \| `gebucht` \| `abgesagt` |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |
| created_by | UUID, FK | Auto | Erstellender User |

### 3.11 GDPR Consent Log (DSGVO-Einwilligungsprotokoll)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| customer_id | UUID, FK | Ja | Referenz auf Customers |
| consent_type | ENUM | Ja | `newsletter` \| `datenverarbeitung` |
| consented | BOOLEAN | Ja | Einwilligung erteilt/widerrufen |
| consent_date | TIMESTAMP | Ja | Zeitpunkt |
| notes | TEXT | Nein | Zusätzliche Informationen |
| created_at | TIMESTAMP | Auto | Erstellungszeitpunkt |

### 3.12 Audit Log (Änderungsprotokoll)
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| id | UUID, PK | Ja | Primärschlüssel |
| user_id | UUID, FK | Ja | User der die Änderung vorgenommen hat |
| action | ENUM | Ja | `create` \| `update` \| `delete` |
| entity_type | TEXT | Ja | z.B. `customers`, `dogs`, `bookings` |
| entity_id | UUID | Ja | ID des betroffenen Datensatzes |
| old_values | JSONB | Nein | Werte vor der Änderung |
| new_values | JSONB | Nein | Werte nach der Änderung |
| created_at | TIMESTAMP | Auto | Zeitpunkt der Änderung |

---

## 4. Preisberechnung

### 4.1 Grundregel
Preise werden pro **angefangenem Tag** berechnet. Bring- und Abholtag zählen jeweils als voller Tag. Eine Übernachtung = 2 Tage.

### 4.2 Formel
```
duration_days = end_date - start_date + 1
total_price = duration_days × Tagespreis(service_type, number_of_dogs)
```

Für regelmäßige Tagesbetreuung gilt der Monatspreis direkt (keine Tagesberechnung).

### 4.3 Preishistorie
Preise werden versioniert über `valid_from` / `valid_to`. Bei der Buchung wird der zum Buchungszeitpunkt gültige Preis verwendet und als `total_price` gespeichert. Nachträgliche Preisänderungen wirken sich nicht auf bestehende Buchungen aus.

---

## 5. Stornierungslogik

### 5.1 Stornierungsbedingungen
| Zeitraum vor Betreuungsbeginn | Gebühr |
|-------------------------------|--------|
| Mehr als 30 Tage | 0% (kostenlos) |
| 30 bis 15 Tage | 25% des Gesamtpreises |
| 14 bis 7 Tage | 50% des Gesamtpreises |
| 6 bis 3 Tage | 75% des Gesamtpreises |
| 2 Tage oder weniger | 100% des Gesamtpreises |

### 5.2 Berechnungsregel
- Der Tag des Stornierungseingangs wird **mitgezählt**
- Der Betreuungsbeginn (start_date) wird **nicht mitgezählt**
- `days_before = start_date - cancellation_date` (ohne start_date, mit cancellation_date)
- `cancellation_fee = total_price × Prozentsatz(days_before)`

### 5.3 UI-Verhalten
- Stornierte Buchungen werden farblich hervorgehoben (z.B. rot/grau)
- Stornierungsgebühr wird automatisch berechnet und angezeigt
- Filter-Option: "Stornierte Buchungen anzeigen/ausblenden"
- Stornierungsgrund als Freitextfeld

---

## 6. Zwinger-Kapazitätslogik

### 6.1 Belegungsregeln
- 30 Zwinger insgesamt (28 aktiv; Zwinger 20 = Abstellzwinger, Zwinger 30 = Lager für Decken)
- Maximal 2 Hunde pro Zwinger (nur Hunde desselben Kunden)
- Zwingerzuweisung erfolgt **manuell** durch Mitarbeiter
- System prüft auf Konflikte und verhindert Doppelbelegung

### 6.2 Warteliste
Wenn alle Zwinger im gewünschten Zeitraum belegt sind:
- System zeigt Warnung "Keine freien Zwinger im Zeitraum X–Y"
- Option: Kunde auf Warteliste setzen
- Wenn ein Zwinger frei wird (z.B. durch Stornierung): Dashboard zeigt Benachrichtigung mit Link zur Warteliste

---

## 7. Dashboard

### 7.1 Kennzahlen (KPIs)
- Zwingerauslastung: Tag, Woche, Monat, Jahr (Prozent + Visualisierung)
- Monatsumsatz (aktueller Monat)
- Jahresumsatz (aktuelles Jahr)
- Anzahl erfasster Kunden
- Anzahl erfasster Hunde

### 7.2 Schnellaktionen
- Button: "Kunde anlegen"
- Button: "Buchung anlegen"

### 7.3 Tagesübersicht
- **Heute — Ankünfte:** Welche Hunde werden heute gebracht? (Kundename, Hundename, Zwinger)
- **Heute — Abholungen:** Welche Hunde werden heute abgeholt?
- **Morgen — Ankünfte:** Welche Hunde kommen morgen an?
- **Morgen — Abholungen:** Welche Hunde werden morgen abgeholt?

### 7.4 Benachrichtigungen
- Wartelisten-Einträge, die bedient werden können (freie Zwinger)
- Überfällige Abholungen (Hund wurde nicht abgeholt)

---

## 8. CRM — Kundenverwaltung

### 8.1 Funktionen
- Kunden anlegen, bearbeiten, suchen
- Kundenstatus verwalten (Neukunden-Pipeline)
- Hunde zum Kunden hinzufügen (max. 4)
- Dokumente zu Hunden hochladen (Impfpass, Haftpflicht)
- Buchungshistorie pro Kunde einsehen
- CSV-Import für Kunden- und Hundedaten (Massenanlage)
- CSV-Export von Kundendaten
- Suchfunktion über alle Kundenfelder

### 8.2 Kundenansicht (Detail)
- Kontaktdaten
- Hunde mit Dokumenten
- Buchungsübersicht (vergangene + geplante)
- Status-Historie
- Notizen

---

## 9. Buchungs- und Zwingerverwaltung

### 9.1 Buchungsansichten

#### Listenansicht
- Tabellarische Auflistung aller Buchungen
- Sortierbar nach: Startdatum, Kunde, Status, Zwinger
- Filterbar nach: Kunde, Buchungstyp, Zwinger, Status, Zeitraum
- Suchfunktion nach Kundennamen

#### Grid-Ansicht (Belegungsplan)
- X-Achse: Tage (scrollbar)
- Y-Achse: Zwinger 1–30
- Buchungen als farbige Balken
- Heutiger Tag: mittig positioniert + farblich hervorgehoben
- Nahtloser Übergang zwischen Monaten
- Umschalten zwischen Tag-, Wochen- und Monatsansicht
- Datumsauswahl für Schnellnavigation
- "Heute"-Button

#### Zwingeransicht (Draufsicht)
- Visuelle Darstellung des Grundrisses
- Zwinger farblich markiert: frei / belegt / teilbelegt
- Beim Hovern/Klicken: Details zur aktuellen Belegung

### 9.2 Interaktionen
- **Buchung anlegen:** Über Button ODER Klick in Grid-Zelle
- **Drag & Drop:** Buchungsbalken im Grid verschieben (Zwinger ändern)
- **Resize:** Buchungsbalken am Ende ziehen = Aufenthalt verlängern/verkürzen → Enddatum, Dauer und Preis werden automatisch angepasst
- **Hover:** Buchungsdetails als Tooltip anzeigen
- **Klick:** Buchungsdetail-Modal öffnen

### 9.3 Buchungsformular
Felder:
- Kunde auswählen (Dropdown mit Suche, aus Kundenverwaltung)
- Hunde auswählen (aus Hunden des Kunden)
- Buchungstyp (Übernachtung / Flexible Tagesbetreuung / Regelmäßige Tagesbetreuung)
- Startdatum + Enddatum (Datepicker)
- Dauer in Tagen (auto-berechnet)
- Preis (auto-berechnet, manuell überschreibbar)
- Zwinger zuweisen (Dropdown, nur freie + aktive Zwinger im Zeitraum)
- Medikamente (Freitext)
- Medikamentenzeitplan (Freitext)
- Gegenstandsliste (Freitext)
- Anmerkungen (Freitext)

---

## 10. Reporting & Analyse

### 10.1 Dashboard-Berichte
- Zwingerauslastung: Tages-/Wochen-/Monats-/Jahresansicht (Balken-/Liniendiagramm)
- Umsatzentwicklung: Monat für Monat + Jahresvergleich
- Kundenwachstum: Neue Kunden pro Monat/Quartal/Jahr
- Buchungsvolumen: Anzahl Buchungen pro Zeitraum

### 10.2 Detailberichte
- Auslastungsquote pro Zwinger (welche Zwinger sind am beliebtesten/unbeliebtesten?)
- Umsatz pro Kunde (Top-Kunden)
- Durchschnittliche Aufenthaltsdauer
- Stornierungsquote + Stornierungsgebühren-Einnahmen
- Vergleich zum Vorjahreszeitraum (YoY)
- Saisonale Trends (welche Monate sind am stärksten?)
- Verteilung: Übernachtung vs. Tagesbetreuung

### 10.3 Export
- Buchungsübersichten als CSV und Excel
- Kundenlisten als CSV
- PDF-Export für Buchungsübersichten (z.B. Monatsabschluss)

---

## 11. DSGVO / Datenschutz

### 11.1 Einwilligungsdokumentation
- Jede Einwilligung (Newsletter, Datenverarbeitung) wird mit Zeitstempel protokolliert
- Widerruf wird ebenfalls protokolliert
- Einwilligungsstatus ist in der Kundenansicht sichtbar

### 11.2 Löschkonzept
- Kundendaten können auf Anfrage gelöscht werden (Recht auf Löschung)
- Vor dem Löschen: Warnung + Bestätigung
- Buchungsdaten werden anonymisiert (nicht gelöscht) — für Umsatzberichte
- Audit-Log bleibt erhalten (anonymisiert)

### 11.3 Datenexport (Betroffenenrechte)
- Export aller gespeicherten Daten eines Kunden als JSON oder CSV
- Enthält: Kontaktdaten, Hundedaten, Buchungshistorie, Einwilligungen
- Zugänglich über die Kundenansicht (Button "Daten exportieren")

### 11.4 Audit-Trail
- Alle Änderungen an Kunden-, Hunde- und Buchungsdaten werden protokolliert
- Wer hat wann was geändert (alter Wert → neuer Wert)
- Nur für Admin einsehbar

---

## 12. CSV-Import

### 12.1 Kunden-Import
- CSV-Upload mit Mapping-Schritt (Spalten zuordnen)
- Validierung vor dem Import (Pflichtfelder prüfen, Duplikate erkennen)
- Vorschau der zu importierenden Daten
- Fehlerbericht nach Import

### 12.2 Hunde-Import
- Hunde können mit Kunden-Referenz importiert werden
- Zuordnung über Kunden-E-Mail oder Kundennummer

---

## 13. User Experience — Zusammenfassung

- Reine Webanwendung, responsive (Desktop + Tablet + Mobil)
- Deutsche Benutzeroberfläche
- Kein Kundenzugang — nur internes Personal
- Login-geschützt
- Buchung anlegen: per Button und per Klick ins Grid
- Drag & Drop im Grid für Buchungsverlängerung/-verschiebung
- Hover-Details für Buchungen
- Schnellnavigation per Datumsauswahl + "Heute"-Button
- CSV-Import und -Export
- PDF/Excel-Export für Berichte

---

## 14. Offene Punkte (vor Entwicklung klären)

1. ~~**Zwinger-Seed-Daten:**~~ ✅ Erledigt — CSV mit korrekten Daten liegt vor
2. **Preise regelmäßige Tagesbetreuung (2 Hunde):** Monatspreis für 1x/Woche und 2x/Woche festlegen
3. ~~**Hosting-Details:**~~ ✅ Erledigt — Supabase + VS Code + Claude Code aufgesetzt
4. **E-Mail-Konfiguration:** Wird ein E-Mail-Provider für Passwort-Reset benötigt? (Supabase bietet Built-in, aber begrenzt)
5. **Bestehende Kundendaten:** ~500–1000 Kunden müssen importiert werden. Geplanter Zeitpunkt: **nach Fertigstellung der Datenbankstruktur** (CSV-Import-Funktion wird im System bereitgestellt)
6. ~~**Backup-Strategie:**~~ ✅ Erledigt — Supabase Standard-Backups reichen aus

## 15. Entwicklungsplan — Empfohlene Reihenfolge

1. **Phase 1 — Datenbank:** Supabase-Schema erstellen (Tabellen, Enums, RLS, Seed-Daten für Zwinger + Preise)
2. **Phase 2 — Auth:** Login, Rollen, Benutzerverwaltung
3. **Phase 3 — CRM:** Kundenverwaltung + Hundedaten + Dokumenten-Upload
4. **Phase 4 — Buchungen:** Buchungsformular, Preisberechnung, Stornierungslogik
5. **Phase 5 — Grid/Kalender:** Belegungsplan mit Drag & Drop, Zwingeransicht
6. **Phase 6 — Dashboard:** KPIs, Tagesübersicht, Benachrichtigungen
7. **Phase 7 — Reporting:** Historische Berichte, Vergleiche, Exports
8. **Phase 8 — Import/Export:** CSV-Import (inkl. Bestandskunden), CSV/Excel/PDF-Export
9. **Phase 9 — DSGVO:** Einwilligungsdokumentation, Löschkonzept, Datenexport
10. **Phase 10 — Polish:** Warteliste, Audit-Log, UX-Feinschliff, Mobile-Optimierung
