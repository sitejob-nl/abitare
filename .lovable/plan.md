
# Complete Pagina Implementatie - Abitare CRM/ERP

## Huidige Status

Na grondige analyse van de codebase blijkt het volgende:

| Route | Huidige Pagina | Database Gekoppeld |
|-------|---------------|-------------------|
| `/` | Dashboard | Deels (stats wel, ActionList/Agenda niet) |
| `/customers` | Customers.tsx | Ja |
| `/quotes` | Dashboard (placeholder) | Nee |
| `/orders` | Dashboard (placeholder) | Nee |
| `/calendar` | Dashboard (placeholder) | Nee |
| `/installation` | Dashboard (placeholder) | Nee |
| `/inbox` | Dashboard (placeholder) | Nee |
| `/products` | Dashboard (placeholder) | Nee |
| `/reports` | Dashboard (placeholder) | Nee |
| `/settings` | Dashboard (placeholder) | Nee |

**Probleem:** 8 van de 10 routes wijzen naar de Dashboard pagina als tijdelijke placeholder.

---

## Implementatieplan

### Prioriteit 1: Core Sales Pagina's

#### 1.1 Offertes Pagina (`/quotes`)
**Doel:** Overzicht van alle offertes met filtering en zoeken

**Nieuwe bestanden:**
- `src/pages/Quotes.tsx` - Hoofdpagina
- `src/hooks/useQuotes.ts` - Data hook voor offertes

**Functionaliteit:**
- Tabel met offertes (nummer, klant, bedrag, status, datum)
- Filteren op status (concept, verstuurd, bekeken, geaccepteerd, etc.)
- Filteren op vestiging
- Zoeken op klantnaam of offertenummer
- Status badges met kleuren
- Link naar nieuwe offerte maken

**Database koppeling:**
```text
quotes -> customers (klant info)
       -> divisions (vestiging)
       -> profiles (verkoper naam)
```

#### 1.2 Orders Pagina (`/orders`)
**Doel:** Overzicht van alle orders met status workflow

**Nieuwe bestanden:**
- `src/pages/Orders.tsx` - Hoofdpagina

**Functionaliteit:**
- Tabel met orders (nummer, klant, status, bedrag, leverdatum)
- Filteren op status (nieuw, besteld, in_productie, etc.)
- Filteren op betaalstatus
- Zoeken op klantnaam of ordernummer
- Workflow status indicator
- Betalingsstatus weergave

---

### Prioriteit 2: Planning Pagina's

#### 2.1 Agenda Pagina (`/calendar`)
**Doel:** Agenda overzicht voor afspraken

**Vereist:** Een `appointments` tabel is nog niet aanwezig in de database.

**Opties:**
1. Simpele versie: Toon geplande leveringen en montages uit orders tabel
2. Volledige versie: Nieuwe appointments tabel aanmaken

**Voorgestelde aanpak (simpele versie):**
- `src/pages/Calendar.tsx` - Kalender view
- Toon `expected_delivery_date` en `expected_installation_date` uit orders
- Groepeer op dag
- Filter op type (levering/montage)

#### 2.2 Montage Pagina (`/installation`)
**Doel:** Overzicht van montages en planning

**Nieuwe bestanden:**
- `src/pages/Installation.tsx`

**Functionaliteit:**
- Orders met status `montage_gepland` of `gemonteerd`
- Monteur toewijzing
- Geplande vs uitgevoerde datum
- Kooiaap indicator

---

### Prioriteit 3: Beheer Pagina's

#### 3.1 Producten Pagina (`/products`)
**Doel:** Product catalogus beheer

**Nieuwe bestanden:**
- `src/pages/Products.tsx`
- `src/hooks/useProducts.ts`
- `src/hooks/useSuppliers.ts`

**Functionaliteit:**
- Tabel met producten (code, naam, prijs, leverancier)
- Filteren op leverancier en categorie
- Zoeken op artikelcode of naam
- Alleen zichtbaar voor admin/manager

#### 3.2 Rapportages Pagina (`/reports`)
**Doel:** Overzichten en statistieken

**Nieuwe bestanden:**
- `src/pages/Reports.tsx`

**Functionaliteit:**
- Omzet per periode
- Conversieratio grafiek
- Top verkopers
- Orders per status
- Alleen zichtbaar voor admin/manager

#### 3.3 Instellingen Pagina (`/settings`)
**Doel:** Systeem configuratie

**Nieuwe bestanden:**
- `src/pages/Settings.tsx`

**Functionaliteit:**
- Vestigingen beheer
- Gebruikers beheer
- Rol toewijzing
- Alleen zichtbaar voor admin

---

### Prioriteit 4: Communicatie

#### 4.1 Inbox Pagina (`/inbox`)
**Doel:** Berichten en notificaties

**Vereist:** Een `messages` of `notifications` tabel is nog niet aanwezig.

