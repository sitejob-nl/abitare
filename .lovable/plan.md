

# Plan: Mobile Optimalisatie voor Alle Pagina's

## Overzicht

Dit plan optimaliseert alle pagina's in de applicatie voor mobiel gebruik. Uit de analyse blijkt dat sommige pagina's (Customers, Quotes) al goed geoptimaliseerd zijn met table-to-card transformaties, terwijl andere pagina's nog verbeteringen nodig hebben.

---

## Huidige Status per Pagina

| Pagina | Desktop | Mobile | Status |
|--------|---------|--------|--------|
| Dashboard | Goed | Goed | OK |
| Customers | Tabel | Cards | OK |
| CustomerDetail | Goed | Goed | OK |
| Quotes | Tabel | Cards | OK |
| QuoteDetail | Goed | Goed | OK |
| Orders | Tabel | ONTBREEKT | Aanpassen |
| OrderDetail | Goed | Goed | OK |
| Products | Tabel | ONTBREEKT | Aanpassen |
| Service | Filters horizontaal | ONTBREEKT | Aanpassen |
| ServiceTicketDetail | 3-kolom grid | ONTBREEKT | Aanpassen |
| Invoices | Tabel | ONTBREEKT | Aanpassen |
| Settings | Tabel | ONTBREEKT | Aanpassen |
| Calendar | 7-kolom grid | ONTBREEKT | Aanpassen |
| Installation | Cards | Responsive tweaks | Kleine aanpassingen |
| Reports | Grid | OK | Kleine aanpassingen |
| PriceGroups | Tabel | ONTBREEKT | Aanpassen |
| ProductImport | Multi-step form | OK | Kleine aanpassingen |
| ServiceTicketPublicForm | Responsive | OK | OK |
| Login | Centered card | OK | OK |

---

## Te Wijzigen Bestanden

### 1. Orders.tsx - Mobile Cards View

**Probleem**: De Orders pagina toont alleen een tabel die op mobile slecht leesbaar is.

**Oplossing**:
- Header responsive maken met flex-wrap
- Filters in mobiele layout stapelen
- Mobile cards view toevoegen (vergelijkbaar met Customers/Quotes)

```text
DESKTOP: Tabel met 6 kolommen
MOBILE: Card per order met:
  - Order nummer + Status badge
  - Klantnaam
  - Bedrag + Betaalstatus
  - Leverdatum
```

### 2. Products.tsx - Mobile Cards View

**Probleem**: De Products pagina toont alleen een tabel.

**Oplossing**:
- Filters responsive stapelen
- Mobile cards toevoegen

```text
DESKTOP: Tabel met 6 kolommen
MOBILE: Card per product met:
  - Artikelcode
  - Naam
  - Leverancier + Categorie
  - Verkoop-/Inkoopprijs
```

### 3. Service.tsx - Filter Optimalisatie

**Probleem**: Filters staan horizontaal en knijpen op mobile.

**Oplossing**:
- Filters in flex-wrap stapelen
- Zoekbalk full width op mobile
- View toggle compact maken

### 4. ServiceTicketDetail.tsx - Mobile Layout

**Probleem**: 3-kolom grid wordt te smal op mobile.

**Oplossing**:
- Grid naar 1 kolom op mobile
- Sidebar cards onder main content
- Accordion voor sommige cards om ruimte te besparen

### 5. ServiceTicketTable.tsx - Mobile Cards

**Probleem**: Tabel is onleesbaar op mobile.

**Oplossing**:
- Tabel hidden op mobile
- Mobile cards view toevoegen

### 6. Invoices.tsx - Mobile Optimalisatie

**Probleem**: Stat cards en tabel zijn niet responsive.

**Oplossing**:
- Stat cards 2x2 grid op mobile
- Filters stapelen
- Tabel naar scrollable of cards

### 7. Calendar.tsx - Mobile View

**Probleem**: 7-kolom grid is te smal op mobile.

**Oplossing**:
- Weeknamen afkorten tot 1 letter
- Kleinere cellen
- Events compacter weergeven
- Optioneel: agenda list view voor mobile

### 8. Settings.tsx - Mobile Tabel

**Probleem**: Gebruikerstabel is niet mobile-friendly.

**Oplossing**:
- Tabel hidden op mobile
- Mobile cards view voor gebruikers

### 9. PriceGroups.tsx - Mobile Cards

**Probleem**: Tabel niet mobile-friendly.

**Oplossing**:
- Tabel hidden op mobile
- Cards view voor prijsgroepen

### 10. Installation.tsx - Kleine Tweaks

**Probleem**: Header en filters kunnen beter.

