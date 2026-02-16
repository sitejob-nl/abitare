

# Plan: Gaggenau-producten correct importeren

## Probleem 1: Leverancier-detectie

De Gaggenau XML wordt door "BSH Huishoudapparaten B.V." (de PARTY/afzender) gematcht op Bosch. De `CATALOG_NAME` "Gaggenau producten" wordt niet meegenomen in de detectie.

### Oplossing

De supplier-detectielogica uitbreiden met een extra strategie:

1. Naast `SUPPLIER_NAME` / `PARTY` ook `CATALOG_NAME` uit de XML header lezen
2. De catalogusnaam als eerste prioriteit gebruiken (specifiekere match), dan pas de afzender
3. Gaggenau als leverancier aanmaken in de database met "BSH Huishoudapparaten" als gedeelde alias -- of beter: de match-logica aanpassen zodat `CATALOG_NAME` prioriteit krijgt

**Aanpak**: In `extractSupplierName()` eerst de `CATALOG_NAME` proberen. Dit geeft "Gaggenau producten" terug, wat matcht op een nieuw aan te maken leverancier "Gaggenau".

**Alternatief**: Een nieuwe leverancier "Gaggenau" aanmaken met alias "Gaggenau" en in de detectielogica de `CATALOG_NAME` mee laten wegen. De huidige flow probeert dan eerst "Gaggenau producten" te matchen (hit op Gaggenau), voordat "BSH Huishoudapparaten B.V." wordt geprobeerd.

## Probleem 2: 0 catalog groups

Het log toont "Parsed 0 catalog groups" -- de `CATALOG_GROUP_SYSTEM` tag wordt niet gevonden in de Gaggenau XML, of de structuur wijkt af. Mogelijke oorzaken:

- De Gaggenau XML gebruikt andere tagnamen voor classificatie
- De classificatiedata zit in een ander blok (bijv. `CLASSIFICATION_SYSTEM` i.p.v. `CATALOG_GROUP_SYSTEM`)

### Oplossing

De `parseCatalogGroups()` functie uitbreiden met fallback-tagnamen:
- `CLASSIFICATION_SYSTEM` als alternatief voor `CATALOG_GROUP_SYSTEM`
- `CLASSIFICATION_GROUP` als alternatief voor `CATALOG_STRUCTURE`
- `CLASS_ID` als alternatief voor `GROUP_ID`

En extra logging toevoegen om te zien welke tags wel aanwezig zijn als er 0 groups gevonden worden.

## Stappen

### Stap 1: Gaggenau leverancier aanmaken
- Nieuw record in `suppliers` tabel: naam "Gaggenau", code "GAGGENAU", pims_aliases `["Gaggenau"]`
- Price factor instellen (standaard 1.0, later aanpasbaar)

### Stap 2: Supplier-detectie verbeteren
In `extractSupplierName()`:
- `CATALOG_NAME` als eerste strategie toevoegen (voor `SUPPLIER_NAME`)
- Woorden als "producten", "products", "catalogue" strippen uit de naam voor betere matching

### Stap 3: Catalog group parser robuuster maken
In `parseCatalogGroups()`:
- Fallback tagnamen toevoegen voor classificatie-structuren
- Debug-logging als 0 groups gevonden: welke top-level tags bestaan er in de XML?

### Stap 4: Bestaande Gaggenau-producten corrigeren
SQL-update om de 443 verkeerd geimporteerde producten van Bosch naar Gaggenau te verplaatsen (op basis van artikelcodes of importdatum).

## Technische details

### Supplier-detectie (`extractSupplierName`)

```text
// Nieuwe strategie 0: CATALOG_NAME uit HEADER
const catalogName = xmlGetTag(headerBlock, 'CATALOG_NAME')
if (catalogName) {
  // Strip generieke woorden: "producten", "products", "catalog"
  const cleaned = catalogName.replace(/\b(producten|products|catalog(ue)?)\b/gi, '').trim()
  if (cleaned.length > 2) return cleaned
}
```

### Catalog group parser fallbacks

```text
function parseCatalogGroups(xmlString: string): CatalogGroup[] {
  let groupSystem = xmlGetTag(xmlString, 'CATALOG_GROUP_SYSTEM')
  if (!groupSystem) groupSystem = xmlGetTag(xmlString, 'CLASSIFICATION_SYSTEM')
  if (!groupSystem) {
    // Debug: log welke top-level tags er zijn
    console.warn('[pims] No CATALOG_GROUP_SYSTEM or CLASSIFICATION_SYSTEM found')
    return []
  }
  // ... rest met fallback tagnamen
}
```

### Bestanden die wijzigen

- `supabase/functions/pims-import/index.ts` -- detectie + parser
- SQL migratie: Gaggenau leverancier aanmaken + producten corrigeren

