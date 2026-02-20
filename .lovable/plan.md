

# Update STOSA Import Dialog - Flexibele kolomherkenning

## Probleem
Het huidige `StosaImportDialog` zoekt naar exacte kolomnamen zoals `"Codice gestionale"` en `"Prezzo Listino"`. Het STOSA Excel bestand bevat echter kolomnamen met extra spaties (bijv. `" Prezzo Listino "`) waardoor de kolommen niet herkend worden en het bestand als "onbekend formaat" wordt afgewezen.

## Oplossing
Het `StosaImportDialog.tsx` vervangen door de v5-2 versie met:

1. **Flexibele kolomherkenning** via `COLUMN_ALIASES` mapping - meerdere namen per kolom worden herkend
2. **Automatisch trimmen** van kolomnamen (spaties verwijderen)
3. **Fuzzy matching** als fallback (bijv. kolom bevat "prezzo" EN "listino" -> match)
4. **`normalizeRow()`** functie die alle rijen omzet naar standaard kolomnamen
5. **Verbeterde UI** met sheet-naam weergave, herkende kolommen, batch-indicatie en eenheid-statistieken na import

## Wat verandert er
De edge function (`index.ts`) en `PriceGroupSelector.tsx` zijn al up-to-date en hoeven niet te wijzigen.

## Technische details

### Bestand: `src/components/products/StosaImportDialog.tsx`
Volledig vervangen door de v5-2 versie met:
- Import path behouden als `@/integrations/supabase/client` (niet `@/lib/supabase`)
- `COLUMN_ALIASES` object met alternatieve namen per kolom
- `findStandardColumnName()` met exact match + alias match + fuzzy fallback
- `normalizeRow()` voor row-level kolomnaam-normalisatie
- Uitgebreide `ParseResult` interface (met `warnings`, `detectedColumns`, `missingColumns`, `sheetName`)
- Uitgebreide `ImportStats` interface (met `categories_created`, `discount_groups_created`, `by_category`, `by_unit`, `by_kitchen_group`)
- Verbeterde UI: sheet-naam tonen, batch-info, eenheid-badges na import, waarschuwingen-sectie

| Bestand | Actie |
|---------|-------|
| `src/components/products/StosaImportDialog.tsx` | Vervangen door v5-2 versie (met aangepaste import path) |

