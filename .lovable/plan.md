

# Offerte Flow Aanpassingen - Implementatieplan

## Overzicht

De offerte workflow wordt uitgebreid zodat configuratie (leverancier, collectie, prijsgroep, kleuren) op **offerte-niveau** wordt ingesteld als default, in plaats van alleen per sectie. Secties erven automatisch van de offerte, maar kunnen overriden. Daarnaast krijgt elke offerte een **categorie** (Keuken/Sanitair/Meubels/Tegels) en een **auto-gegenereerde referentie** ("Jansen - Keuken - 2026-001").

## Huidige staat

De `quotes` tabel heeft al `default_range_id` en `default_color_id`. De volgende kolommen ontbreken:
- `category` -- offerte-categorie
- `reference` -- leesbare referentie
- `default_supplier_id` -- standaard leverancier
- `default_price_group_id` -- standaard prijsgroep (bij leveranciers met aparte prijsgroepen)
- `default_corpus_color_id` -- standaard korpuskleur

Product ranges hebben al een `collection` veld (bijv. "Evolution", "Look"), dus collectie hoeft niet apart op de offerte.

---

## Fase 1: Database migratie

Nieuwe kolommen op `quotes`:

```sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'keuken';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_price_group_id UUID REFERENCES price_groups(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_corpus_color_id UUID REFERENCES product_colors(id);

CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category);
CREATE INDEX IF NOT EXISTS idx_quotes_default_supplier ON quotes(default_supplier_id);
```

Optioneel: een SQL-functie `generate_quote_reference()` voor het automatisch samenstellen van referenties vanuit klantnaam + categorie + jaar-volgnummer.

---

## Fase 2: QuoteFormDialog uitbreiden

Het dialoog voor "Nieuwe offerte" krijgt twee stappen:

**Stap 1 - Basis:**
- Klant selectie (bestaand)
- Categorie radio buttons: Keuken / Sanitair / Meubels / Tegels
- Referentie (auto-gegenereerd, bewerkbaar): "Jansen - Keuken - 2026-001"
- Geldig tot (bestaand)

**Stap 2 - Standaard configuratie:**
- Leverancier dropdown
- Collectie dropdown (gefilterd op leverancier, uit `product_ranges.collection` distinct)
- Prijsgroep dropdown (gefilterd op leverancier + optioneel collectie)
- Frontkleur dropdown (uit `product_colors` gefilterd op gekozen range)
- Korpuskleur dropdown

De cascade: Leverancier --> Collectie --> Prijsgroep --> Kleuren

Alle nieuwe velden worden opgeslagen op de `quotes` record. De eerste sectie wordt automatisch aangemaakt met de gekozen configuratie.

**Bestanden:**
- `src/components/quotes/QuoteFormDialog.tsx` -- uitbreiden met nieuwe velden
- `src/hooks/useQuotes.ts` -- types updaten

---

## Fase 3: QuoteDetail header + configuratie dialoog

**QuoteHeader.tsx** uitbreiden:
- Toon referentie als hoofdtitel i.p.v. "Offerte #123"
- Categorie badge
- Configuratie-samenvatting tonen: "Stosa Evolution -- E5 Lak Mat / Front: Cachemere Opaco / Korpus: Rose"

**Nieuw bestand: QuoteConfigDialog.tsx**
- Dialoog om offerte-niveau configuratie te wijzigen na aanmaak
- Zelfde cascade dropdowns als in QuoteFormDialog
- Optie: "Bestaande secties bijwerken naar nieuwe standaard?"

**Bestanden:**
- `src/components/quotes/QuoteHeader.tsx` -- referentie, categorie, config samenvatting
- `src/components/quotes/QuoteConfigDialog.tsx` -- nieuw
- `src/pages/QuoteDetail.tsx` -- integratie config dialoog + "Configuratie wijzigen" knop

---

## Fase 4: Sectie inheritance

Secties erven automatisch van de offerte defaults. Alleen als een sectie expliciet een override heeft, wijkt deze af.

**Logica:**
```text
effectiveRangeId = section.range_id || quote.default_range_id
effectiveColorId = section.color_id || quote.default_color_id
hasOverride = section.range_id !== null
```

**UI:**
- Geen override: badge "Gebruikt offerte-standaard"
- Override: waarschuwingsbadge "Afwijkende configuratie" met details

**AddSectionDialog.tsx**: bij aanmaken nieuwe sectie, defaults overnemen van offerte als de velden leeg zijn.

**Bestanden:**
- `src/components/quotes/SortableSectionCard.tsx` -- inherit/override badges
- `src/components/quotes/AddSectionDialog.tsx` -- inherit quote defaults

---

## Fase 5: Prijshierarchie uitbreiden

Huidige hierarchie (3 niveaus):
1. Regel override
2. Sectie range
3. Product base_price

Nieuwe hierarchie (4 niveaus):
1. Regel override (`range_override_id`)
2. Sectie range (`section.range_id`)
3. **Offerte default range** (`quote.default_range_id`) -- NIEUW
4. Product base_price

`fetchProductPrice` uitbreiden met een optionele `quoteDefaultRangeId` parameter.

**Bestanden:**
- `src/hooks/useProductPrices.ts` -- extra parameter
- `src/components/quotes/AddProductDialog.tsx` -- quote default doorgeven
- `src/components/quotes/EditableLineRow.tsx` -- quote default doorgeven
- `src/components/quotes/SortableSectionCard.tsx` -- quote default doorgeven aan children

---

## Fase 6: Dupliceren en converteren

**useDuplicateQuote.ts**: de nieuwe velden (`category`, `reference`, `default_supplier_id`, `default_price_group_id`, `default_corpus_color_id`) meekopieren. Referentie krijgt suffix "(kopie)".

**useConvertQuoteToOrder.ts**: de nieuwe offerte defaults meenemen naar het order (opslaan in bestaande velden of `configuration` JSONB).

**Bestanden:**
- `src/hooks/useQuoteDuplicate.ts`
- `src/hooks/useConvertQuoteToOrder.ts`

---

## Samenvatting bestanden

| Bestand | Actie |
|---------|-------|
| Nieuwe SQL migratie | `category`, `reference`, `default_supplier_id`, `default_price_group_id`, `default_corpus_color_id` op quotes |
| `src/integrations/supabase/types.ts` | Regenerated |
| `src/components/quotes/QuoteFormDialog.tsx` | Categorie, referentie, cascade defaults |
| `src/components/quotes/QuoteHeader.tsx` | Referentie als titel, config samenvatting |
| `src/components/quotes/QuoteConfigDialog.tsx` | **Nieuw** -- config wijzigen na aanmaak |
| `src/pages/QuoteDetail.tsx` | Config dialoog integratie |
| `src/components/quotes/SortableSectionCard.tsx` | Inherit/override badges, quote default doorgeven |
| `src/components/quotes/AddSectionDialog.tsx` | Inherit quote defaults |
| `src/components/quotes/AddProductDialog.tsx` | Quote default range in prijsberekening |
| `src/components/quotes/EditableLineRow.tsx` | Quote default range in prijsberekening |
| `src/hooks/useProductPrices.ts` | 4e niveau in prijshierarchie |
| `src/hooks/useQuoteDuplicate.ts` | Nieuwe velden kopieren |
| `src/hooks/useConvertQuoteToOrder.ts` | Nieuwe velden meenemen |
| `src/hooks/useQuotes.ts` | Types bijwerken |

