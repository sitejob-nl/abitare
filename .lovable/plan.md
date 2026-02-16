

# Fix: Leverancier "BSH Huishoudapparaten B.V." koppelen

## Probleem

De PIMS-import werkt nu technisch correct (ZIP uitpakken, XML parsen). Maar de leverancier uit het bestand — **"BSH Huishoudapparaten B.V."** — matcht met geen enkele leverancier in je database.

BSH is het moederbedrijf van Bosch en Siemens huishoudapparaten. Het Tradeplace PIMS-bestand heet "bosch export" maar de XML-afzender is BSH.

## Oplossing

### 1. Leverancier "Bosch" toevoegen aan de database

Een nieuwe leverancier aanmaken:
- Naam: **Bosch**
- Code: **BOSCH**

### 2. Aliassen-systeem voor supplier matching

Een nieuwe kolom `pims_aliases` (text array) toevoegen aan de `suppliers` tabel. Hiermee kan elke leverancier meerdere namen hebben die het systeem herkent.

Voorbeeld:
- Bosch: `["BSH Huishoudapparaten", "BSH", "Bosch"]`
- Siemens: `["BSH Huishoudapparaten", "Siemens"]` (als Siemens ook via BSH komt)

### 3. Matching-logica updaten

De supplier matching in `pims-import` aanpassen om ook de `pims_aliases` te checken:

```text
Voor elke leverancier in DB:
  1. Check naam/code (bestaande logica)
  2. Check of de XML-naam een van de aliassen bevat
  3. Check of een alias in de XML-naam voorkomt
```

## Technische stappen

### Database migratie
- `ALTER TABLE suppliers ADD COLUMN pims_aliases text[] DEFAULT '{}'`
- Insert leverancier Bosch met code BOSCH en alias `BSH Huishoudapparaten`
- Update bestaande Siemens-leverancier (optioneel: ook BSH alias toevoegen als Siemens-exports dezelfde afzender gebruiken)

### Edge function update (`pims-import/index.ts`)
- Query `pims_aliases` mee ophalen bij supplier lookup
- Matching uitbreiden: als naam/code niet matcht, loop door aliassen
- Als meerdere leveranciers matchen op aliassen, neem de eerste (of log een waarschuwing)

### Alternatief (sneller, maar minder flexibel)
Als je geen aliassen-systeem wilt, kunnen we ook alleen een Bosch-leverancier aanmaken en een hardcoded mapping toevoegen voor "BSH" naar "Bosch". Maar het aliassen-systeem is beter schaalbaar voor toekomstige leveranciers.
