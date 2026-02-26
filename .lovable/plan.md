

## Plan: Groepkoppen, artikelcodes verbergen & alleen totaalprijs op offerte

Er zijn drie wijzigingen gevraagd:

1. **Groepkoppen** — al geïmplementeerd. Werken al via `is_group_header` op quote_lines en zijn toe te voegen via "Product toevoegen" dialoog. Geen wijziging nodig.

2. **Artikelcodes verbergen op klantofferte (PDF)** — de klant mag geen productcodes zien in de geëxporteerde PDF.

3. **Geen bedragen per regel op klantofferte (PDF)** — alleen sectietotaal en eindtotaal tonen, geen individuele regelprijzen.

### Stap 1: Database migratie
Twee nieuwe kolommen op `quotes` tabel:
- `show_line_prices boolean DEFAULT true` — of regelprijzen getoond worden in PDF
- `show_article_codes boolean DEFAULT true` — of artikelcodes getoond worden in PDF

### Stap 2: QuoteConfigDialog uitbreiden
Twee switches toevoegen onderaan de configuratiedialoog:
- "Toon artikelcodes op offerte" (default aan)
- "Toon prijzen per regel op offerte" (default aan)

Opslaan via `useUpdateQuote`.

### Stap 3: PDF generator aanpassen (`quotePdfGenerator.ts`)
- Als `show_article_codes === false`: de "code" kolom leeg maken in de tabel (kolom behouden voor layout, maar geen waarden)
- Als `show_line_prices === false`: de "bedrag" kolom per regel leeg laten, sectietotalen en eindtotaal wél tonen

### Bestanden
- **Database**: nieuwe migratie (2 kolommen op `quotes`)
- `src/integrations/supabase/types.ts` — kolommen toevoegen aan Quotes type
- `src/components/quotes/QuoteConfigDialog.tsx` — twee switches toevoegen
- `src/lib/pdf/quotePdfGenerator.ts` — conditioneel codes en regelprijzen verbergen
- `src/lib/pdf/quotePdfHelpers.ts` — QuoteData type uitbreiden

