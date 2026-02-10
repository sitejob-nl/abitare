
# Fix: mapToExactSalesEntry niet gedefinieerd

## Probleem

De laatste edit heeft een onvolledig commentaarblok achtergelaten op regel 552. Er staat:

```
/**
function mapToExactSalesEntry(...)
```

Het `/**` opent een block comment, maar de sluitende `*/` ontbreekt. Hierdoor wordt de hele `mapToExactSalesEntry` functie als commentaar behandeld door de parser, wat resulteert in de runtime error:

```
ReferenceError: mapToExactSalesEntry is not defined
```

## Oplossing

Regel 552 (`/**`) vervangen door een correct JSDoc-blok met sluitende `*/` voor de functie:

```
/**
 * Map order to Exact SalesEntry (financiele boeking).
 * Uses SalesEntries endpoint instead of SalesInvoices - no Item required.
 */
function mapToExactSalesEntry(...)
```

Dit is een fix van 1 regel (het toevoegen van de ontbrekende `*/` en tussenliggende beschrijving). Verder geen wijzigingen nodig.

## Bestand

- `supabase/functions/exact-sync-invoices/index.ts` -- regel 552 herstellen
- Daarna opnieuw deployen van de `exact-sync-invoices` edge function
