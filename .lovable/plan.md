

## Probleem: Ontbrekende hex-kleurwaarden

Alle kleuren in `stosa_colors` hebben `hex_color = NULL`. De `price_group_colors` tabel is helemaal leeg. Hierdoor tonen alle kleur-selectors grijze bolletjes en werkt de CabinetPreview niet visueel.

## Oplossing

### Stap 1: Hex-waarden invullen voor alle stosa_colors

Voer SQL-updates uit om realistische hex-kleuren toe te kennen aan de bestaande records:

| code | color_type | hex_color |
|------|-----------|-----------|
| noce_eucalipto | front | #8B6914 |
| cachemere_opaco | front | #D4C5A9 |
| bianco | front | #F5F5F0 |
| grigio | front | #8C8C8C |
| nero | front | #2C2C2C |
| rose | corpus | #D4A6A1 |
| bianco_corpus | corpus | #F5F5F0 |
| grigio_corpus | corpus | #8C8C8C |
| titanio | handle | #878681 |
| nero_handle | handle | #2C2C2C |

Plus eventuele plinth-kleuren die ook in de tabel staan.

### Stap 2: Plinth-kleuren controleren en aanvullen

Query alle plinth-type kleuren en vul ook daar hex-waarden in.

### Stap 3: CabinetPreview fallback verbeteren

In `CabinetPreview.tsx`: de fallback `#e5e7eb` vervangen door een meer beschrijvende kleur per type, zodat ook zonder hex de preview herkenbaar is.

