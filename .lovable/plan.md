

## Probleem

De productenfilter in `AddProductDialog.tsx` werkt niet om twee redenen:

1. **`p.category` is een object, geen string** — De query haalt `category: product_categories(id, name, code)` op als een genest object. De filter vergelijkt dit object met `.toLowerCase()`, wat altijd `"[object object]"` oplevert en nooit matcht.

2. **Filter moet `kitchen_group` gebruiken** — De categorie-buttons (onderkast, bovenkast, etc.) komen overeen met het `kitchen_group` veld op products, niet met de `category` relatie. Bovendien gebruiken de `kitchen_group` waarden underscores (`hoge_kast`) terwijl de button `"hoge kast"` heeft (met spatie).

## Oplossing

### Stap 1: Fix categorie-filter in AddProductDialog.tsx

Wijzig de `filteredProducts` filter (regel ~115-126):
- Vervang `p.category` door `p.kitchen_group`
- Gebruik underscore-notatie in de filter buttons (`hoge_kast` i.p.v. `"hoge kast"`)
- Update de filterwaarden in de buttons array om te matchen met de database-waarden: `onderkast`, `bovenkast`, `hoge_kast`, `apparatuur`

### Stap 2: Update category filter buttons

Wijzig de filter-buttons array (regel ~412-428):
```
{ value: "", label: "Alle" },
{ value: "onderkast", label: "Onderkast" },
{ value: "bovenkast", label: "Bovenkast" },
{ value: "hoge_kast", label: "Hoge kast" },
{ value: "apparatuur", label: "Apparatuur" },
```

En het filter-vergelijkingslogica:
```js
if (categoryFilter && p.kitchen_group !== categoryFilter) return false;
```

In plaats van de huidige `.includes().toLowerCase()` vergelijking op het geneste object.

