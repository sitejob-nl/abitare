

# Fase 4: Offerte Flow met Prijsgroep Selectie en Per-Regel Override

## Wat wordt er gebouwd?

Wanneer je een product aan een offerte toevoegt, wordt de prijs automatisch bepaald op basis van de sectie-configuratie (prijsgroep/range). Daarnaast kan per offerteregel een afwijkende prijsgroep worden ingesteld ("override"), zodat individuele producten een andere prijs/kleur kunnen krijgen zonder de rest van de offerte te wijzigen.

De prijs wordt bepaald volgens deze hierarchie:
1. **Regel-override** -- als de regel een eigen prijsgroep heeft, gebruik die prijs
2. **Sectie-default** -- anders de prijsgroep van de sectie (range_id)
3. **Base price** -- als er geen prijsgroep-prijs is, de basisprijs van het product

---

## Stappen

### Stap 1: Database migratie
Twee nieuwe kolommen toevoegen aan `quote_lines`:
- `range_override_id` (UUID, FK naar product_ranges) -- per-regel prijsgroep override
- `color_override` (VARCHAR) -- per-regel kleur override tekst

### Stap 2: AddProductDialog uitbreiden
- Na productselectie, toon een optioneel "Override prijsgroep" dropdown
- Wanneer een override wordt gekozen, haal de prijs op uit die prijsgroep in plaats van de sectie-default
- Badge toont "Prijsgroep prijs", "Override prijs" of "Basisprijs" afhankelijk van de bron

### Stap 3: EditableLineRow - override UI
- Nieuwe klikbare kolom/icoon per regel om een prijsgroep-override in te stellen
- Wanneer een override actief is: visuele indicator (waarschuwings-badge of andere kleur)
- Bij wijziging van de override: automatisch de prijs herberekenen via `fetchProductPrice`

### Stap 4: Prijsbepaling centraliseren
- `fetchProductPrice` uitbreiden: accepteert zowel `rangeId` (sectie-default) als `overrideRangeId` (regel-override)
- Hierarchie: override > sectie-default > base_price
- Hergebruik in zowel AddProductDialog als EditableLineRow

### Stap 5: Quote-to-Order conversie
- `range_override_id` en `color_override` meenemen bij het converteren van offerte naar order (als die kolommen ook op order_lines bestaan, anders opslaan in het bestaande `configuration` JSONB veld)

---

## Technische details

### Database migratie
```sql
ALTER TABLE quote_lines 
  ADD COLUMN IF NOT EXISTS range_override_id UUID REFERENCES product_ranges(id),
  ADD COLUMN IF NOT EXISTS color_override VARCHAR(255);
```

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| Nieuwe migratie | `range_override_id` + `color_override` op quote_lines |
| `src/integrations/supabase/types.ts` | Regenerated types |
| `src/components/quotes/AddProductDialog.tsx` | Override prijsgroep dropdown + aangepaste prijslogica |
| `src/components/quotes/EditableLineRow.tsx` | Override indicator + inline override selector |
| `src/hooks/useProductPrices.ts` | `fetchProductPrice` uitbreiden met override parameter |
| `src/hooks/useQuoteLines.ts` | `range_override_id` meesturen bij create/update |
| `src/components/quotes/QuoteSectionCard.tsx` | Override range doorgeven aan line rows |

### Prijs-lookup flow (pseudocode)
```text
fetchProductPrice(productId, sectionRangeId, overrideRangeId?)
  1. if overrideRangeId -> query product_prices WHERE range_id = overrideRangeId
  2. if sectionRangeId -> query product_prices WHERE range_id = sectionRangeId  
  3. fallback -> product.base_price
```

### UI voorbeeld override op een regel
- Normale regel: geen indicator, prijs uit sectie-default
- Override regel: klein badge "Override: E7" naast de omschrijving, prijs uit E7
- Klik op badge om override te wijzigen of te verwijderen
