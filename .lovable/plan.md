
# Plan: Klantenportaal + Agenda Verbeteringen

## Overzicht

Dit plan beschrijft de implementatie van twee grote features:
1. **Klantenportaal** - Read-only toegang via unieke token voor klanten om orders/offertes te bekijken, voorkeursdatums voor montage aan te geven, en documenten te downloaden
2. **Agenda Verbeteringen** - Week/dag weergave, monteur toewijzen, drag & drop planning, en conflictdetectie

---

## Deel 1: Klantenportaal

### Authenticatie via Unieke Token

Klanten krijgen toegang via een URL met unieke token (bijv. `/portal/abc123xyz`). Geen login/wachtwoord nodig.

**Nieuwe database tabel: `customer_portal_tokens`**

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| token | text | Unieke, cryptografisch sterke token |
| customer_id | uuid | FK naar customers |
| order_id | uuid | Optioneel: specifieke order |
| quote_id | uuid | Optioneel: specifieke offerte |
| expires_at | timestamptz | Vervaldatum (30 dagen default) |
| created_at | timestamptz | Aanmaakdatum |
| last_accessed_at | timestamptz | Laatste toegang |
| is_active | boolean | Actief/gedeactiveerd |

### Portal Pagina's

```text
/portal/:token                    -> PortalLayout (wrapper met klantinfo)
  /portal/:token/                 -> Dashboard overzicht
  /portal/:token/orders           -> Alle orders van klant
  /portal/:token/orders/:orderId  -> Order detail
  /portal/:token/quotes           -> Alle offertes van klant
  /portal/:token/quotes/:quoteId  -> Offerte detail
  /portal/:token/documents        -> Documenten portaal
  /portal/:token/planning         -> Voorkeursdatums aangeven
```

### Portal Features

**Read-only Order Weergave:**
- Ordernummer, status, datums
- Producten/regels (zonder inkoopprijzen)
- Lever- en montagedatum
- Statusgeschiedenis

**Read-only Offerte Weergave:**
- Offertenummer, geldigheid
- Secties en regels met prijzen
- Totalen en kortingen

**Documentportaal:**
- Alleen documenten waar `visible_to_customer = true`
- Download functionaliteit via signed URLs

**Montageplanning Zelfservice:**
- Klant kan 3 voorkeursdatums opgeven
- Opmerkingen/bijzonderheden toevoegen
- Geen directe boeking - medewerker bevestigt

**Nieuwe tabel: `customer_planning_preferences`**

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| order_id | uuid | FK naar orders |
| preferred_date_1 | date | Eerste voorkeur |
| preferred_date_2 | date | Tweede voorkeur |
| preferred_date_3 | date | Derde voorkeur |
| time_preference | text | 'ochtend' / 'middag' / 'geen_voorkeur' |
| remarks | text | Opmerkingen |
| submitted_at | timestamptz | Ingediend op |

---

## Deel 2: Agenda Verbeteringen

### Weergave Modi

**Huidige staat:** Alleen maandweergave
**Nieuw:** Maand / Week / Dag toggle

```text
┌─────────────────────────────────────────────────────┐
│  [Maand] [Week] [Dag]    < Februari 2026 >  [Vandaag]│
├─────────────────────────────────────────────────────┤
│  Ma    Di    Wo    Do    Vr    Za    Zo             │
│ ┌────┬────┬────┬────┬────┬────┬────┐               │
│ │    │    │    │    │    │    │    │               │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

### Week Weergave

- 7 kolommen met volledige datumlabels
- Meer ruimte per dag voor events
- Tijdslots visualiseren (optioneel)

### Dag Weergave

- Volledige details van alle events op die dag
- Monteur toewijzing direct zichtbaar
- Klantgegevens en adres

### Monteur Toewijzen vanuit Agenda

Klik op een event om:
1. Event details te bekijken in een popover/modal
2. Monteur te selecteren uit dropdown
3. Direct op te slaan

```text
┌─────────────────────────────────────┐
│  Order #1234                        │
│  Klant: Van den Berg                │
│  Adres: Kerkstraat 12, Amsterdam    │
├─────────────────────────────────────┤
│  Monteur:  [Jan Jansen        ▼]    │
│            [Opslaan]                │
└─────────────────────────────────────┘
```

### Drag & Drop

- Events kunnen versleept worden naar andere dagen
- Update `expected_installation_date` of `expected_delivery_date`
- Bevestigingsdialog bij verplaatsen
- Visuele feedback tijdens slepen

Gebruik `@dnd-kit` (al geinstalleerd) voor consistentie met bestaande drag & drop in offertes.

### Conflictdetectie

Bij dubbele boekingen:
- Monteur toegewezen aan 2 montages op dezelfde dag
- Visuele waarschuwing (oranje/rood border)
- Tooltip met conflict details

**Database query voor conflicten:**
```sql
SELECT installer_id, expected_installation_date, COUNT(*) 
FROM orders 
WHERE installer_id IS NOT NULL 
  AND expected_installation_date IS NOT NULL
