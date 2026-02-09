

# Fix 3 Importproblemen + Stosa Data Opschonen

## Analyse van de problemen

### Probleem 1: Verkeerde range codes (ROOT CAUSE)
De edge function logs tonen dat `range_code` waarden als "011", "012", "013" bevat in plaats van "DEA", "HPA", "IRA". Dit betekent dat de **kolom-mapping fout gaat**: een verkeerde kolom wordt als `range_code` gebruikt. Hierdoor worden 2.667 onzinnige ranges aangemaakt (met codes als "00", "001", "00A" en namen als "MOL", "TEL").

De `extractedPriceGroups` gebruikt `range_name` (die eigenlijk het type "MOL" bevat vanuit "Variabile 1") als naam, en de verkeerde kolom als code.

**Fix**: De kolom-mapping en extractie-logica in `ProductImport.tsx` debuggen en corrigeren. Waarschijnlijk matcht "Variante 1" op een andere kolom dan verwacht, of de Excel heeft net iets andere kolomnamen. Extra logging toevoegen bij auto-detect om te zien welke kolom aan welke mapping wordt gekoppeld.

### Probleem 2: base_price niet gevuld
In `extractedProducts` (regel 362-391) wordt `base_price` nergens uit de data gehaald. De `PriceGroupProduct` interface in de edge function (regel 17-25) mist ook het `base_price` veld. Hierdoor hebben alle 15.123 producten `base_price = null`.

**Fix**: 
- Frontend: bij het groeperen per article_code, de prijs uit rijen ZONDER variant opslaan als `base_price`
- Edge function: `base_price` toevoegen aan interface en meesturen bij product upsert

### Probleem 3: Duplicate key bij prijzen
De cleanup in stap 3 (regel 301-315) verwijdert alleen prijzen met matching `range_id`s. Als er al prijzen bestaan van een eerdere import (met dezelfde of andere ranges), faalt de insert op de unique constraint `(product_id, range_id, valid_from)`.

**Fix**: Bij cleanup ALLE prijzen voor de supplier's producten verwijderen, niet alleen voor de huidige ranges. Dit garandeert een schone staat voor elke herimport.

---

## Implementatieplan

### Stap 1: Database opschonen (migratie)
Alle Stosa data verwijderen zodat we schoon kunnen beginnen:
- Verwijder alle `product_prices` voor Stosa-producten
- Verwijder alle `product_ranges` voor Stosa
- Verwijder alle `products` voor Stosa
- Stosa supplier_id: `29a8e1aa-35da-4784-99ff-23129f36fe22`

### Stap 2: Frontend - base_price extractie (`src/pages/ProductImport.tsx`)
- `extractedProducts` aanpassen: voor elke article_code de `base_price` ophalen uit de eerste rij die GEEN variant heeft (lege `range_code`)
- Console logging toevoegen bij `autoDetectMapping` zodat we kunnen zien welke Excel-kolom aan welke mapping wordt gekoppeld

### Stap 3: Frontend - range extractie verbeteren (`src/pages/ProductImport.tsx`)
- Debug-logging toevoegen aan `extractedPriceGroups` om te verifieren welke kolom-data gebruikt wordt
- Rijen met lege `range_code` uitsluiten van de price-extractie (dat zijn de base-price rijen)
- `extractedPriceGroups` moet de `range_name` uit de juiste kolom ("Descrizione 1a variabile") halen, en `range_type` uit "Variabile 1"

### Stap 4: Hook - interface uitbreiden (`src/hooks/useProductImport.ts`)
- `PriceGroupProduct` interface: `base_price?: number` toevoegen

### Stap 5: Edge Function - 3 fixes (`supabase/functions/import-products/index.ts`)
1. `PriceGroupProduct` interface uitbreiden met `base_price?: number`
2. Bij product upsert (stap 2) `base_price` meesturen: `base_price: p.base_price || null`
3. Cleanup (stap 3) aanpassen: verwijder ALLE `product_prices` voor deze supplier's producten, ongeacht `range_id`:
   ```
   // In plaats van: .in('range_id', rangeIds)
   // Gewoon: delete alle prices voor productIds
   ```

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| Nieuwe migratie | DELETE Stosa producten, ranges, prijzen |
| `src/pages/ProductImport.tsx` | base_price extractie, debug logging, range mapping fix |
| `src/hooks/useProductImport.ts` | `base_price` aan PriceGroupProduct interface |
| `supabase/functions/import-products/index.ts` | base_price in upsert, bredere cleanup |

## Verwacht resultaat na herimport
- Producten met correcte `base_price` uit rijen zonder variant
- Ranges met correcte codes (DEA, HPA, IRA, etc.) en namen
- Prijzen correct gekoppeld zonder duplicate key fouten
- Herhaalde import werkt foutloos dankzij bredere cleanup

