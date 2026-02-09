

# Overzicht: Actiepunten uit de meeting

Uit de notulen komen de volgende **software-gerelateerde** punten naar voren. Ik deel ze op in wat nu gebouwd moet worden vs. wat later komt.

---

## A. Nu te bouwen: Servicetickets "wacht op onderdelen" sidebar bij de agenda

**Actie-item uit de meeting:**
> Maak een visueel overzicht (naast de agenda) voor servicetickets die wachten op een onderdeel, zodat deze eenvoudig naar de agenda gesleept kunnen worden zodra de onderdelen binnen zijn.

### Wat wordt gebouwd
Een zijpaneel naast de agendaweergave (`/calendar`) dat servicetickets met status `wacht_op_onderdelen` toont als draggable kaarten. Wanneer een ticket op een agendadag wordt gesleept, wordt de status gewijzigd naar `ingepland` en de geplande datum opgeslagen.

### Aanpak
1. **Nieuw component `ServiceTicketSidebar`** -- Toont een scrollbare lijst van servicetickets met status `wacht_op_onderdelen`, opgehaald via een gefilterde query op `service_tickets`.
2. **Draggable kaarten** -- Elk ticket wordt een `useDraggable` item binnen de bestaande `DndContext` van de Calendar-pagina.
3. **Drop-afhandeling uitbreiden** -- De `handleDragEnd` in `Calendar.tsx` herkent nu alleen order-events. Dit wordt uitgebreid zodat het ook serviceticket-drops herkent (op basis van een `service-ticket-` prefix in het drag-ID). Bij een drop:
   - Status wijzigen naar `ingepland`
   - (Optioneel) een `planned_date` veld opslaan op het ticket
4. **Layout aanpassing** -- De Calendar-pagina krijgt een flexbox-layout: agenda links (flex-1), sidebar rechts (~280px breed), inklapbaar.
5. **Database** -- Er is mogelijk een kolom `planned_date` nodig op `service_tickets` om de ingeplande datum vast te leggen. Als die er niet is, wordt een migratie aangemaakt.

---

## B. Noteren voor later (geen directe bouw nu)

De volgende punten uit de meeting zijn relevant maar vereisen eerst externe input of verdere afstemming:

| Punt | Status |
|------|--------|
| **Drie prijsvelden** (inkoop, boekprijs, Abitare-prijs) | Huidige `product_prices` tabel heeft 1 prijsveld. Uitbreiding nodig zodra de prijslijst-PDF is ontvangen en de logica helder is. |
| **Permanente productcorrecties** (wijzigingen op artikelnummer bewaren bij herimport) | Vereist een `product_overrides` tabel of `is_manually_edited` flag. Kan gebouwd worden zodra de import stabiel is. |
| **Klantportaal beperken** (alleen definitieve order + factuur, geen offertes) | Portaal bestaat al. Filter op quotes verwijderen is een kleine aanpassing, in te plannen. |
| **Monteursagenda max 1 week vooruit** | InstallerDashboard toont al vandaag/morgen/week tabs. "Later" tab kan verborgen/beperkt worden. |
| **WhatsApp-koppeling** | Wacht op telefoonnummer en verificatie. Technisch: Meta Business API integratie. |
| **TradePlace uitgebreide koppeling** | Wacht op communicatie met TradePlace. |
| **CIMA/Stoza directe leverancierskoppeling** | Wacht op contact met leverancier. |

---

## Technische details: Serviceticket sidebar

### Nieuwe/gewijzigde bestanden

1. **`src/components/calendar/ServiceTicketSidebar.tsx`** (nieuw)
   - Query: `service_tickets` WHERE `status = 'wacht_op_onderdelen'`
   - Toont per ticket: ticketnummer, onderwerp, klantnaam, prioriteit-badge
   - Elk ticket is wrapped in `useDraggable` met ID `service-ticket-{id}`
   - Inklapbaar via een toggle-knop

2. **`src/pages/Calendar.tsx`** (wijzigen)
   - Layout: wrap content in flex container, sidebar rechts
   - `handleDragEnd` uitbreiden: als `active.id` begint met `service-ticket-`, update ticket status naar `ingepland` + sla datum op
   - Sidebar-state (open/dicht) in useState

3. **`src/hooks/useServiceTicketMutations.ts`** (wijzigen)
   - Eventueel een `useScheduleServiceTicket` mutation toevoegen die status + datum in een keer updatet

4. **Database migratie** (indien `planned_date` nog niet bestaat)
   - `ALTER TABLE service_tickets ADD COLUMN planned_date date;`

### Interactie-flow

```text
+------------------------------------------+-------------+
|              AGENDA                       |  SIDEBAR    |
|                                           |             |
|  [Ma] [Di] [Wo] [Do] [Vr] [Za] [Zo]      | Wacht op    |
|                                           | onderdelen  |
|   Levering #1023                          |             |
|   Montage #1045                           | [Ticket 42] |
|                                           | [Ticket 58] |
|                                           | [Ticket 61] |
|                                           |             |
|           Drop ticket hier                |   drag -->  |
|                                           |             |
+------------------------------------------+-------------+
```

Gebruiker sleept een ticket vanuit de sidebar naar een dag in de agenda. Het ticket verdwijnt uit de sidebar (status wordt `ingepland`) en verschijnt als event op die dag.

