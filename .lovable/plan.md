
# Upgrade STOSA Import naar v5

## Overzicht
Het bestaande STOSA import systeem (v3) wordt geupgraded naar v5 met extra intelligentie: automatische categorie-detectie uit SKU, prijseenheid-detectie, kortingsgroepen en keukenconfiguratie-helpers.

## Wat verandert er

### 1. Database Migratie
Nieuwe tabellen en kolommen toevoegen:

**Nieuwe tabel: `discount_groups`**
- supplier_id, code (GR1/GR2/GR3), name, default_discount_percent

**Nieuwe kolommen op `products`**
- `pricing_unit` (enum: STUK, ML, M2, SET) - prijseenheid
- `discount_group_id` (FK naar discount_groups)
- `type_code` (VARCHAR) - kasttype uit SKU positie 3-4 (bijv. BB, PR, CD)
- `type_name_nl` (VARCHAR) - Nederlandse naam (bijv. "Onderkast met deur")
- `subcategory` (VARCHAR)
- `kitchen_group` (VARCHAR) - groepering voor keukenconfiguratie

**Nieuwe kolom op `product_categories`**
- `kitchen_group` (VARCHAR) - keukenconfiguratie groep

**Nieuwe kolom op `import_logs`**
- `metadata` (JSONB) - extra statistieken per import

**Nieuwe views**
- `products_full` - producten met categorie, kortingsgroep, leverancier
- `products_by_width` - producten per breedte (voor keukenconfiguratie)
- `kitchen_config_options` - overzicht alle keukenkast opties

**Nieuwe functies**
- `get_matching_products_by_width()` - zoek producten op breedte en keukengroep
- `calculate_product_price()` - berekent prijs o.b.v. eenheid (stuk/ML/M2/set)
- `get_related_products()` - vind gerelateerde producten (zelfde breedte/groep)

### 2. Edge Function Update
`supabase/functions/stosa-import/index.ts` vervangen door v5 versie met:
- SKU type code mapping (BB=onderkast, PR=bovenkast, CD=hoge kast, etc.)
- SKU prefix mapping (7VJ=spoelbak, 5FM=gola, etc.)
- Automatische prijseenheid detectie uit beschrijving (ML, M2, SET)
- Kortingsgroep tracking (GR1/GR2/GR3 uit "Cat. molt." kolom)
- Breedte extractie uit SKU
- Automatische categorie-aanmaak met parent/child relaties
- Uitgebreide import statistieken (per categorie, eenheid, keukengroep)

### 3. Frontend
De `StosaImportDialog.tsx` en `PriceGroupSelector.tsx` componenten zijn al up-to-date en hoeven niet te wijzigen.

### 4. RLS Policies
RLS-policies toevoegen voor de nieuwe `discount_groups` tabel (lezen voor iedereen, beheer voor admin/manager).

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/[timestamp]_stosa_v5.sql` | Nieuw |
| `supabase/functions/stosa-import/index.ts` | Vervangen door v5 |

## Volgorde
1. Database migratie uitvoeren (nieuwe tabel, kolommen, views, functies)
2. Edge function vervangen en deployen
