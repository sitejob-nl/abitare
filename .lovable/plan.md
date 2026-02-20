

# Fix: Prijsgroep-prijzen en inkoopprijs zichtbaar maken na STOSA import

## Wat is het probleem?

De STOSA import heeft succesvol **7.541 prijzen** opgeslagen in de `product_prices` tabel, gekoppeld aan `price_group_id`. Maar de frontend zoekt alleen op `range_id` -- een ander veld. Daardoor worden de prijzen nooit getoond.

Daarnaast worden `base_price` en `cost_price` niet ingevuld op de `products` tabel zelf, waardoor de productlijst en productdetail pagina overal "EUR -" laten zien.

## Drie aanpassingen nodig

### 1. Hook `useProductPrices` uitbreiden
Het bestand `src/hooks/useProductPrices.ts` filtert nu alleen op `range_id`. De query moet ook `price_group_id` ondersteunen, zodat prijzen die via de STOSA import zijn opgeslagen (met `price_group_id`) ook worden opgehaald.

- Extra parameter `priceGroupId` toevoegen
- Query aanpassen: als `priceGroupId` meegegeven wordt, filter op `price_group_id`
- Join ook `price_groups` tabel zodat we de naam/code kunnen tonen

### 2. ProductDetail pagina: prijsgroep-prijzen tonen
Het bestand `src/pages/ProductDetail.tsx` toont op regel 797-815 de "Prijsgroep-prijzen" kaart. Deze leest nu `p.range?.code` maar de STOSA prijzen hebben geen `range_id`, alleen `price_group_id`.

- De query aanpassen zodat ook `price_group:price_groups(id, code, name)` wordt ge-joined
- In de weergave: toon `p.price_group?.code` als fallback wanneer `p.range` leeg is

### 3. Productlijst: inkoopprijs kolom vullen
De STOSA import slaat geen `base_price` of `cost_price` op in de `products` tabel. Dit is correct gedrag (prijzen hangen af van de gekozen prijsgroep), maar de lijstweergave toont daardoor overal "EUR -".

De productenlijst (`src/pages/Products.tsx`) uitbreiden met een aanduiding bij de "Verkoopprijs" kolom dat de prijs afhangt van de prijsgroep (bijv. een kleine badge "per PG" of het tonen van een prijsbereik min-max als dat beschikbaar is).

## Technische wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useProductPrices.ts` | Query uitbreiden met `price_group_id` filter en `price_groups` join |
| `src/pages/ProductDetail.tsx` | Prijsgroep-prijzen kaart: fallback naar `price_group` info als `range` leeg is |
| `src/pages/Products.tsx` | "Verkoopprijs" kolom: toon indicatie als product prijsgroep-gebaseerde prijzen heeft |

