

## Plan: Agenda opbouw verbeteren

De agenda heeft al een solide basis (maand/week/dag views, drag-and-drop, service ticket sidebar, Microsoft events, conflict detectie). Er zijn vijf concrete verbeteringen nodig:

### 1. Ingeplande servicetickets tonen op de kalender

Service tickets met status `ingepland` en een `planned_date` worden momenteel niet op de kalender getoond. Ze moeten als derde event-type verschijnen naast leveringen en montages.

**Bestanden:**
- `src/pages/Calendar.tsx` — in `useCalendarEvents` een extra query toevoegen voor `service_tickets` met status `ingepland` en `planned_date` in bereik. Nieuw event type `"service"` toevoegen.
- `src/components/calendar/CalendarEventCard.tsx` — derde kleurstijl (bijv. paars/violet) en icoon (`Wrench`/`Headphones`) voor type `"service"` toevoegen aan het `CalendarEventData` type.
- `src/components/calendar/CalendarEventPopover.tsx` — service ticket popover met link naar `/service/{ticketId}` i.p.v. order.
- Filter dropdown — `"service"` optie toevoegen.

### 2. Microsoft events tonen in Week- en Dagview

Week- en dagview tonen momenteel geen Microsoft-events.

**Bestanden:**
- `src/components/calendar/CalendarWeekView.tsx` — `microsoftEvents` prop toevoegen, per dag Microsoft events renderen met `MicrosoftEventCard`.
- `src/components/calendar/CalendarDayView.tsx` — `microsoftEvents` prop toevoegen, aparte sectie "Outlook" in dagview.
- `src/pages/Calendar.tsx` — de gefilterde Microsoft events doorpassen aan beide views.

### 3. Klantgegevens doorpassen aan DayView

Regels 496-500 geven `customerPhone: undefined` en `customerAddress: undefined` door. De customer data is al beschikbaar in de query maar wordt niet meegegeven.

**Bestanden:**
- `src/pages/Calendar.tsx` — customer phone/address data uit de query extraheren en meegeven. Het `CalendarEventData` type uitbreiden met optionele `customerPhone` en `customerAddress` velden.
- `src/components/calendar/CalendarEventCard.tsx` — type uitbreiden.

### 4. Monteurfilter toevoegen

Een filter om de agenda te bekijken voor een specifieke monteur, zodat planners snel de planning van één monteur kunnen zien.

**Bestanden:**
- `src/pages/Calendar.tsx` — extra `Select` component met monteurs uit `useInstallers`. Filter `events` op `installerId` wanneer geselecteerd.

### 5. Forecast week indicatie op maandview

Orders met een `forecast_week` maar zonder exacte datum moeten als lichte indicatie zichtbaar zijn op de kalender (bijv. een badge op de maandag van die week).

**Bestanden:**
- `src/pages/Calendar.tsx` — extra query voor orders met `forecast_week` zonder `expected_installation_date` en `expected_delivery_date`. Parse `YYYY-Wnn` naar de maandag van die week en toon als een subtiel badge in de maandview.

### Samenvatting bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/Calendar.tsx` | Service tickets query, MS events doorpassen, customer data fix, monteurfilter, forecast week |
| `src/components/calendar/CalendarEventCard.tsx` | Service type styling + extra velden |
| `src/components/calendar/CalendarEventPopover.tsx` | Service ticket variant |
| `src/components/calendar/CalendarWeekView.tsx` | Microsoft events prop |
| `src/components/calendar/CalendarDayView.tsx` | Microsoft events + customer data |