**Voorgestelde aanpak:**
- Placeholder pagina met "Komt binnenkort" bericht
- Of: Toon order_notes als activiteitenstroom

---

### Dashboard Componenten Koppelen

#### ActionList Component
**Probleem:** Hardcoded data

**Oplossing:** Genereer actiepunten uit bestaande data:
- Verlopen offertes (valid_until < vandaag, status = verstuurd)
- Orders die actie vereisen (status = nieuw of controle)
- Nieuwe leads (klanten zonder offerte)

#### AgendaToday Component
**Probleem:** Hardcoded data

**Oplossing:** Haal vandaag's planning uit orders:
- Leveringen (`expected_delivery_date` = vandaag)
- Montages (`expected_installation_date` = vandaag)

---

## Nieuwe Data Hooks

### useQuotes Hook
```text
Functies:
- useQuotes({ divisionId, status, search })
- useQuote(id)
- useCreateQuote()
- useUpdateQuote()
```

### useProducts Hook
```text
Functies:
- useProducts({ supplierId, categoryId, search })
- useProduct(id)
```

### useSuppliers Hook
```text
Functies:
- useSuppliers()
- useSupplier(id)
```

### useActionItems Hook
```text
Genereert actiepunten uit:
- Verlopen offertes
- Nieuwe orders
- Incomplete orders
```

### useTodayAgenda Hook
```text
Haalt vandaag's planning op:
- Leveringen gepland
- Montages gepland
```

---

## Routing Update

In `App.tsx` worden alle placeholders vervangen:

```text
/quotes      -> Quotes.tsx
/orders      -> Orders.tsx  
/calendar    -> Calendar.tsx
/installation -> Installation.tsx
/inbox       -> Inbox.tsx
/products    -> Products.tsx
/reports     -> Reports.tsx
/settings    -> Settings.tsx
```

---

## Sidebar Badges

Dynamische badges op basis van database:
- Klanten: Aantal nieuwe klanten deze week
- Offertes: Openstaande offertes
- Inbox: Ongelezen notificaties

---

## Implementatievolgorde

1. **Stap 1:** useQuotes hook + Quotes.tsx
2. **Stap 2:** Orders.tsx (hergebruik useOrders)
3. **Stap 3:** ActionList koppelen aan database
4. **Stap 4:** AgendaToday koppelen aan database
5. **Stap 5:** useProducts + Products.tsx
6. **Stap 6:** Calendar.tsx
7. **Stap 7:** Installation.tsx
8. **Stap 8:** Reports.tsx
9. **Stap 9:** Settings.tsx
10. **Stap 10:** Inbox.tsx (placeholder)
11. **Stap 11:** Sidebar badges dynamisch maken

---

## Technische Details

### Bestandsstructuur na implementatie:

```text
src/
├── pages/
│   ├── Customers.tsx     (bestaand, gekoppeld)
│   ├── Dashboard.tsx     (bestaand, deels gekoppeld)
│   ├── Quotes.tsx        (nieuw)
│   ├── Orders.tsx        (nieuw)
│   ├── Calendar.tsx      (nieuw)
│   ├── Installation.tsx  (nieuw)
│   ├── Inbox.tsx         (nieuw)
│   ├── Products.tsx      (nieuw)
│   ├── Reports.tsx       (nieuw)
│   ├── Settings.tsx      (nieuw)
│   ├── Login.tsx         (bestaand)
│   └── NotFound.tsx      (bestaand)
├── hooks/
│   ├── useCustomers.ts   (bestaand)
│   ├── useOrders.ts      (bestaand)
│   ├── useDivisions.ts   (bestaand)
│   ├── useQuotes.ts      (nieuw)
│   ├── useProducts.ts    (nieuw)
│   ├── useSuppliers.ts   (nieuw)
│   ├── useActionItems.ts (nieuw)
│   └── useTodayAgenda.ts (nieuw)
```

### Rol-gebaseerde toegang:

| Pagina | Admin | Manager | Verkoper | Assistent | Monteur |
|--------|-------|---------|----------|-----------|---------|
| Dashboard | Ja | Ja | Ja | Ja | Ja |
| Klanten | Ja | Ja | Ja | Ja | Nee |
| Offertes | Ja | Ja | Ja | Nee | Nee |
| Orders | Ja | Ja | Ja | Ja | Alleen eigen |
| Products | Ja | Ja | Lezen | Nee | Nee |
| Reports | Ja | Ja | Nee | Nee | Nee |
| Settings | Ja | Nee | Nee | Nee | Nee |

---

## Samenvatting

| Onderdeel | Actie |
|-----------|-------|
| Nieuwe pagina's | 8 stuks aanmaken |
| Nieuwe hooks | 5 stuks aanmaken |
| Dashboard updates | ActionList + AgendaToday koppelen |
| Sidebar updates | Dynamische badges |
| Routing | Alle placeholders vervangen |

Dit plan zorgt ervoor dat alle 10 routes volledig functionele, database-gekoppelde pagina's worden.
