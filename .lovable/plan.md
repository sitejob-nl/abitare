
# Fix: Stosa Import - Prijzen worden niet opgeslagen

## Probleem Analyse

De edge function logs tonen het resultaat van je laatste import:

```
15.123 producten verwerkt → 3.000 in DB (deduplicatie)
629 ranges → 0 nieuwe (bestonden al van vorige import)
2.632 prijzen verstuurd → 0 opgeslagen
23 price groups gelinkt
```

Er zijn **drie problemen** gevonden:

### Probleem 1: Te weinig prijzen uit frontend (2.632 van ~69.000)
De frontend `extractedPrices` filtert met `parsePrice()` en `price > 0`. Waarschijnlijk worden veel prijzen niet correct geparsed vanuit de Excel data, waardoor ze als 0 of undefined uitkomen.

### Probleem 2: rangeMap bevat geen bestaande ranges
In de edge function worden bestaande ranges opgehaald en in `rangeMap` gezet, maar de `validPrices` filter checkt `rangeMap.has(p.range_code)`. Het probleem: de frontend stuurt range codes zoals "701", "402" etc., en de `rangeMap` wordt correct gevuld. **Maar** de `productMap` wordt alleen gevuld door stap 2's upsert response. Als de upsert `ignoreDuplicates: false` draait maar de response niet alle IDs teruggeeft (Supabase upsert quirk), dan zijn er artikelcodes in `productMap` die niet matchen.

### Probleem 3: Article codes mismatch
De producten worden gedeinigreerd in de frontend (`extractedProducts` pakt alleen unieke article_codes), maar de prijzen refereren naar `article_code` uit elke rij. Als het Excel bestand een composite article_code gebruikt (bijv. met prefix "X3M"), dan matchen de prijzen-rijen niet met de product-codes in `productMap`.

## Oplossing

### Stap 1: Edge function debuggen - logging toevoegen
Voeg gedetailleerde logging toe om te zien waarom prijzen niet matchen:
- Log een sample van `data.prices` (eerste 5)
- Log `productMap` size en `rangeMap` size
- Log hoeveel van `data.prices` een match hebben in productMap en rangeMap
- Log specifiek welke article_codes en range_codes NIET matchen

### Stap 2: Fix productMap vulling
Na de upsert moeten we ook bestaande producten ophalen als de upsert response incompleet is. Momenteel worden bestaande producten in `existingProductMap` opgehaald maar nooit naar `productMap` gekopieerd. **Dit is het hoofdprobleem.**

```
// HUIDIGE CODE (fout):
existingProductMap → alleen gebruikt voor telling
productMap → alleen gevuld vanuit upsert response

// FIX:
existingProductMap → ook kopiiren naar productMap
```

### Stap 3: Fix rangeMap vulling (zelfde issue)
Bestaande ranges worden in `existingRangeMap` gezet en naar `rangeMap` gekopieerd - dit lijkt correct. Maar verifieer dit.

### Stap 4: Frontend parsePrice debugging
Voeg een console.log toe in de frontend om te verifiieren dat prijzen correct geparsed worden uit het Excel bestand. De `raw: false` optie in XLSX parsing geeft geformatteerde strings terug - dit kan problemen geven met prijzen.

## Technische wijzigingen

### 1. `supabase/functions/import-products/index.ts`
- **Stap 2 fix**: Na de product upsert, kopieer `existingProductMap` entries naar `productMap` zodat alle bekende product IDs beschikbaar zijn voor de prijs-matching
- Voeg debug logging toe voor `validPrices` filtering
- Log sample mismatches

### 2. `src/pages/ProductImport.tsx`  
- Voeg een console.log toe die toont hoeveel prijzen `extractedPrices` bevat vs. hoeveel gefilterd worden
- Overweeg `raw: true` in XLSX parsing voor numerieke kolommen

### 3. Deploy en test
- Deploy de aangepaste edge function
- Vraag de gebruiker om opnieuw te importeren
- Controleer de logs voor debug output

## Verwacht resultaat
Na de fix zouden alle ~69.000 prijs-combinaties correct opgeslagen moeten worden, gekoppeld aan de 3.000 producten en 2.667 ranges.
