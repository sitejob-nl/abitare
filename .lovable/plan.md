
# Stosa Product & Offerte Fix Plan

Dit plan implementeert alle fixes uit het Abitare_Stosa_Fix_Plan_v3 document: database schema uitbreidingen, verbeterde Edge Function (safe upsert + price_group_id), kleuren-hooks, en de volledige keukenconfiguratie cascade in de offerte-wizard.

---

## Stap 1: Database Migratie (schema uitbreidingen)

Eenmalige migratie met alle ALTER TABLE statements uit `migration_stosa_fixes.sql`:

- **price_groups**: `material_type`, `material_description`, `thickness_mm`, `has_gola_system` + unique index op `(supplier_id, code)`
- **price_group_colors**: `supplier_id` (FK), `color_type` (front/corpus/plinth), `hex_color`, `sort_order` + indexen
- **product_prices**: `price_group_id` (FK naar price_groups) + index op `(product_id, price_group_id)`
- **product_ranges**: index op `(supplier_id, collection)`
- **products**: unique index `products_supplier_article_unique` (voor upsert)
- **quote_sections**: extra velden als die nog niet bestaan (front_number, countertop_height_mm, countertop_thickness_mm, workbench_material, workbench_edge, workbench_color)
- **Backfill**: bestaande product_prices koppelen aan price_groups via range mapping
- **Views**: `v_product_prices_full` en `v_price_group_colors` voor snelle lookups
- **Functions**: `get_product_price()` en `calc_selling_price()` helper functies

## Stap 2: Seed Data (Stosa prijsgroepen + kleuren)

Via data-insert (niet migratie):
- Evolution prijsgroepen E1-E10 + A, B, C met materiaalmetadata
- ART prijsgroepen I-V
- Frontkleuren per prijsgroep (E1, E2, E4, E7 als startset)
- Universele korpuskleuren per collectie (evolution + art)
- Zet Stosa supplier `has_price_groups = true` en `price_system = 'points'`

## Stap 3: Edge Function `import-products` v2

Vervang de huidige Edge Function met de verbeterde versie:
- **Safe upsert** voor prijzen (geen DELETE ALL meer): bepaal per prijs of het insert of update is
- **price_group_id** automatisch gezet op product_prices via `VARIANT_TO_PRICE_GROUP` mapping
- **Collectie detectie** dynamisch (evolution/art) i.p.v. hardcoded 'evolution'
- **Ranges upsert**: update bestaande + insert nieuwe (niet alleen insert)
- **Betere error handling**: bij fout blijven bestaande data intact, partial stats terug
- **collection** veld op PriceGroupRange interface voor correcte toewijzing

## Stap 4: React Hook `usePriceGroupColors` vervangen

Vervang de huidige hook met de nieuwe versie die:
- `colorType` parameter accepteert (front/corpus/plinth) voor gefilterde queries
- Sorteert op `sort_order` i.p.v. `color_name`
- Nieuwe export `useSupplierColors()` voor universele kleuren per leverancier (bijv. korpuskleuren), met deduplicatie op `color_code + color_type`
- CRUD mutations verwijderd (niet nodig voor deze flow, data komt uit seed/admin)

## Stap 5: `AddSectionDialog` vervangen met v2

De huidige dialoog wordt vervangen met de volledige keukenconfiguratie cascade:
- **Collectie filter**: dropdown om Evolution vs ART te filteren
- **Prijsgroep met materiaalinfo**: toont `material_type` in de selectie
- **Frontkleur**: dropdown gevuld uit `usePriceGroupColors(priceGroupId, 'front')`
- **Korpuskleur**: dropdown gevuld uit `useSupplierColors(supplierId, 'corpus')`
- **Plintkleur, greepnummer, kolomhoogte**: invoervelden
- **Automatische titel**: combineert prijsgroep code + naam + frontkleur
- **Cascade resets**: bij wijziging leverancier/collectie/prijsgroep worden onderliggende velden gereset
- Alle keukenconfiguratie velden worden opgeslagen op `quote_sections` (front_color, corpus_color, plinth_color, hinge_color, handle_number, column_height_mm)

---

## Technische details

### Nieuwe/gewijzigde bestanden

| Bestand | Actie |
|---|---|
| `supabase/migrations/..._stosa_fixes.sql` | Nieuw: schema migratie |
| `supabase/functions/import-products/index.ts` | Vervangen: v2 met safe upsert |
| `src/hooks/usePriceGroupColors.ts` | Vervangen: met colorType filter + useSupplierColors |
| `src/components/quotes/AddSectionDialog.tsx` | Vervangen: v2 met keukenconfiguratie cascade |

### Uitvoervolgorde
1. Migratie draaien (schema)
2. Seed data invoegen (prijsgroepen + kleuren)
3. Edge Function deployen
4. React hooks + component updaten
5. Na deployment: Stosa herimport draaien om price_group_id te vullen op bestaande prijzen
