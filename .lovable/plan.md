
# Fix STOSA Import - Twee problemen oplossen

## Probleem 1: Prijzen worden als tekst verstuurd
De `Prezzo Listino` kolom in het Excel bestand bevat waarden als `"819.00 €"` (tekst met euroteken). De edge function verwacht een getal maar ontvangt een string. Er is geen prijsparsing in de edge function -- de waarde wordt direct vergeleken met `<= 0` en daarna opgeslagen.

**Oplossing**: Prijsparsing toevoegen in de edge function (`stosa-import/index.ts`). Een `parsePrice()` functie die het euroteken verwijdert en de string naar een getal converteert (vergelijkbaar met de bestaande `parsePrice` in `useProductImport.ts`).

## Probleem 2: Payload te groot
Het Excel bestand bevat 8.300+ rijen. Als JSON is dit ca. 2-3MB, wat de Supabase edge function body limit (standaard ~1MB) overschrijdt. Hierdoor faalt het request voordat de function überhaupt draait.

**Oplossing**: De rijen opsplitsen in chunks van maximaal 2.000 rijen per request in de frontend (`StosaImportDialog.tsx`). De edge function verwerkt elke chunk apart. De frontend stuurt meerdere requests achter elkaar en combineert de resultaten.

## Technische wijzigingen

### 1. Edge function: `supabase/functions/stosa-import/index.ts`
- `parsePrice()` helper functie toevoegen die strings als `"819.00 €"`, `"1.275,00"`, `"1,200.00 €"` correct naar getallen converteert
- Prijsparsing toepassen op regel 452: `const price = parsePrice(row['Prezzo Listino'])`
- Prijsparsing ook toepassen op dimensie-velden (`Dimensione 1/2/3`) voor het geval die ook als tekst binnenkomen

### 2. Frontend: `src/components/products/StosaImportDialog.tsx`
- Chunking logica toevoegen aan `handleImport()`: splits `parseResult.rows` in batches van 2.000
- Per batch een apart request naar de edge function sturen
- Progress bar per batch bijwerken
- Stats van alle batches combineren tot een totaaloverzicht
- Foutafhandeling per batch (bij fout in 1 batch, ga door met de rest)

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/stosa-import/index.ts` | `parsePrice()` toevoegen + toepassen op prijzen en dimensies |
| `src/components/products/StosaImportDialog.tsx` | Chunking van rows in batches van 2.000 per request |
