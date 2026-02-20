
# Productfiltering op sectie-samenstelling

## Probleem
Bij het toevoegen van producten aan een STOSA-sectie worden nu alle ~13.200 STOSA-producten getoond, terwijl slechts ~600 producten daadwerkelijk een prijs hebben in de geselecteerde prijsgroep. Producten zonder prijs in die prijsgroep zijn niet relevant en maken de lijst onoverzichtelijk.

## Oplossing

### 1. `useProducts` hook uitbreiden met `priceGroupId` filter

Een nieuwe optionele parameter `priceGroupId` toevoegen aan `UseProductsOptions`. Wanneer deze is gezet, wordt een inner join gedaan via een subquery: alleen producten tonen die een rij hebben in `product_prices` voor die `price_group_id`.

Technisch wordt dit opgelost met een RPC-functie (database functie) omdat Supabase's JS client geen subquery-filtering ondersteunt op een gerelateerde tabel. De functie retourneert de `product_id`'s voor een gegeven `price_group_id`, en de hook gebruikt `.in("id", ids)` om te filteren.

**Alternatief (eenvoudiger):** Een twee-staps aanpak in de hook zelf:
1. Eerst de `product_id`'s ophalen uit `product_prices` voor de `price_group_id`
2. Dan de producten query filteren met `.in("id", productIds)`

### 2. Database functie aanmaken

```sql
CREATE FUNCTION get_products_by_price_group(p_price_group_id UUID)
RETURNS SETOF UUID AS $$
  SELECT DISTINCT product_id 
  FROM product_prices 
  WHERE price_group_id = p_price_group_id
$$ LANGUAGE sql STABLE;
```

Dit is performanter dan een client-side twee-staps query en werkt goed met de bestaande paginering.

### 3. `useProducts` hook aanpassen

De `applyFilters` functie wordt uitgebreid: als `priceGroupId` is meegegeven, wordt eerst de database functie aangeroepen om de relevante product-IDs op te halen, waarna de query met `.in("id", ids)` wordt gefilterd.

Nieuwe parameter in `UseProductsOptions`:
```text
priceGroupId?: string | null
```

### 4. `AddProductDialog` aanpassen

De `sectionPriceGroupId` prop (die al bestaat) wordt doorgegeven als `priceGroupId` aan de `useProducts` hook. Dit zorgt ervoor dat de productlijst automatisch wordt gefilterd op producten die een prijs hebben in de prijsgroep van de sectie.

De filtering wordt alleen toegepast als `showAllSuppliers` uit staat (standaard). Bij "Toon alle leveranciers" wordt de prijsgroep-filter uitgeschakeld.

### 5. Visuele feedback

In de productkiezer wordt naast elke product de prijs uit de prijsgroep getoond (in plaats van de base_price), zodat de gebruiker direct ziet welke prijs wordt gehanteerd.

## Impact op bestaande flow

- Secties zonder `price_group_id` (bijv. Miele, Siemens) werken ongewijzigd -- de nieuwe filter wordt simpelweg overgeslagen
- De "Toon alle leveranciers" checkbox schakelt ook de prijsgroep-filter uit
- Zoekfunctionaliteit blijft werken binnen de gefilterde set

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| Database migratie | Nieuwe functie `get_products_by_price_group` |
| `src/hooks/useProducts.ts` | Nieuwe parameter `priceGroupId` met twee-staps filtering |
| `src/components/quotes/AddProductDialog.tsx` | `sectionPriceGroupId` doorgeven aan `useProducts` |