**Oplossing**:
- Header flex-wrap
- Filters stapelen op mobile

### 11. Reports.tsx - Grid Tweaks

**Probleem**: Charts kunnen overlopen.

**Oplossing**:
- Maandelijkse revenue chart responsive maken

---

## Implementatie Details

### Algemene Patronen

Alle mobile optimalisaties volgen dezelfde patronen:

1. **Header**: `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
2. **Filters**: `flex flex-col sm:flex-row sm:flex-wrap gap-3`
3. **Tabel-to-Cards**: 
   - Desktop: `hidden md:block` voor tabel
   - Mobile: `md:hidden space-y-3` voor cards
4. **Grids**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` progressieve breakpoints

### Fase 1: Kritieke Pagina's (Meest Gebruikt)

1. **Orders.tsx**
   - Header responsive maken
   - Filters stapelen
   - Mobile cards view toevoegen

2. **Service.tsx**
   - Filters responsive maken

3. **ServiceTicketDetail.tsx**
   - Grid naar 1 kolom op mobile
   - Cards order aanpassen

4. **ServiceTicketTable.tsx**
   - Mobile cards toevoegen

### Fase 2: Secundaire Pagina's

5. **Products.tsx**
   - Filters responsive
   - Mobile cards

6. **Invoices.tsx**
   - Stat cards responsive
   - Filters en tabel

7. **Settings.tsx**
   - Tabs responsive
   - Gebruikerstabel naar cards

### Fase 3: Planning Pagina's

8. **Calendar.tsx**
   - Compactere mobile view
   - Kleinere dag-cellen

9. **Installation.tsx**
   - Header en filters responsive

### Fase 4: Overige

10. **PriceGroups.tsx**
    - Mobile cards

11. **Reports.tsx**
    - Charts responsive

---

## Verwachte Wijzigingen per Bestand

| Bestand | Wijziging Type |
|---------|----------------|
| `src/pages/Orders.tsx` | Header, filters, mobile cards |
| `src/pages/Products.tsx` | Header, filters, mobile cards |
| `src/pages/Service.tsx` | Filters, zoekbalk |
| `src/pages/ServiceTicketDetail.tsx` | Grid, card volgorde |
| `src/components/service/ServiceTicketTable.tsx` | Mobile cards |
| `src/pages/Invoices.tsx` | Stats, filters, tabel |
| `src/pages/Calendar.tsx` | Compactere view |
| `src/pages/Installation.tsx` | Header, filters |
| `src/pages/Settings.tsx` | Tabs, gebruikerstabel |
| `src/pages/PriceGroups.tsx` | Header, mobile cards |
| `src/pages/Reports.tsx` | Chart aanpassingen |

---

## Technische Details

### Mobile Card Component Patroon

Alle mobile cards volgen dit patroon:

```tsx
{/* Desktop Table */}
<div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
  <table>...</table>
</div>

{/* Mobile Cards */}
<div className="md:hidden space-y-3">
  {items.map((item) => (
    <div 
      key={item.id}
      onClick={() => navigate(`/path/${item.id}`)}
      className="p-4 rounded-xl border border-border bg-card cursor-pointer 
                 transition-colors hover:bg-muted/30 active:bg-muted/50"
    >
      {/* Card content */}
    </div>
  ))}
</div>
```

### Responsive Filter Patroon

```tsx
<div className="mb-4 md:mb-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
  {/* Division filter */}
  <div className="flex items-center gap-2">
    <span className="text-[13px] text-muted-foreground hidden sm:inline">Label:</span>
    <Select>...</Select>
  </div>
  
  {/* Search - full width on mobile */}
  <div className="relative sm:ml-auto w-full sm:max-w-[300px] sm:flex-1">
    <Input />
  </div>
</div>
```

### ServiceTicketDetail Grid Aanpassing

```tsx
// Van:
<div className="grid gap-4 lg:grid-cols-3">
  <div className="lg:col-span-2">...</div>
  <div>...</div>
</div>

// Naar:
<div className="grid gap-4 lg:grid-cols-3">
  {/* Main content first on all screens */}
  <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">...</div>
  
  {/* Sidebar - shows above on mobile for quick status changes */}
  <div className="space-y-4 order-1 lg:order-2">...</div>
</div>
```

---

## Prioriteit

De implementatie volgt deze volgorde op basis van gebruiksfrequentie:

1. Orders (dagelijks gebruikt)
2. Service module (nieuw, moet direct goed werken)
3. Products (regelmatig gebruikt)
4. Invoices (maandelijks)
5. Calendar/Installation (planning)
6. Settings (incidenteel)
7. Reports/PriceGroups (incidenteel)

