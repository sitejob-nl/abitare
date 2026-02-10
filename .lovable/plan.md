
# Offerte Flow -- Opschonen van `as any` casts

## Huidige situatie

De vorige implementatie heeft alle 6 fases van het offerte-flow plan succesvol uitgevoerd:
- Database migratie (category, reference, default_supplier_id, default_price_group_id, default_corpus_color_id)
- QuoteFormDialog met 2-stappen wizard
- QuoteConfigDialog voor wijzigen na aanmaak
- QuoteHeader met referentie, categorie-badge en config-samenvatting
- 4-tier prijshierarchie in useProductPrices
- Dupliceren en converteren met nieuwe velden

De Supabase types zijn correct gegenereerd met alle nieuwe kolommen. Echter, op meerdere plekken worden nog `as any` casts gebruikt terwijl de types nu correct zijn.

## Wat er gedaan moet worden

Verwijderen van onnodige `as any` casts in de volgende bestanden:

### 1. `src/pages/QuoteDetail.tsx`
- Regel 209: `as any` bij createQuote -- niet meer nodig, types bevatten nu `category`, `reference`, `default_supplier_id`
- Regels 225, 235-239, 359-360, 367-373: `(quote as any).reference`, `(quote as any).category`, etc. -- vervangen door directe property access (`quote.reference`, `quote.category`, etc.)

### 2. `src/components/quotes/QuoteFormDialog.tsx`
- Regel 209: `as any` bij het insert-object voor createQuote

### 3. `src/hooks/useQuoteDuplicate.ts`
- Regels 27, 56-60: `(original as any).reference`, `(original as any).category`, etc.
- Regel 61: `as any` bij het hele insert-object

### 4. `src/hooks/useConvertQuoteToOrder.ts`
- Regels 56-57: `(quote as any).reference`, `(quote as any).category`

### 5. `src/components/quotes/QuoteConfigDialog.tsx`
- Regel 135: `as any` bij updateQuote call

Dit is puur een code-kwaliteitsverbetering -- geen functionele wijzigingen. Alle `as any` casts zijn overbodig geworden doordat de types correct zijn gegenereerd.
