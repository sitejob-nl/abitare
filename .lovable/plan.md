

# Stosa Import Verbeteren - 3 Fasen

## Samenvatting

Het geüploade plan (`stosa-import-fix-plan.md`) beschrijft drie problemen met de huidige Stosa-import en stelt een gefaseerde oplossing voor. Na analyse van de huidige code bevestig ik dat het plan klopt en implementeerbaar is.

## Huidige situatie

De Stosa Excel bevat 69.015 rijen, maar de import verwerkt momenteel alleen FPC-rijen (keukenelementen met prijsgroepen). Daardoor worden:
- 11.231 standalone producten (accessoires, grepen, plinten) overgeslagen
- 1.809 werkbladen (MOL-varianten) overgeslagen
- Geen collectie-filter beschikbaar (Evolution/Look/Art/City door elkaar)
- `base_price` niet gevuld bij prijsgroepen-import

---

## Fase 1: Collectie-filter in UI

**Doel:** Gebruiker kan kiezen om alleen een specifieke collectie te importeren (bijv. alleen Evolution).

**Wijzigingen in `src/pages/ProductImport.tsx`:**
- Nieuwe state `selectedCollection` toevoegen
- Functie `detectCollection()` die op basis van het Variante 1 prefix (7xx=Evolution, 4xx=Look, 5xx=City, 8xx=Art) de collectie bepaalt
- De bestaande `extractedPrices`, `extractedProducts` en `extractedPriceGroups` filteren op de geselecteerde collectie
- Een Select-dropdown toevoegen in stap 3 (boven de preview) met opties: Alle collecties, Evolution, Look, Standalone, Werkbladen

---

## Fase 2: Standalone producten ondersteunen

**Doel:** Producten zonder varianten (lege `Variabile 1`) worden ook geimporteerd met hun basisprijs.

**Wijzigingen in `src/pages/ProductImport.tsx`:**
- `extractedProducts` aanpassen: rijen groeperen per `article_code`, de `base_price` ophalen uit de rij zonder variant (lege `Variabile 1`)
- Interface `PriceGroupProduct` in `src/hooks/useProductImport.ts` uitbreiden met `base_price?: number`, `has_variants?: boolean`, `variant_type?: string`

**Wijzigingen in `supabase/functions/import-products/index.ts`:**
- `PriceGroupProduct` interface uitbreiden met `base_price`
- Bij de product-upsert (stap 2) het `base_price` veld meesturen, zodat de standaardprijs op het product wordt opgeslagen
- Dit veld bestaat al in de `products` tabel maar wordt nu niet gevuld bij prijsgroepen-import

---

## Fase 3: LOOK collectie mapping

**Doel:** LOOK-producten (4xx codes) correct koppelen aan eigen prijsgroepen.

**Wijzigingen in `supabase/functions/import-products/index.ts`:**
- `VARIANT_TO_PRICE_GROUP` mapping uitbreiden: 401-412 mappen naar L1-L12 (in plaats van E1-E10), 431-433 naar LA/LB/LC
- Collectie-naam dynamisch bepalen op basis van variant prefix (7xx = "evolution", 4xx = "look", 8xx = "art")

**Database migratie:**
- LOOK prijsgroepen (L1-L12, LA, LB, LC) aanmaken in `price_groups` tabel, gekoppeld aan de Stosa leverancier

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/ProductImport.tsx` | Collectie-filter, standalone extractie, base_price logica |
| `src/hooks/useProductImport.ts` | Interface uitbreiding (base_price, has_variants, variant_type) |
| `supabase/functions/import-products/index.ts` | base_price meesturen, LOOK mapping, collectie-detectie |
| Nieuwe migratie | LOOK prijsgroepen in database |

## Verwacht resultaat

- Evolution import: 923 producten met E1-E10 + A/B/C prijzen
- Standalone import: 11.231 producten met base_price
- Werkbladen import: 1.809 producten met materiaal-varianten (DEA, HPA, etc.)
- LOOK import: 1.449 producten met L1-L12 prijzen
- Herhaalde import overschrijft bestaande data correct (upsert)

