

# STOSA Import Systeem - Implementatieplan

## Overzicht

Het nieuwe STOSA import systeem vervangt de oude complexe variant-mapping met een vereenvoudigd model: 13 prijsgroepen (1-10 voor volle deuren + A, B, C voor glasdeuren). De gebruiker heeft 4 bestanden aangeleverd die geintegreerd moeten worden in het bestaande project.

## Wat wordt er gedaan

### 1. Database Migratie
Een nieuwe migratie aanmaken op basis van `migration.sql` met:
- Unique constraints op `products(supplier_id, article_code)`, `price_groups(supplier_id, code)`, en `product_prices(product_id, price_group_id)`
- Indexes voor snelle prijs-lookups
- Vernieuwde `get_product_price` en nieuwe `get_product_price_by_code` functies
- View `products_with_price_groups`
- Updated_at trigger op products

### 2. Edge Function: `stosa-import`
Een nieuwe edge function `supabase/functions/stosa-import/index.ts` deployen. Aanpassingen t.o.v. het aangeleverde bestand:
- Import path `../_shared/cors.ts` blijft (bestaat al)
- Geen wijzigingen aan logica nodig -- het bestand is klaar voor gebruik

Toevoegen aan `supabase/config.toml`:
```
[functions.stosa-import]
verify_jwt = false
```

### 3. Frontend: StosaImportDialog
Nieuw bestand `src/components/products/StosaImportDialog.tsx`. Aanpassingen t.o.v. het aangeleverde bestand:
- Import path wijzigen: `from '@/lib/supabase'` wordt `from '@/integrations/supabase/client'`
- `react-dropzone` is niet geinstalleerd -- vervangen door een native file input + drag/drop implementatie (geen nieuwe dependency nodig, het project gebruikt al een vergelijkbaar patroon)
- `toast` import aanpassen: `from 'sonner'` (al aanwezig in project)

### 4. Frontend: PriceGroupSelector
Nieuw bestand `src/components/quotes/PriceGroupSelector.tsx`. Aanpassingen:
- Import path wijzigen: `from '@/lib/supabase'` wordt `from '@/integrations/supabase/client'`

### 5. Integratie in ProductImport pagina
In `src/pages/ProductImport.tsx` een STOSA-specifieke import tab of knop toevoegen die de `StosaImportDialog` opent wanneer de geselecteerde leverancier STOSA is (of via een apart tabje).

## Technische Details

### Dependency: react-dropzone
Het aangeleverde `StosaImportDialog.tsx` gebruikt `react-dropzone`. Dit pakket is **niet** geinstalleerd. Twee opties:
- **Optie A**: Installeren als dependency (simpelste aanpak)
- **Optie B**: Vervangen door native HTML5 drag-and-drop met `<input type="file">` (geen extra dependency)

Ik ga voor **Optie A** (installeren) omdat het een kleine, veelgebruikte library is en de code er al op gebouwd is.

### Bestanden die aangemaakt/gewijzigd worden

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/[timestamp]_stosa_import.sql` | Nieuw - database migratie |
| `supabase/functions/stosa-import/index.ts` | Nieuw - edge function |
| `supabase/config.toml` | Wijzigen - stosa-import entry toevoegen |
| `src/components/products/StosaImportDialog.tsx` | Nieuw - import dialog component |
| `src/components/quotes/PriceGroupSelector.tsx` | Nieuw - prijsgroep selector + `usePriceGroupPrice` hook |
| `src/pages/ProductImport.tsx` | Wijzigen - STOSA import knop/tab toevoegen |
| `package.json` | Wijzigen - `react-dropzone` toevoegen |

### Flow samenvatting

1. Gebruiker gaat naar Product Import pagina
2. Selecteert leverancier (STOSA) en klikt "STOSA Import"
3. `StosaImportDialog` opent, gebruiker dropt Excel bestand
4. Frontend parseert Excel, toont preview (producten, FPC-rijen, prijsgroepen)
5. Gebruiker klikt "Importeren"
6. Edge function `stosa-import` ontvangt de rijen en:
   - Maakt 13 prijsgroepen aan (idempotent)
   - Upsert producten
   - Upsert prijzen per prijsgroep
7. Resultaat wordt getoond met statistieken

