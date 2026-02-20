

# Planningvenster monteurs (7 dagen) en prognose weeknummer

## Deel 1: Planningvenster monteurs beperken tot 7 dagen

### Probleem
De monteurs-app toont momenteel **alle** toegewezen orders, ongeacht hoe ver in de toekomst ze gepland staan. Dit is overweldigend en niet wenselijk.

### Oplossing
De `installer_orders` database view aanpassen met een datumfilter dat alleen orders toont waarvan de verwachte installatiedatum binnen de komende 7 dagen valt (of in het verleden ligt en nog niet afgerond is). Orders zonder datum worden ook getoond zodat ze niet verloren gaan.

### Wijzigingen

**Database migratie** -- `installer_orders` view aanpassen:
- Filter toevoegen: `expected_installation_date <= CURRENT_DATE + INTERVAL '7 days'`
- Orders zonder datum (`NULL`) blijven zichtbaar
- Orders met een datum in het verleden blijven zichtbaar (tenzij status = gemonteerd/afgerond)

**Frontend** (`src/pages/installer/InstallerDashboard.tsx`):
- De "Later" groep verwijderen (er zijn geen orders meer buiten de week)
- Optioneel: een tekst "Je ziet alleen opdrachten voor de komende 7 dagen" toevoegen

---

## Deel 2: Prognose weeknummer op orders

### Probleem
Planners willen intern een **indicatief weeknummer** kunnen toewijzen aan een order, zonder direct een Outlook-afspraak te maken. Dit voorkomt "zondagevents" en geeft een globaal planningsoverzicht.

### Oplossing
Een nieuw veld `forecast_week` (text, formaat "YYYY-Wnn", bijv. "2026-W12") toevoegen aan de `orders` tabel. Dit veld is puur intern en heeft geen relatie met Outlook.

### Wijzigingen

**Database migratie**:
- Kolom `forecast_week` (text, nullable) toevoegen aan `orders`

**Frontend** -- Orderdetailpagina (`src/pages/OrderDetail.tsx`):
- Een compact weeknummer-selector toevoegen in het planningsgedeelte
- Toont jaar + weeknummer met een dropdown of inline input
- Bewerkbaar door verkopers/managers

**Frontend** -- Installatieplanning overzicht (`src/pages/Installation.tsx`):
- Kolom/filter toevoegen voor prognose-week
- Orders groepeerbaar op weeknummer voor planningsoverzicht

**Frontend** -- Kanban/orderslijst:
- Badge met weeknummer tonen op orderkaarten die een prognose maar nog geen definitieve datum hebben

---

## Technische details

### Database migratie

```text
1. ALTER TABLE orders ADD COLUMN forecast_week text;
   -- Formaat: "YYYY-Wnn" (bijv. "2026-W12")

2. CREATE OR REPLACE VIEW installer_orders AS
   SELECT [bestaande kolommen]
   FROM orders
   WHERE installer_id = auth.uid()
     AND status NOT IN ('afgerond', 'geannuleerd')
     AND (
       expected_installation_date IS NULL
       OR expected_installation_date <= CURRENT_DATE + INTERVAL '7 days'
     );
```

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| Database migratie | `forecast_week` kolom + view update |
| `src/pages/installer/InstallerDashboard.tsx` | "Later" groep verwijderen, info-tekst toevoegen |
| `src/pages/OrderDetail.tsx` | Weeknummer-selector in planningssectie |
| `src/pages/Installation.tsx` | Filter/groepering op prognose-week |
| `src/hooks/useInstallerOrders.ts` | Geen wijziging nodig (view handelt filtering) |
| `src/hooks/useOrderMutations.ts` | `forecast_week` opnemen in update-mutatie |
| `src/components/orders/OrderKanbanCard.tsx` | Weeknummer badge tonen |

### Geen impact op bestaande functionaliteit
- Outlook-integratie blijft ongewijzigd
- De definitieve planningsdatum (`expected_installation_date`) blijft leidend
- `forecast_week` is puur informatief en blokkeert geen statusovergangen
