

## Plan: Verlof uitbreiden met filters, werkroosters en uren-verlof

### 1. Database wijzigingen

**Tabel `leave_requests` uitbreiden:**
- `start_time` (time, nullable) — bijv. "09:00" voor een tandarts om 9u
- `end_time` (time, nullable) — bijv. "11:00"
- `is_partial_day` (boolean, default false) — snelle indicator voor deeldag-verlof

Als `start_time`/`end_time` NULL zijn → hele dag(en). Als ze ingevuld zijn → specifieke uren op die dag.

**Nieuwe tabel `work_schedules`:**
```text
work_schedules
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── day_of_week (int, 0=ma, 1=di, ..., 6=zo)
├── start_time (time, bijv. "08:00")
├── end_time (time, bijv. "17:00")
├── is_working_day (boolean, default true)
├── break_minutes (int, default 30)
├── division_id (uuid, nullable)
├── created_at / updated_at
└── UNIQUE(user_id, day_of_week)
```

RLS: gebruikers lezen eigen rooster + managers lezen alles. Managers/admins mogen schrijven.

### 2. Verlofpagina: filters en sortering

Filterbalk toevoegen boven de lijst:
- **Status filter** (select): Alle / Aangevraagd / Goedgekeurd / Afgekeurd
- **Type filter** (select): Alle / Vakantie / Ziekte / Bijzonder / Onbetaald
- **Medewerker filter** (alleen voor managers): dropdown met profielnamen
- **Sorteer** (select): Datum (nieuw→oud) / Datum (oud→nieuw) / Naam A-Z

Filtering is client-side op de bestaande data (lijst is klein genoeg).

### 3. Aanvraagdialog: uren-verlof ondersteuning

Checkbox "Deel van de dag" in de aanvraagdialog:
- Als aangevinkt: toon start_time en end_time inputs (type="time")
- Einddatum wordt automatisch gelijk aan startdatum
- Berekening toont uren i.p.v. werkdagen
- Label in de lijst: "9:00 – 11:00" naast de datum

### 4. Werkrooster beheer

Nieuw component `WorkScheduleEditor` (in Settings of op een sub-tab van Verlof):
- Manager/admin selecteert een medewerker
- 7-rij tabel (ma t/m zo) met kolommen: Werkdag (toggle), Start, Einde, Pauze (min)
- Standaard pre-fill: ma-vr 08:00-17:00, 30 min pauze, za-zo uit
- Save slaat alle 7 rijen op via upsert

Toegankelijk via een "Werkroosters" tab op de verlofpagina (alleen voor managers).

### 5. Hooks

- `useWorkSchedules(userId?)` — query voor werkrooster
- `useUpsertWorkSchedule()` — mutation voor het opslaan
- `useCreateLeaveRequest` uitbreiden met `start_time`/`end_time`/`is_partial_day`

### Geschatte impact
- 1 migratie (tabel + kolommen + RLS)
- 1 nieuw component (WorkScheduleEditor)
- 1 nieuwe hook (useWorkSchedules)
- 2 bestanden gewijzigd (LeaveManagement.tsx, useLeaveRequests.ts)

