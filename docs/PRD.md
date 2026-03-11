# Product Requirements Document — Hundepension Schmidt CRM

## Vision
Ein internes CRM- und Buchungsverwaltungssystem für die Hundepension Schmidt (Lehrte-Hämelerwald). Das System ermöglicht Mitarbeiterinnen und dem Administrator die vollständige Verwaltung von Kunden, Hunden, Buchungen und Zwingerbelegungen — alles in einer deutschen, browserbasierenden Web-App.

## Target Users
- **Admin (Inhaberin / Gudrun Schmidt):** Vollzugriff inkl. Benutzerverwaltung, Reporting, Import/Export, DSGVO-Funktionen
- **Mitarbeiterinnen:** Vollzugriff auf CRM, Buchungen und Belegungsplan — kein Zugriff auf Benutzerverwaltung

Kein Kundenzugang — das System ist ausschließlich für internes Personal.

## Core Features (Roadmap)

| Priority | ID | Feature | Status |
|----------|----|---------|--------|
| P0 (MVP) | PROJ-1 | Authentifizierung & Benutzerverwaltung | Deployed |
| P0 (MVP) | PROJ-2 | CRM — Kundenverwaltung & Hundedaten | Deployed |
| P0 (MVP) | PROJ-3 | Buchungsmodul | Deployed |
| P0 (MVP) | PROJ-4 | Preiseinstellungen | Deployed |
| P0 (MVP) | PROJ-5 | Belegungsplan | Deployed |
| P1 | PROJ-6 | Dashboard (KPIs + Tagesübersicht) | Deployed |
| P1 | PROJ-7 | Reporting-Dashboard | Deployed |
| P1 | PROJ-8 | CSV-Import Bestandskunden | Planned |
| P1 | PROJ-9 | CSV-Export Kundenliste | Planned |
| P1 | PROJ-10 | PDF-Monatsbericht Buchungen | Planned |
| P2 | PROJ-11 | Warteliste | Planned |
| P2 | PROJ-12 | DSGVO — Einwilligung, Löschung, Datenexport | Planned |
| P2 | PROJ-13 | Audit-Log (Änderungsprotokoll) | Planned |

## Success Metrics
- Alle Bestandskunden (~500–1.000) erfolgreich importiert
- Mitarbeiterinnen können Buchungen und Zwinger ohne Schulung verwalten
- Belegungsplan zeigt Echtzeitauslastung aller 28 aktiven Zwinger
- Admin kann Monatsabschluss als PDF exportieren

## Constraints
- **Stack:** Next.js 16 (App Router), React 19, Supabase, Tailwind CSS — kein shadcn/ui
- **Hosting:** Vercel + Supabase Cloud
- **Sprache:** Deutsche Benutzeroberfläche
- **Mobile:** Desktop-first (Tablet als Minimum, kein Mobile-Fokus)
- **Team:** Solo-Entwicklung mit Claude Code

## Non-Goals
- Kein Kundenzugang / kein Self-Service-Portal für Hundebesitzer
- Keine Mobile App
- Keine automatischen E-Mail-Benachrichtigungen (Phase 1)
- Keine Buchhaltungsintegration (DATEV etc.)
- Keine Mehrsprachigkeit

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
