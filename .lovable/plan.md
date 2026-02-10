
# Fix Exact Online Factuursynchronisatie

Er zijn twee fouten die het pushen van facturen blokkeren. Beide worden opgelost in de edge function `exact-sync-invoices`.

---

## Probleem 1: "Ongeldig: Dagboek (Type)"

Het journaal is hardcoded als `"70"`, maar dit journaaltype is niet geschikt voor SalesEntries in jullie Exact administratie.

**Oplossing:** Automatisch het juiste verkoopjournaal ophalen via de `financial/Journals` API. Er wordt gefilterd op Type `50` (General journal) die geschikt is voor SalesEntries. Als fallback wordt gezocht naar journals met "verkoop" in de omschrijving.

## Probleem 2: "OriginalAmountDC" bestaat niet

Het `ReceivablesList` endpoint in jullie Exact Online versie kent het veld `OriginalAmountDC` niet.

**Oplossing:** Alleen de velden ophalen die beschikbaar zijn. In plaats van `OriginalAmountDC` wordt `Amount` (het originele bedrag) of `InvoiceAmountDC` gebruikt, en `AmountDC` voor het openstaande bedrag. De `$select` parameter wordt aangepast naar de juiste veldnamen.

---

## Technische wijzigingen

### Bestand: `supabase/functions/exact-sync-invoices/index.ts`

1. **Nieuwe functie `getDefaultSalesJournal`**: Haalt beschikbare journals op via `financial/Journals`, filtert op types die geschikt zijn voor SalesEntries (type 50 of 20), en cached het resultaat per batch.

2. **`mapToExactSalesEntry`**: Accepteert nu een `journalCode` parameter in plaats van hardcoded `"70"`.

3. **`pushInvoicesInternal`**: Roept `getDefaultSalesJournal` aan en geeft de gevonden journaalcode door.

4. **`fetchReceivablesList`**: Vervangt `OriginalAmountDC` in de `$select` door `Amount` (het originele factuurbedrag). Past de berekening aan om `Amount` te gebruiken in plaats van `OriginalAmountDC`.