GROUP BY installer_id, expected_installation_date 
HAVING COUNT(*) > 1
```

---

## Bestandswijzigingen

### Database Migraties

| Migratie | Beschrijving |
|----------|--------------|
| `create_customer_portal_tokens` | Token tabel voor portal toegang |
| `create_customer_planning_preferences` | Voorkeursdatums tabel |
| `add_rls_portal_tables` | RLS policies voor portal data |

### Nieuwe Bestanden

**Portal:**
```text
src/pages/portal/
  PortalLayout.tsx          - Layout wrapper met klantinfo header
  PortalDashboard.tsx       - Overzichtspagina
  PortalOrders.tsx          - Orders lijst
  PortalOrderDetail.tsx     - Order detail (read-only)
  PortalQuotes.tsx          - Offertes lijst
  PortalQuoteDetail.tsx     - Offerte detail (read-only)
  PortalDocuments.tsx       - Documenten portaal
  PortalPlanning.tsx        - Voorkeursdatums formulier

src/hooks/
  usePortalToken.ts         - Token validatie en data ophalen
  usePortalOrders.ts        - Orders voor portal (zonder financiele data)
  usePortalQuotes.ts        - Offertes voor portal
  usePortalDocuments.ts     - Documenten met visibility filter
  usePlanningPreferences.ts - CRUD voor voorkeursdatums
```

**Agenda:**
```text
src/components/calendar/
  CalendarViewToggle.tsx    - Maand/Week/Dag toggle buttons
  CalendarWeekView.tsx      - Week weergave component
  CalendarDayView.tsx       - Dag weergave component
  CalendarEventCard.tsx     - Herbruikbare event card
  CalendarEventPopover.tsx  - Event details + monteur toewijzen
  AssignInstallerDialog.tsx - Monteur selectie modal
  ConflictBadge.tsx         - Waarschuwingsindicator

src/hooks/
  useCalendarConflicts.ts   - Conflictdetectie query
  useAssignInstaller.ts     - Monteur toewijzen mutation
  useUpdateEventDate.ts     - Datum wijzigen via drag & drop
```

### Aangepaste Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Portal routes toevoegen |
| `src/pages/Calendar.tsx` | View toggle, week/dag views, drag & drop integreren |
| `src/hooks/useUsers.ts` | Query voor monteurs (rol = 'monteur') |

---

## Technische Details

### Token Generatie

```typescript
// Cryptografisch sterke token van 32 bytes -> 64 hex karakters
const token = crypto.randomUUID() + crypto.randomUUID();
```

### RLS Policies voor Portal

```sql
-- customer_portal_tokens: alleen aanmaken/lezen door medewerkers
CREATE POLICY "Medewerkers kunnen tokens beheren" 
ON customer_portal_tokens FOR ALL 
USING (auth.role() = 'authenticated');

-- Portal read access: publieke SELECT met valid token
CREATE POLICY "Portal read via token"
ON customer_portal_tokens FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
);
```

### Portal Data View (zonder financiele kolommen)

```sql
CREATE VIEW portal_orders AS
SELECT 
  id, order_number, status, order_date,
  expected_delivery_date, expected_installation_date,
  actual_delivery_date, actual_installation_date,
  customer_id, customer_notes, delivery_notes
FROM orders;
-- Geen: total_incl_vat, margin, inkoopprijzen etc.
```

### Drag & Drop Implementatie

```typescript
// Gebruik DndContext van @dnd-kit
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;
  
  const eventId = active.id;      // order ID
  const newDate = over.id;        // 'YYYY-MM-DD'
  const eventType = active.data.current?.type; // 'delivery' | 'installation'
  
  // Update mutation
  updateEventDate.mutate({ 
    orderId: eventId, 
    field: eventType === 'delivery' 
      ? 'expected_delivery_date' 
      : 'expected_installation_date',
    date: newDate 
  });
};
```

---

## Fasering

### Fase 1: Database + Token Systeem (2-3 uur)
- Migraties uitvoeren
- Token generatie in admin panel (order detail)
- Token validatie hook

### Fase 2: Portal Basis (4-6 uur)
- PortalLayout met token validatie
- Read-only order/offerte weergave
- Documenten portaal

### Fase 3: Planning Zelfservice (2-3 uur)
- Voorkeursdatums formulier
- Weergave in admin order detail

### Fase 4: Agenda Views (3-4 uur)
- Week weergave
- Dag weergave
- View toggle

### Fase 5: Monteur Toewijzen + Drag & Drop (4-5 uur)
- Event popover met installer select
- Drag & drop tussen dagen
- Conflictdetectie

**Totale geschatte tijd: 15-21 uur**

---

## Security Overwegingen

1. **Token expiratie**: Standaard 30 dagen, configureerbaar
2. **Geen financiele data in portal**: Aparte view zonder marges/inkoopprijzen
3. **Rate limiting**: Overweeg bij veel token validatie requests
4. **Audit log**: `last_accessed_at` updaten bij elke portal visit
5. **Token revocatie**: `is_active` flag om tokens te deactiveren
