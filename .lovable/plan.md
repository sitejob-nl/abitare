
# Fix Model/Collectie Cascade en Prijsgroep Volgorde

## Gevonden problemen

### 1. Verkeerde bron voor collecties en modellen
De collectie-dropdown haalt collecties op uit `product_ranges`, maar voor Stosa bevat die tabel 100+ technische entries (element finishes, top types, leg finishes, etc.) waarvan slechts 1 een `collection` heeft ("evolution"). De `price_groups` tabel bevat de juiste collecties: "evolution" EN "look".

### 2. "Prijsgroep / Model" toont verkeerde data
Voor leveranciers met `has_price_groups=true` (Stosa) toont de dropdown alle `product_ranges` -- dat zijn geen prijsgroepen maar technische metadata. De echte prijsgroepen staan in de `price_groups` tabel (E1-E10, L1-L10).

### 3. Prijsgroepen niet gegroepeerd op collectie
De `price_groups` worden opgehaald gesorteerd op `sort_order`, maar dat mixt collecties door elkaar: E1, L1, E2, L2, E3, L3... Ze moeten eerst op collectie en dan op `sort_order` gesorteerd worden.

### 4. Korpuskleur afhankelijk van onbestaande data
De korpuskleur dropdown filtert op `rangeId`, maar er zijn nog geen `product_colors` in de database. Dit is geen bug om nu te fixen, maar de UI moet er wel mee overweg kunnen.

---

## Oplossing

### Stap 1: `usePriceGroups` hook -- sortering fixen
Sorteren op `collection` + `sort_order` zodat prijsgroepen gegroepeerd worden per collectie.

```
ORDER BY collection ASC, sort_order ASC
```

### Stap 2: QuoteConfigDialog -- cascade logica fixen
- **Collectie dropdown**: ophalen uit `price_groups` (distinct collection) in plaats van `product_ranges`
- **Prijsgroep dropdown**: altijd tonen voor `has_price_groups` leveranciers, gefilterd op geselecteerde collectie
- **"Prijsgroep / Model" dropdown** (product_ranges): verbergen voor leveranciers met `has_price_groups=true` -- die hebben immers de `price_groups` dropdown
- Kleuren: korpuskleur dropdown graceful tonen (lege lijst is OK)

### Stap 3: QuoteFormDialog -- zelfde cascade logica
Identieke fixes als QuoteConfigDialog:
- Collecties uit `price_groups` halen
- Product ranges dropdown verbergen voor `has_price_groups` leveranciers
- Prijsgroepen gefilterd op collectie tonen

### Stap 4: `useProductRanges` -- sortering verbeteren
Sorteren op `code` in plaats van `price_group` (dat veld is null voor de meeste ranges).

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/usePriceGroups.ts` | Sortering: `collection ASC, sort_order ASC` |
| `src/hooks/useProductRanges.ts` | Sortering: `code ASC` i.p.v. `price_group ASC` |
| `src/components/quotes/QuoteConfigDialog.tsx` | Collecties uit price_groups; ranges verbergen bij has_price_groups; prijsgroep gefilterd op collectie |
| `src/components/quotes/QuoteFormDialog.tsx` | Zelfde cascade-fixes als QuoteConfigDialog |
