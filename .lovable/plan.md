

# Offerte Detailpagina met Secties en Producten

## Huidige Situatie

Op dit moment kun je:
- Een lijst met offertes bekijken
- Een lege offerte aanmaken (klant + geldig-tot datum)

Maar je kunt **niet**:
- Op een offerte klikken om de inhoud te zien
- Secties toevoegen (Woonkamer, Keuken, etc.)
- Producten/regels toevoegen aan secties
- Totalen berekenen

De database structuur is wel correct opgezet met `quotes`, `quote_sections` en `quote_lines` tabellen.

---

## Wat wordt er gebouwd?

### 1. Klikbare Offertes in Lijst
Wanneer je op een offerte klikt in `/quotes`, navigeer je naar `/quotes/{id}`.

### 2. Offerte Detailpagina (`/quotes/:id`)

```text
+------------------------------------------------------------------+
|  < Terug naar offertes                                            |
|                                                                   |
|  Offerte #3                                    Status: [Concept v]|
|  Klant: Test Gebruiker                         Geldig tot: 4 mrt  |
+------------------------------------------------------------------+
|                                                                   |
|  [+ Nieuwe sectie]                                               |
|                                                                   |
|  +--------------------------------------------------------------+|
|  | SECTIE: Woonkamer                              [Bewerken] [X] ||
|  |--------------------------------------------------------------|
|  | Artikel    | Omschrijving      | Aantal | Prijs   | Totaal   ||
|  |--------------------------------------------------------------|
|  | PRD-001    | Gordijnen linnen  | 2      | € 150   | € 300    ||
|  | PRD-002    | Montage           | 1      | € 75    | € 75     ||
|  |                                                    -----------||
|  |                                        Sectie totaal: € 375   ||
|  | [+ Product toevoegen]                                         ||
|  +--------------------------------------------------------------+|
|                                                                   |
|  +--------------------------------------------------------------+|
|  | Subtotaal excl. BTW:                              € 375,00   ||
|  | BTW 21%:                                          € 78,75    ||
|  | TOTAAL:                                           € 453,75   ||
|  +--------------------------------------------------------------+|
|                                                                   |
|  [Opslaan]                              [Versturen naar klant]    |
+------------------------------------------------------------------+
```

### 3. Sectie Management
- Secties aanmaken met titel en type (meubelen, apparatuur, werkbladen, montage)
- Secties bewerken en verwijderen
- Secties slepen om volgorde te wijzigen

### 4. Producten Toevoegen
- Producten zoeken uit de `products` tabel
- Aantal, prijs en korting aanpassen
- Vrije regels toevoegen (zonder product)
- Automatische berekening van regeltotaal

### 5. Totalen Berekening
Automatisch berekend bij elke wijziging:
- Sectie subtotalen
- Subtotaal producten + montage
- BTW berekening (21%)
- Eindtotaal incl. BTW

---

## Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/pages/QuoteDetail.tsx` | Hoofdpagina voor offerte details |
| `src/components/quotes/QuoteHeader.tsx` | Header met klant, status, datum |
| `src/components/quotes/QuoteSectionCard.tsx` | Sectiekaart met regels |
| `src/components/quotes/QuoteLineRow.tsx` | Enkele productregel |
| `src/components/quotes/AddSectionDialog.tsx` | Modal om sectie toe te voegen |
| `src/components/quotes/AddProductDialog.tsx` | Modal om product toe te voegen |
| `src/components/quotes/QuoteTotals.tsx` | Totalen overzicht |
| `src/hooks/useQuoteSections.ts` | CRUD voor quote_sections |
| `src/hooks/useQuoteLines.ts` | CRUD voor quote_lines |

---

## Bestaande Bestanden Aanpassen

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Route toevoegen: `/quotes/:id` |
| `src/pages/Quotes.tsx` | Rijen klikbaar maken met `onClick` navigatie naar detail |
| `src/hooks/useQuotes.ts` | Mutation toevoegen voor totalen update |

---

## Technische Details

### useQuoteSections Hook

```typescript
// Ophalen secties met regels
useQuoteSections(quoteId: string)

// Aanmaken
useCreateQuoteSection()
// Input: { quote_id, section_type, title, sort_order }

// Updaten
useUpdateQuoteSection()
// Input: { id, title?, section_type?, sort_order? }

// Verwijderen (cascade delete regels)
useDeleteQuoteSection()
```

### useQuoteLines Hook

```typescript
// Ophalen regels voor een sectie
useQuoteLines(sectionId: string)

// Aanmaken
useCreateQuoteLine()
// Input: { quote_id, section_id, product_id?, description, quantity, unit_price, discount_percentage, vat_rate }

// Updaten (bij wijzigen aantal/prijs)
useUpdateQuoteLine()

// Verwijderen
useDeleteQuoteLine()
```

### Product Toevoegen Flow

1. Gebruiker klikt "Product toevoegen" in een sectie
2. Modal opent met producten zoekfunctie (gebruikt bestaande `useProducts`)
3. Gebruiker selecteert product, vult aantal in
4. Prijs wordt automatisch ingevuld vanuit `product.base_price`
5. `line_total = quantity * unit_price * (1 - discount_percentage/100)`
6. Na opslaan worden totalen herberekend

### Totalen Berekening

Bij elke wijziging in regels:
```
section.subtotal = SUM(lines.line_total) per sectie
quote.subtotal_products = SUM(sections.subtotal) waar type != 'montage'
quote.subtotal_montage = SUM(sections.subtotal) waar type == 'montage'
quote.total_excl_vat = subtotal_products + subtotal_montage - discount_amount
quote.total_vat = total_excl_vat * 0.21
quote.total_incl_vat = total_excl_vat + total_vat
```

---

## Samenvatting

| Feature | Status |
|---------|--------|
| Route `/quotes/:id` | Nieuw |
| Offerte header bekijken/bewerken | Nieuw |
| Secties toevoegen/verwijderen | Nieuw |
| Producten zoeken en toevoegen | Nieuw |
| Regels bewerken (aantal, prijs, korting) | Nieuw |
| Vrije regels zonder product | Nieuw |
| Automatische totaalberekening | Nieuw |
| Klikbare rijen in offertes lijst | Aanpassing |

