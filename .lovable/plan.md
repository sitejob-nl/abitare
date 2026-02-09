
# Fix: productMap volledig vullen na upsert

## Probleem
De edge function's `productMap` bevat maar 3.000 van de 15.123 geuploadde producten. Dit komt door twee bugs:

1. **Supabase 1000-rij limiet**: De query `allExistingProducts` haalt maximaal 1.000 rijen op
2. **Upsert response incompleet**: Bij duplicaten binnen een batch geeft de `.select()` minder rijen terug dan verwacht

Daardoor matchen prijzen met article codes als `200BA00001` niet, terwijl die producten WEL in de database staan.

## Oplossing

### Edge function (`import-products/index.ts`)

Na alle product-upserts, vervang de huidige `existingProductMap` merge door een **volledige herquery** van alle producten voor deze leverancier, met paginatie:

```
// Na alle upserts: haal ALLE producten op met paginatie
const productMap = new Map()
let offset = 0
const pageSize = 1000
while (true) {
  const { data } = await supabase
    .from('products')
    .select('id, article_code')
    .eq('supplier_id', supplierId)
    .range(offset, offset + pageSize - 1)
  
  if (!data || data.length === 0) break
  data.forEach(p => productMap.set(p.article_code, p.id))
  offset += pageSize
  if (data.length < pageSize) break
}
```

Dit vervangt zowel de `existingProductMap` als de `productMap` vulling uit upsert responses, en garandeert dat ALLE product IDs beschikbaar zijn voor prijs-matching.

### Wijzigingen
1. **`supabase/functions/import-products/index.ts`**: Vervang de productMap-vulling na upsert door een paginated re-fetch
2. Voeg logging toe: sample van product article codes in productMap om te verifieren dat `200BA...` codes er nu WEL in zitten
3. Deploy en test

### Verwacht resultaat
- productMap bevat alle ~15.000 producten (incl. `200BA...` codes)
- Alle 2.632 prijzen matchen met productMap
- Prijzen worden succesvol opgeslagen
