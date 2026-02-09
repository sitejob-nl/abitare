
# Fix: Prijs-insert errors zichtbaar maken

## Probleem
De logs tonen dat alle 2.632 prijzen als "valid" door de filter komen, maar er worden **0 prijzen** daadwerkelijk opgeslagen. De insert-fouten worden niet naar `console.error` geschreven (zelfde bug als eerder bij de product-upserts), waardoor ze onzichtbaar zijn.

## Oorzaak
Regel 363-364 in `import-products/index.ts`:
```typescript
if (priceError) {
  errors.push(`Price insert error batch ...`);  // alleen in array, niet gelogd!
}
```

Waarschijnlijk faalt de insert door een database-constraint (bijv. een unieke index op `product_id + range_id + variant_2_code`, of een ontbrekende kolom). Maar zonder logging weten we niet wat de exacte fout is.

## Oplossing

### 1. Edge function (`import-products/index.ts`)
- Voeg `console.error` toe bij prijs-insert fouten (net zoals bij de product-upserts)
- Voeg een batch-samenvatting toe voor prijzen (X geslaagd, Y gefaald)
- Log het eerste mislukte price record zodat we de exacte constraint-fout kunnen zien

### 2. Deploy en test
- Deploy de aangepaste edge function
- Importeer opnieuw
- Controleer de logs voor de specifieke foutmelding

Na de eerste test weten we precies welke constraint faalt en kunnen we die gericht fixen.

## Technische wijzigingen

**`supabase/functions/import-products/index.ts`** (regel 363-368):
```typescript
// VOOR:
if (priceError) {
  errors.push(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${priceError.message}`)
}

// NA:
if (priceError) {
  console.error(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${priceError.message}`)
  if (priceBatchesFailed === 0) {
    console.error(`First failing price record sample:`, JSON.stringify(pricesToInsert[0]))
  }
  priceBatchesFailed++
  errors.push(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${priceError.message}`)
} else {
  priceBatchesSucceeded++
  pricesInserted += insertedPrices?.length || 0
}
```

Plus een samenvatting-log na de loop:
```typescript
console.log(`Price insert summary: ${priceBatchesSucceeded} batches succeeded, ${priceBatchesFailed} batches failed`)
```
