

# Leveranciers toevoegen voor PIMS-imports

## Probleem

De PIMS-imports van Atag en Electrolux falen met "Onbekende fout" omdat deze leveranciers niet bestaan in de database. Het systeem herkent de XML correct als TradePI-formaat en extraheert de fabrikantnaam, maar kan die niet matchen aan een bekende leverancier.

- **Atag**: XML bevat `"Atag"` -- geen leverancier met die naam in de database
- **Electrolux**: XML bevat `"Electronux"` (typfout in hun systeem) -- geen leverancier en de naam klopt niet eens

Miele werkt wel omdat die leverancier al bestaat.

## Oplossing

### Stap 1: Leveranciers aanmaken

Twee nieuwe leveranciers toevoegen in de `suppliers` tabel:

| Naam | Code | pims_aliases |
|---|---|---|
| Atag | ATAG | `Atag, atag_benelux` |
| Electrolux | ELECTROLUX | `Electrolux, Electronux, Electrolux.nl` |

De aliases dekken zowel de namen uit de XML-routing (`<From>atag_benelux@tradeplace.com`) als de typfout in Electrolux' systeem ("Electronux").

### Stap 2: Verbeterde foutmelding

De huidige foutmelding is vaag ("Onbekende fout"). De edge function moet een duidelijkere melding teruggeven wanneer een leverancier niet gevonden wordt, zodat je direct ziet welke naam er niet matcht.

### Stap 3: Alias-matching robuuster maken

De matching-logica uitbreiden zodat ook e-mail-prefixes uit de `<From>`-tag in de XML-routing worden meegenomen als kandidaat (bijv. `atag_benelux` uit `atag_benelux@tradeplace.com`).

## Technische details

### Database insert (stap 1)
- SQL migration die Atag en Electrolux toevoegt aan `suppliers` met de juiste `pims_aliases`

### Edge function wijziging (stap 2)
- In `pims-import/index.ts`: de error response aanpassen van generiek naar een bericht als `"Leverancier 'Atag' niet gevonden. Voeg deze toe via Instellingen → Leveranciers, of configureer een alias."`

### Candidate extraction (stap 3)
- In de supplier-detectie logica: naast de huidige kandidaten ook het e-mail-prefix uit `<From>` tags extraheren en als extra kandidaat meenemen
- Underscore/streepje-varianten normaliseren (bijv. `atag_benelux` → `atag benelux`)

