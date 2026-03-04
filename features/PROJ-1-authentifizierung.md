# PROJ-1: Authentifizierung

## Status: 🟢 Implemented

## Kontext

Internes Tool für Hundepension Schmidt. Kein öffentliches Signup — User werden ausschließlich vom Admin angelegt.

## User Stories

- Als Admin möchte ich neue User-Accounts anlegen, damit Mitarbeiter Zugang zum System erhalten.
- Als Admin möchte ich User-Accounts löschen und Rollen ändern, damit ich Zugänge verwalten kann.
- Als eingeloggter User möchte ich mich mit Email und Passwort anmelden, um das System zu nutzen.
- Als User möchte ich mein Passwort zurücksetzen können, wenn ich es vergessen habe.
- Als eingeloggter User möchte ich mich ausloggen können, damit meine Session sicher beendet wird.

## Acceptance Criteria

- [x] Login mit Email + Passwort via Supabase Auth
- [x] Passwort-Reset per Email-Link (redirectet auf `/passwort-zuruecksetzen`)
- [x] Logout über Sidebar-Button
- [x] Session bleibt nach Browser-Reload erhalten (cookie-basiert)
- [x] Nicht eingeloggte User werden zu `/login` weitergeleitet
- [x] Eingeloggte User auf `/login` werden zu `/dashboard` weitergeleitet
- [x] Admin kann User anlegen, löschen und Rollen vergeben
- [x] Rollenbasierter Zugriff: `requireAdmin()` schützt Admin-Funktionen
- [x] User-Profil muss in `users`-Tabelle existieren, sonst wird Session beendet

## Edge Cases

- User existiert in Supabase Auth aber nicht in `users`-Tabelle → Session wird beendet, Redirect zu `/login`
- Passwort-Reset-Link läuft ab → Supabase zeigt Fehler, User muss neuen Link anfordern
- Admin löscht eigenen Account → nicht explizit verhindert (offener Punkt)
- Passwort kürzer als 8 Zeichen → wird client- und serverseitig abgelehnt

## Technische Anforderungen

- **Auth-Provider:** Supabase Auth (`@supabase/ssr`)
- **Session:** Cookie-basiert, Auto-Refresh via `proxy.ts` (⚠️ Datei muss zu `middleware.ts` umbenannt werden — aktuell inaktiv)
- **Clients:** Browser-Client, Server-Client, Admin-Client (Service Role Key, nur server-seitig)
- **Rate Limiting:** Supabase-Standard (kein zusätzliches App-seitiges Limiting nötig)
- **Registrierung:** Kein Self-Signup — nur Admin erstellt User
- **Produktion URL:** `NEXT_PUBLIC_SITE_URL` wird via Deployment-Env-Variable gesetzt

## Bekannte Offene Punkte

- [ ] `src/proxy.ts` → `src/middleware.ts` umbenennen + Export `proxy` → `middleware` (Session-Refresh und Redirects greifen aktuell nicht auf Middleware-Ebene)
