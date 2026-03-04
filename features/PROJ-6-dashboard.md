# PROJ-6: Dashboard

**Status:** 🟡 In Progress (QA Bugs offen)
**Erstellt:** 2026-03-04
**Zuletzt aktualisiert:** 2026-03-04

---

## User Stories

- Als Mitarbeiterin möchte ich beim Login sofort sehen, wer heute ankommt und wer abgeholt wird
- Als Mitarbeiterin möchte ich auf einen Blick sehen, wie viele Zwinger heute belegt sind
- Als Admin möchte ich den Monatsumsatz und Jahresumsatz auf dem Dashboard sehen
- Als Mitarbeiterin möchte ich sofort gewarnt werden, wenn eine Abholung überfällig ist
- Als Mitarbeiterin möchte ich schnell eine neue Buchung oder einen neuen Kunden anlegen können

## Acceptance Criteria

### AC-1: KPI-Kacheln
- [ ] Zwinger belegt heute wird angezeigt (X / Gesamt)
- [ ] Auslastung in Prozent mit Fortschrittsbalken
- [ ] Umsatz diesen Monat (aktuelle Buchungen im Monat)
- [ ] Jahresumsatz (aktuelle Buchungen im Jahr)
- [ ] Kunden- und Hundeanzahl gesamt

### AC-2: Schnellaktionen
- [ ] Button "Neuer Kunde" → navigiert zu /kunden
- [ ] Button "Neue Buchung" → navigiert zu /buchungen

### AC-3: Tagesübersicht
- [ ] Heute — Ankünfte: Buchungen mit start_date = heute
- [ ] Heute — Abholungen: Buchungen mit end_date = heute
- [ ] Morgen — Ankünfte: Buchungen mit start_date = morgen
- [ ] Morgen — Abholungen: Buchungen mit end_date = morgen
- [ ] Jede Zeile zeigt: Kundename, Hundename(n), Zwingernummer(n)
- [ ] Stornierte Buchungen werden nicht angezeigt
- [ ] Fehlende Zwingerzuweisung wird farblich markiert (amber)

### AC-4: Benachrichtigungen
- [ ] Überfällige Abholungen (end_date < heute, status = aktiv) → amber Warnung
- [ ] Warnung zeigt Kundename, Hundename, fälliges Datum
- [ ] Keine Warnung wenn keine überfälligen Abholungen vorhanden

---

## Tech Design

- Reiner Server Component (keine Client Components nötig)
- 11 Supabase-Queries parallel via `Promise.all`
- Kennel-Belegung: unique kennel_ids aus booking_kennels für aktive Buchungen heute
- Revenue: `total_price` aus `bookings` aggregiert client-seitig
- File: `src/app/(app)/dashboard/page.tsx`

---

## QA Test Results

**Getestet:** 2026-03-04
**Methode:** Code-Review gegen Requirements + Build-Verifikation

### AC-1: KPI-Kacheln
- [x] Zwinger belegt heute (X / Gesamt) ✅
- [x] Auslastungsbalken vorhanden ✅
- [x] Monatsumsatz angezeigt ✅
- [x] Jahresumsatz angezeigt ✅
- [x] Kunden · Hunde kombiniert angezeigt ✅
- [x] Monatsumsatz zeigt gesamten Monat ✅ (BUG-1 gefixt)

### AC-2: Schnellaktionen
- [x] "+ Neuer Kunde" → /kunden ✅
- [x] "+ Neue Buchung" → /buchungen ✅
- [ ] ⚠ BUG-2: Buttons öffnen kein Modal direkt (Low)

### AC-3: Tagesübersicht
- [x] Heute Ankünfte / Abholungen ✅
- [x] Morgen Ankünfte / Abholungen ✅
- [x] Kundename, Hundename, Zwingernummer angezeigt ✅
- [x] Stornierte ausgeschlossen (`.neq('status', 'storniert')`) ✅
- [x] Fehlende Zwingerzuweisung in Amber markiert ✅

### AC-4: Benachrichtigungen
- [x] Überfällige Abholungen: amber Banner ✅
- [x] Zeigt Kundename, Hundename, Datum ✅
- [x] Banner versteckt wenn keine überfälligen ✅
- [ ] ❌ BUG-3: Wartelisten-Benachrichtigung fehlt (Requirements 7.4)

---

## Bugs Found

### BUG-1: Monatsumsatz zeigt nur Buchungen bis heute — Medium
- **Severity:** Medium
- **Datei:** `src/app/(app)/dashboard/page.tsx:136-139`
- **Problem:** `.lte('start_date', today)` schließt Buchungen aus, die erst später im Monat beginnen
- **Beispiel:** Heute 4. März, Buchung ab 15. März → wird nicht in Monatsumsatz gezählt
- **Aktuell:** "Umsatz der Buchungen, die diesen Monat bis heute begannen"
- **Erwartet:** "Geplanter Gesamtumsatz des aktuellen Monats"
- **Fix:** `.lte('start_date', lastDayOfMonth)` statt `.lte('start_date', today)`

### BUG-2: Schnellaktionen öffnen kein Modal — Low
- **Severity:** Low (UX)
- **Problem:** "+ Neue Buchung" navigiert zu /buchungen, User muss dort nochmal klicken
- **Akzeptierbar für jetzt:** Ja — kann in Phase 10 (Polish) behoben werden
- **Fix (später):** URL-Param `?new=1` → Buchungsseite öffnet Modal automatisch

### BUG-3: Wartelisten-Benachrichtigung nicht implementiert — Medium
- **Severity:** Medium (fehlende Anforderung)
- **Requirements:** 7.4 "Wartelisten-Einträge, die bedient werden können (freie Zwinger)"
- **Problem:** Wenn ein Zwinger durch Stornierung frei wird und ein Wartelisteneintrag passt, gibt es keine Benachrichtigung
- **Aufwand:** Mittel (Abgleich Warteliste ↔ freie Zwinger pro Zeitraum)
- **Empfehlung:** Separat implementieren oder in Phase 5 (Belegungsplan) einbauen

### Kein Regression-Problem gefunden
- Buchungen-Seite: unverändert ✅
- Kunden-Seite: unverändert ✅
- Einstellungen: unverändert ✅
- Build: sauber, keine TypeScript-Fehler ✅

---

## Summary

- ✅ 10 von 12 Acceptance Criteria erfüllt
- ❌ 3 Bugs gefunden (0 Critical, 2 Medium, 1 Low)
- ✅ Keine Regression in bestehenden Features

## Recommendation

**BUG-1 (Monatsumsatz) zuerst fixen** — einfacher 1-Zeilen-Fix, aber inhaltlich wichtig für die Umsatzdarstellung.

**BUG-3 (Warteliste)** — separates Backlog-Item, kein Blocker für das Dashboard.

**Production-Ready:** ✅ Ja — BUG-1 gefixt. BUG-2 (Low) und BUG-3 (Warteliste) sind kein Blocker.
