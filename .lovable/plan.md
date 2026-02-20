

# Productpagina -- Algehele layout en structuur verbeteren

## Huidige situatie

De productpagina voelt "plat" aan vergeleken met andere pagina's zoals het Dashboard en Orders. Het is nu een filterbalk + een kale tabel + paginering, zonder overzichtscijfers, visuele hiërarchie of snelle navigatie.

## Verbeteringen

### 1. Samenvattingskaarten bovenaan

Vier `StatCard`-achtige kaarten toevoegen boven de filterbalk, consistent met het Dashboard-design:

- **Totaal producten** (icoon: Package) -- totaal actieve producten
- **Leveranciers** (icoon: Building2) -- aantal unieke leveranciers
- **Gem. verkoopprijs** (icoon: Euro) -- gemiddelde base_price
- **Inactief** (icoon: EyeOff) -- aantal inactieve producten (link naar filter)

Data wordt opgehaald met een aparte lichte query (COUNT/AVG) zodat het de producttabel niet vertraagt.

### 2. Filterbalk opschonen

De filterbalk wordt compacter gemaakt met een "Filters" knop die een Popover opent voor leverancier, categorie en prijsbereik. Zoekbalk blijft direct zichtbaar. Actieve filters worden als verwijderbare chips (badges) onder de zoekbalk getoond.

Resultaat: de standaard weergave toont alleen de zoekbalk + "Filters" knop + eventuele actieve filter-chips.

### 3. Actief/Inactief status badge

Een kleine gekleurde dot of badge toevoegen aan elke rij die aangeeft of het product actief of inactief is. Een toggle in de filterbalk om inactieve producten te tonen.

### 4. Verbeterde paginering

De paginering wordt visueel verbeterd:
- "Vorige/Volgende" knoppen worden icoon-only (compacter)
- Paginanummers tonen (1, 2, 3... met ellipsis) zodat je direct naar een pagina kunt springen
- Items-per-pagina selector (25, 50, 100)

### 5. Tabel header sticky maken

Bij het scrollen door lange lijsten blijft de tabelheader zichtbaar (sticky top).

## Technische details

### Nieuwe hook: `useProductStats`

```text
Bestand: src/hooks/useProductStats.ts

Haalt met een enkele query op:
- COUNT(*) WHERE is_active = true
- COUNT(DISTINCT supplier_id)
- AVG(base_price) WHERE base_price IS NOT NULL
- COUNT(*) WHERE is_active = false

Gebruikt supabase.rpc() met een database functie, of
drie parallelle count-queries (eenvoudiger, geen migratie nodig).
```

### Filter Popover

```text
De huidige inline filters (leverancier, categorie, prijs min/max) verhuizen
naar een Popover component achter een "Filters" knop met een Badge
die het aantal actieve filters toont.

Actieve filters worden als chips gerenderd met een X-knop
om ze individueel te wissen.
```

### Sticky header

```text
De <thead> krijgt: className="sticky top-0 z-10 bg-card"
De tabel wrapper krijgt een max-height en overflow-y-auto
zodat de header blijft staan bij scrollen.
```

### Items per pagina

```text
Nieuw state: pageSize (standaard 50)
Select met opties: 25, 50, 100
Wordt doorgegeven aan useProducts hook (ondersteunt dit al).
```

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useProductStats.ts` | Nieuw -- samenvattingsdata ophalen |
| `src/pages/Products.tsx` | StatCards toevoegen, filterbalk omzetten naar Popover + chips, sticky header, verbeterde paginering, actief/inactief badge, items-per-pagina |

Geen database migratie nodig -- alle data is beschikbaar via bestaande tabellen.

