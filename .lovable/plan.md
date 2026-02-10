
# Producten filteren op leverancier in AddProductDialog

## Huidige situatie

De AddProductDialog toont **alle** producten uit de catalogus, ongeacht de sectie-configuratie. Er zijn 14.623 Stosa-producten en 528 Siemens-producten. Dat maakt zoeken onoverzichtelijk.

## Wat gaan we doen

De productlijst in de "Product toevoegen" dialog automatisch filteren op de **leverancier** van de sectie. De leverancier wordt afgeleid uit de `range_id` van de sectie (via `product_ranges.supplier_id`).

Prijsgroepen filteren producten niet rechtstreeks -- een prijsgroep bepaalt alleen welke **prijs** wordt gehanteerd, niet welke producten beschikbaar zijn. De leverancier is de juiste filter.

## Technische aanpak

### 1. Leverancier-info meegeven aan AddProductDialog

In `SortableSectionCard.tsx` en `QuoteSectionCard.tsx` wordt de `range_id` van de sectie al meegegeven als `sectionRangeId`. We voegen een nieuwe prop `sectionSupplierId` toe, die wordt afgeleid uit de sectie-configuratie of de quote defaults.

### 2. AddProductDialog: leverancier-filter toepassen

- Nieuwe prop: `sectionSupplierId?: string | null`
- De `useProducts()` call krijgt `supplierId: sectionSupplierId` mee
- De bestaande hook ondersteunt dit filter al (`query.eq("supplier_id", supplierId)`)
- Er wordt een "Alle leveranciers" toggle toegevoegd zodat je ook buiten de leverancier kunt zoeken

### 3. Leverancier bepalen vanuit range_id

In de SortableSectionCard en QuoteSectionCard halen we de leverancier op via de al beschikbare `product_ranges` data, of we voegen een lookup toe op basis van `section.range_id`.

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/quotes/AddProductDialog.tsx` | Nieuwe prop `sectionSupplierId`, filter in useProducts, toggle voor alle leveranciers |
| `src/components/quotes/SortableSectionCard.tsx` | Supplier ID afleiden uit range en meegeven aan AddProductDialog |
| `src/components/quotes/QuoteSectionCard.tsx` | Idem |

## Gebruikerservaring

- Bij het openen van "Product toevoegen" in een Stosa-sectie zie je alleen Stosa-producten
- Een checkbox of knop "Toon alle leveranciers" laat je de filter uitschakelen als je iets van een andere leverancier wilt toevoegen
