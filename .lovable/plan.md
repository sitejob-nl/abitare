

## Fix: Producten laden voor STOSA prijsgroep

**Probleem**: `.in("id", [624 UUIDs])` in `useProducts.ts` regel 93 stuurt alle IDs als URL-parameters via PostgREST → overschrijdt de ~8KB URL-limiet → query faalt stilletjes.

**Oplossing**: Eén nieuwe database-functie die de join server-side doet.

### Stap 1: Nieuwe database-functie

Maak RPC `get_products_for_price_group` die products + product_prices joined en direct gefilterde, gepagineerde producten retourneert (met supplier/category info). Parameters: `p_price_group_id`, `p_search`, `p_kitchen_group`, `p_show_inactive`, `p_sort_field`, `p_sort_dir`, `p_limit`, `p_offset`.

### Stap 2: Update `useProducts` hook

Wanneer `priceGroupId` is gezet:
- Roep de nieuwe RPC aan in plaats van de twee-staps flow (regel 68-94)
- Geen `.in()` meer nodig
- Fallback naar huidige query wanneer geen `priceGroupId`

### Bestanden
- **Database**: nieuwe migratie met `get_products_for_price_group` functie
- `src/hooks/useProducts.ts` — vervang de twee-staps `.in()` logica

