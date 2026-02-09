

# Fix: Stosa producten worden niet opgeslagen (12.000+ stilletjes gefaald)

## Probleem

Van de 15.123 producten die naar de server worden gestuurd, worden er slechts 3.000 opgeslagen. De overige 12.000+ falen stilletjes omdat:

1. **Upsert errors worden niet gelogd** - De errors worden in een array verzameld maar nooit naar `console.error` geschreven, waardoor ze onzichtbaar zijn in de Supabase logs
2. **`name` kolom is `varchar(255)`** - Als een productnaam langer is dan 255 tekens, faalt de hele batch van 500 producten
3. **Dimensie-kolommen zijn `integer`** - De velden `width_mm`, `height_mm`, `depth_mm` accepteren geen decimalen, maar `parsePrice()` kan floats teruggeven

Omdat de producten in batches van 500 worden verwerkt, zorgt 1 ongeldige rij ervoor dat de hele batch faalt. De eerste 6 batches (3.000 producten) slagen, de rest faalt.

## Oplossing

### 1. Database migratie
- Verander `name` van `varchar(255)` naar `text` (geen lengtebeperking meer)

### 2. Edge function (`import-products/index.ts`)
- Voeg `console.error` toe bij upsert errors zodat ze zichtbaar zijn in de logs
- Rond dimensie-waarden af naar integers met `Math.round()` voordat ze worden opgeslagen
- Voeg een samenvatting-log toe die toont hoeveel batches zijn geslaagd vs. gefaald

### 3. Testen
- Na de fix opnieuw importeren
- In de logs controleren of er nu WEL foutmeldingen verschijnen (of dat alles slaagt)

## Verwacht resultaat
- Alle 15.123 producten worden succesvol opgeslagen
- De 2.632 prijzen matchen met de productMap en worden ook opgeslagen
- Eventuele resterende problemen worden zichtbaar via de console logs
