
# Offerte Flow - 5 Openstaande Taken

## Overzicht

Er zijn 5 taken die de offerte flow compleet maken. De meeste wijzigingen zitten in `QuoteFormDialog.tsx`.

---

## Taak 1: Prijsgroep koppelen aan state (QuoteFormDialog)

De prijsgroep dropdown op regel 507 gebruikt `defaultValue=""` zonder state-binding. Dit wordt gekoppeld aan een `priceGroupId` state variabele zodat de selectie daadwerkelijk wordt opgeslagen.

## Taak 2: Front- en korpuskleur dropdowns toevoegen (QuoteFormDialog)

Twee nieuwe dropdowns in Stap 2 van de wizard:
- **Frontkleur** -- gefilterd op range of prijsgroep
- **Korpuskleur** -- zelfde bron

Worden alleen getoond als er een leverancier is geselecteerd.

## Taak 3: Alle defaults opslaan in onSubmit (QuoteFormDialog)

Drie ontbrekende velden toevoegen aan het `createQuote.mutateAsync()` call:
- `default_price_group_id`
- `default_color_id`
- `default_corpus_color_id`

Deze database-kolommen bestaan al en zijn correct getypeerd.

## Taak 4: Referentie met volgnummer

Huidige output: `"Jansen - Keuken - 2026"`
Gewenste output: `"Jansen - Keuken - 2026-001"`

Aanpak:
1. Database functie `generate_quote_reference(p_customer_name, p_category)` aanmaken die het volgende volgnummer berekent op basis van bestaande offertes
2. Frontend: RPC-call in de `useEffect` die de referentie genereert

## Taak 5: AddSectionDialog erft prijsgroep default

- Prop `quoteDefaultPriceGroupId` toevoegen aan `AddSectionDialog`
- State initialiseren met deze default bij openen
- In `QuoteDetail.tsx` de prop meegeven: `quote.default_price_group_id`

---

## Technisch Detail

### Bestanden die wijzigen

| Bestand | Taken |
|---------|-------|
| `src/components/quotes/QuoteFormDialog.tsx` | 1, 2, 3, 4 |
| `src/components/quotes/AddSectionDialog.tsx` | 5 |
| `src/pages/QuoteDetail.tsx` | 5 |
| Nieuwe SQL migratie | 4 |

### Database migratie (Taak 4)

```sql
CREATE OR REPLACE FUNCTION generate_quote_reference(
  p_customer_name TEXT,
  p_category TEXT DEFAULT 'Keuken'
) RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_clean_name TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_clean_name := TRIM(SPLIT_PART(p_customer_name, ',', 1));

  SELECT COALESCE(MAX(
    CASE 
      WHEN reference ~ (v_year || '-[0-9]+$')
      THEN SUBSTRING(reference FROM '[0-9]+$')::INTEGER
      ELSE 0
    END
  ), 0) + 1 INTO v_seq
  FROM quotes
  WHERE reference LIKE v_clean_name || ' - ' || p_category || ' - ' || v_year || '-%';

  RETURN v_clean_name || ' - ' || p_category || ' - ' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

### QuoteFormDialog wijzigingen

- Nieuwe state: `priceGroupId`, `colorId`, `corpusColorId`
- Prijsgroep Select: `value={priceGroupId} onValueChange={setPriceGroupId}`
- Twee kleur-dropdowns toevoegen na prijsgroep (alleen zichtbaar bij leverancier)
- `onSubmit`: drie velden toevoegen aan createQuote call
- `useEffect` referentie: async RPC call i.p.v. lokale string-concatenatie
- Reset states bij `handleClose` en `handleSupplierChange`

### AddSectionDialog wijzigingen

- Nieuwe prop: `quoteDefaultPriceGroupId?: string | null`
- `useEffect` bij open: `setPriceGroupId(quoteDefaultPriceGroupId || "")`
- QuoteDetail.tsx: prop doorgeven
