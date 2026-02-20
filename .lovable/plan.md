

# Productpagina optimaliseren

## Gevonden problemen

1. **React warning**: `SortIcon` component kan geen ref ontvangen -- geeft console warnings
2. **Laad-flicker bij paginatie**: Bij elke pagina-wissel verdwijnt de tabel en verschijnt een loader, doordat React Query geen `placeholderData` gebruikt
3. **Onnodige re-renders**: Tabelrijen worden bij elke state-wijziging (checkbox, hover) volledig opnieuw gerenderd -- bij 50 rijen niet dramatisch, maar wel onnodig
4. **Bulk prijs-aanpassing**: De percentage-modus doet N individuele database-calls in een for-loop (1 per product) -- bij 50 geselecteerde producten zijn dat 50 requests

## Wijzigingen

### 1. `src/pages/Products.tsx` -- Performance & UX

**SortIcon ref-warning fixen**: De `SortIcon` component wordt buiten de hoofdcomponent gedefinieerd als een standalone functie (niet genest in `Products`), zodat React geen ref-warning meer geeft.

**placeholderData toevoegen**: In de `useProducts` aanroep `keepPreviousData` inschakelen, zodat bij paginatie de vorige data zichtbaar blijft terwijl de nieuwe wordt geladen. Dit voorkomt de laad-flicker. Een subtiele opacity-indicator toont dat er nieuwe data wordt opgehaald.

**Tabelrijen memoizen**: De tabelrij-rendering extraheren naar een `React.memo`-component `ProductRow`, zodat alleen de gewijzigde rij opnieuw rendert bij checkbox-toggle.

**Navigatie met onClick optimaliseren**: In plaats van per-cel `onClick` handlers, wordt er een enkele `onClick` op de `<tr>` gezet met een check of de click niet op de checkbox was.

### 2. `src/hooks/useProducts.ts` -- placeholderData ondersteuning

`placeholderData: keepPreviousData` toevoegen aan de query opties, zodat bij filter/pagina-wisselingen de vorige resultaten zichtbaar blijven.

### 3. `src/components/products/BulkActionsBar.tsx` -- Batch prijs-update

De percentage prijs-aanpassing omschrijven van N individuele updates naar 1 enkele database-call via een `.upsert()` of door de berekening server-side te doen met een `UPDATE ... SET base_price = base_price * factor WHERE id IN (...)` via een RPC-functie.

Eenvoudigste aanpak: een batch-update query aanmaken als database functie `bulk_adjust_price(product_ids UUID[], factor NUMERIC)`.

## Technische details

### ProductRow component (nieuw, in Products.tsx)

```text
React.memo(ProductRow) met props:
- product, isSelected, onToggle, onNavigate
- Vergelijkt alleen product.id en isSelected voor re-render
```

### useProducts aanpassing

```text
placeholderData: keepPreviousData
-- importeren uit @tanstack/react-query
```

### Laad-indicator bij paginatie

In plaats van de volledige loader tonen, wordt bij `isFetching && !isLoading` (data is al beschikbaar maar wordt ververst) een subtiele opacity-verlaging op de tabel toegepast.

### Database functie voor bulk prijs-update

```text
CREATE FUNCTION bulk_adjust_price(p_ids UUID[], p_factor NUMERIC)
RETURNS void AS $$
  UPDATE products SET base_price = ROUND(base_price * p_factor, 2)
  WHERE id = ANY(p_ids) AND base_price IS NOT NULL
$$ LANGUAGE sql;
```

Dit vervangt de N individuele calls door 1 enkele database-aanroep.

## Samenvatting

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/Products.tsx` | SortIcon fix, ProductRow memo, placeholderData, betere laad-indicator |
| `src/hooks/useProducts.ts` | `placeholderData: keepPreviousData` toevoegen |
| `src/components/products/BulkActionsBar.tsx` | Batch prijs-update via RPC i.p.v. N losse calls |
| Database migratie | `bulk_adjust_price` functie |

