
# Fix Offerte Workflow: Prijsgroep- en Productfiltering

## Kernprobleem

De interface toont altijd prijsgroep/model/kleur-dropdowns, ongeacht of de leverancier deze daadwerkelijk heeft. Siemens heeft bijvoorbeeld geen prijsgroepen en geen product_ranges, maar het systeem toont toch lege dropdowns die de gebruiker verplicht lijkt te moeten invullen.

## Huidige situatie (uit database)

| Leverancier | has_price_groups | Heeft ranges | Werkwijze |
|---|---|---|---|
| Stosa Cucine | true | Ja (honderden) | Collectie -> Prijsgroep -> Kleur |
| Siemens | false | Nee | Direct product kiezen op artikelcode + basisprijs |
| Artimar | false | Nee | Direct product kiezen |
| Miele | false | Nee | Direct product kiezen |
| Blanco | false | Nee | Direct product kiezen |
| Quooker | false | Nee | Direct product kiezen |

## Gevonden fouten

### 1. AddSectionDialog: Toont altijd "Prijsgroep" dropdown
- **Regel 170-186**: Zodra een leverancier is geselecteerd wordt de range-dropdown getoond, ook als die leverancier (bijv. Siemens) geen ranges heeft
- **Label verwarring**: Voor niet-has_price_groups leveranciers staat er "Prijsgroep" maar het zijn `product_ranges`

### 2. QuoteFormDialog stap 2: Toont "Model" voor leveranciers zonder modellen
- **Regel 551-572**: Toont "Model" dropdown voor alle niet-has_price_groups leveranciers, ook als de lijst leeg is
- **Kleur-dropdowns**: Frontkkleur en korpuskleur worden getoond maar zijn leeg voor Siemens

### 3. AddProductDialog: Override-dropdown niet gefilterd op leverancier
- **Regel 106**: `useProductRanges()` wordt zonder supplierId aangeroepen, dus ALLE ranges van ALLE leveranciers worden getoond
- Siemens-producten krijgen Stosa-ranges als override-opties aangeboden

### 4. QuoteConfigDialog: Zelfde problemen als QuoteFormDialog

### 5. QuoteSectionConfig: Toont lege dropdowns voor simpele leveranciers

## Oplossing

Conditie-logica toevoegen die dropdowns alleen toont als er daadwerkelijk data voor is:

### Bestand: `src/components/quotes/AddSectionDialog.tsx`
- De range/prijsgroep-dropdown alleen tonen als `ranges?.length > 0` OF `hasPriceGroups`
- Bij lege ranges voor niet-price-group leveranciers: geen extra selectie nodig, alleen leverancier is voldoende

### Bestand: `src/components/quotes/QuoteFormDialog.tsx` (stap 2)
- "Model" dropdown alleen tonen als `filteredRanges.length > 0` en niet-has_price_groups
- Kleur-dropdowns alleen tonen als `colors.length > 0`
- Voor simpele leveranciers (Siemens etc): alleen leveranciernaam tonen, geen verdere configuratie

### Bestand: `src/components/quotes/AddProductDialog.tsx`
- Override-dropdown filteren op de leverancier van de sectie: `useProductRanges(sectionSupplierId || undefined)` in plaats van `useProductRanges()`
- Override-dropdown helemaal verbergen als er geen ranges zijn voor de leverancier

### Bestand: `src/components/quotes/QuoteConfigDialog.tsx`
- Model/kleur-secties alleen tonen als `ranges.length > 0`
- Korpuskleur alleen tonen als `colors.length > 0`

### Bestand: `src/components/quotes/QuoteSectionConfig.tsx`
- Range-dropdown alleen tonen als `filteredRanges.length > 0`
- Kleur-dropdowns alleen tonen als er daadwerkelijk kleuren beschikbaar zijn
- Voor simpele leveranciers: minimale configuratie (alleen leverancier + beschrijving)

## Samenvatting van gedrag na fix

| Leverancier gekozen | Wat wordt getoond |
|---|---|
| Stosa Cucine | Collectie -> Model -> Prijsgroep -> Kleur (volledig) |
| Siemens | Alleen leveranciersnaam (geen extra dropdowns) |
| Artimar | Alleen leveranciersnaam |
| Leverancier met ranges maar zonder price_groups | Leverancier -> Model -> Kleur |
