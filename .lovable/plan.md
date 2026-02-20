

# Offerte flow aanpassen voor STOSA prijsgroep-prijzen

## Overzicht

De offerte flow werkt al deels met `price_group_id` (bij sectie-aanmaak en configuratie), maar op drie plekken ontbreekt de koppeling waardoor STOSA-prijzen niet gevonden worden bij het toevoegen/bewerken van producten.

## Wijzigingen (3 bestanden)

### 1. `src/hooks/useProductPrices.ts` -- fetchProductPrice uitbreiden

De `fetchProductPrice()` functie krijgt een extra parameter `sectionPriceGroupId`. Na stap 3 (quote default range) wordt een nieuwe stap ingevoegd die zoekt in `product_prices` op `price_group_id`.

**Lookup volgorde wordt:**
1. Override range (bestaand)
2. Sectie range (bestaand)
3. Quote-default range (bestaand)
4. **Sectie price_group_id** (nieuw) -- zoekt op `product_id` + `price_group_id`
5. Fallback naar base_price / book_price (bestaand)

De functie-signatuur wijzigt van 5 naar 6 parameters:
```text
fetchProductPrice(productId, rangeId, overrideRangeId?, quoteDefaultRangeId?, priceType?, sectionPriceGroupId?)
```

Het return type krijgt een extra mogelijke `source` waarde: `"price_group_price"`.

### 2. `src/components/quotes/SortableSectionCard.tsx` -- leverancier afleiden uit price_group

Momenteel wordt de leverancier alleen afgeleid uit `section.range_id` via `useProductRange()`. Voor STOSA-secties die alleen een `price_group_id` hebben, wordt de leverancier niet gevonden.

Wijzigingen:
- Import `usePriceGroup` uit `@/hooks/usePriceGroups` en aanroepen met `section.price_group_id`
- `sectionSupplierId` wordt: `sectionRange?.supplier_id || priceGroup?.supplier_id || null`
- `section.price_group_id` doorgeven als `sectionPriceGroupId` prop aan `AddProductDialog` en `EditableLineRow`

### 3. `src/components/quotes/AddProductDialog.tsx` -- price_group_id doorgeven aan fetchProductPrice

- Nieuwe prop: `sectionPriceGroupId?: string | null`
- In `refetchPrice()`: de `sectionPriceGroupId` als 6e argument meegeven aan `fetchProductPrice()`
- Hierdoor wordt bij productselectie automatisch de STOSA-prijs gevonden via `price_group_id`

### 4. `src/components/quotes/EditableLineRow.tsx` -- price_group_id doorgeven bij override/price-type wijziging

- Nieuwe prop: `sectionPriceGroupId?: string | null`
- In `handleOverrideChange()` en `handlePriceTypeChange()`: de `sectionPriceGroupId` als 6e argument meegeven aan `fetchProductPrice()`

## Wat er NIET verandert

- De `AddSectionDialog` werkt al correct (slaat `price_group_id` op)
- De `QuoteSectionConfig` werkt al correct
- De database schema hoeft niet te wijzigen (`price_group_id` kolom bestaat al op `quote_sections`)
- De bestaande range-gebaseerde flow (Miele, Siemens) blijft ongewijzigd werken

## Samenvatting

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useProductPrices.ts` | Extra parameter `sectionPriceGroupId` in `fetchProductPrice()` met lookup stap |
| `src/components/quotes/SortableSectionCard.tsx` | Leverancier ook afleiden uit `price_group`; `sectionPriceGroupId` doorgeven |
| `src/components/quotes/AddProductDialog.tsx` | Nieuwe prop `sectionPriceGroupId`; doorgeven aan `fetchProductPrice()` |
| `src/components/quotes/EditableLineRow.tsx` | Nieuwe prop `sectionPriceGroupId`; doorgeven aan `fetchProductPrice()` |

