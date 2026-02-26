

## Plan: Agenda uitbreiden — Multi-user agenda, privacy, weeknummers & groepsweergave

De huidige agenda toont events van **alle** orders/tickets op één view. De gewenste situatie is een Outlook-geïntegreerde multi-user agenda met privacy, groepering per persoon, en extra functionaliteiten.

### Huidige staat
- Maand/week/dag views met drag-and-drop
- Events uit orders (levering/montage), service tickets, en Microsoft 365 (read-only via Graph API)
- Monteurfilter, conflict detectie, forecast week badges
- Outlook events worden opgehaald via `/me/calendarview` (alleen eigen agenda van ingelogde gebruiker)
- Outlook events aanmaken via `/me/events` vanuit orderdetail

### Wat er nodig is

---

### 1. Multi-user Microsoft agenda's ophalen

**Probleem:** Nu wordt alleen `/me/calendarview` aangeroepen — dit toont enkel de eigen agenda.

**Oplossing:** Microsoft Graph API ondersteunt het ophalen van agenda's van andere gebruikers via `/users/{email}/calendarview` mits de organisatie dit toelaat (delegated of application permissions). 

- Nieuwe tabel `calendar_subscriptions` om bij te houden welke collega-agenda's een gebruiker wil zien.
- UI: checklist met collega's (uit `profiles` + `microsoft_connections`) om agenda's aan/uit te zetten.
- De `microsoft-api` edge function wordt per geselecteerde collega aangeroepen.
- Elk persoon krijgt een **kleurcode** (opgeslagen op `profiles` of `calendar_subscriptions`).

**Bestanden:**
- Database: `calendar_subscriptions` tabel + `calendar_color` kolom op `profiles`
- `src/hooks/useMicrosoftCalendar.ts` — uitbreiden met multi-user fetching
- `src/pages/Calendar.tsx` — agenda-selector sidebar met checkboxes
- `src/components/calendar/MicrosoftEventCard.tsx` — kleurcodering per persoon

---

### 2. Privéafspraken: "Bezet" zonder details

**Gegeven:** Microsoft Graph API retourneert `sensitivity: "private"` op privé-events en beperkt de `subject`/`body`/`location` bij het ophalen van andermans agenda.

**Oplossing:**
- In de UI: als `event.sensitivity === "private"` of `event.sensitivity === "confidential"`, toon alleen **"Bezet"** als onderwerp, geen locatie/details.
- Admins krijgen dezelfde beperking — privacy wordt door Outlook afgedwongen.

**Bestanden:**
- `src/components/calendar/MicrosoftEventCard.tsx` — sensitivity check
- `src/hooks/useMicrosoftCalendar.ts` — `sensitivity` toevoegen aan interface

---

### 3. Weeknummers tonen

**Oplossing:** Weeknummer als label in de eerste kolom van maand- en weekview.

**Bestanden:**
- `src/pages/Calendar.tsx` — maandview: weeknummer links van elke rij
- `src/components/calendar/CalendarWeekView.tsx` — weeknummer in header

---

### 4. Agenda-tabs: Groep / Sales / Monteurs

**Probleem:** 14 agenda's tegelijk is onoverzichtelijk.

**Oplossing:** Tabs boven de agenda: "Overzicht" (alle interne events), "Sales" (adviseurs), "Monteurs", "Mijn agenda". Per tab worden de relevante collega's gefilterd op basis van hun rol uit `user_roles`.

**Bestanden:**
- `src/pages/Calendar.tsx` — tab-bar component met rolgebaseerde filtering
- Database: geen wijziging nodig (rollen bestaan al)

---

### 5. Afspraken aanmaken voor meerdere personen

**Probleem:** Outlook ondersteunt geen twee kleuren per afspraak voor gezamenlijke events.

**Oplossing:** Bij het plannen van een order/event in Outlook, optioneel meerdere collega's als `attendees` toevoegen. Microsoft Graph API stuurt automatisch uitnodigingen. In de UI verschijnt het event in iedere geselecteerde agenda.

**Bestanden:**
- `src/components/orders/ScheduleOutlookEvent.tsx` — multi-select voor deelnemers
- `src/hooks/useInstallers.ts` — hergebruiken voor personeelsselectie (of nieuwe hook voor MS-connected users)

---

### 6. Kleurcodering per persoon

**Oplossing:** Kolom `calendar_color` op `profiles` (hex kleur). Bij het renderen van events wordt de kleur van de eigenaar/organizer gebruikt.

**Bestanden:**
- Database: `calendar_color` kolom op `profiles`
- `src/components/calendar/MicrosoftEventCard.tsx` — dynamische achtergrondkleur
- `src/components/calendar/CalendarEventCard.tsx` — monteur-kleur voor orders
- `src/pages/Settings.tsx` — kleurkiezer in profielinstellingen

---

### Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| Database migratie | `calendar_subscriptions` tabel, `calendar_color` op `profiles` |
| `src/hooks/useMicrosoftCalendar.ts` | Multi-user fetching, sensitivity veld |
| `src/pages/Calendar.tsx` | Weeknummers, agenda-tabs, collega-selector |
| `src/components/calendar/MicrosoftEventCard.tsx` | Privacy check, kleurcodering |
| `src/components/calendar/CalendarWeekView.tsx` | Weeknummers |
| `src/components/calendar/CalendarEventCard.tsx` | Kleurcodering per monteur |
| `src/components/orders/ScheduleOutlookEvent.tsx` | Multi-attendee support |
| `src/pages/Settings.tsx` | Kleurkiezer |

### Belangrijk aandachtspunt
Multi-user agenda ophalen via Graph API vereist **`Calendars.Read.Shared`** of **`Calendars.ReadWrite.Shared`** permissie. De huidige scopes moeten mogelijk worden uitgebreid in de Microsoft Entra app registration. Dit is een eenmalige configuratie in Azure Portal.

