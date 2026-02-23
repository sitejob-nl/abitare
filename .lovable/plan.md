
# Bulk inkoopprijzen ophalen via Tradeplace

## Wat is er nodig

De edge function `tradeplace-product-price` bestaat al en kan prijzen ophalen per EAN-code. Maar om dit bruikbaar te maken voor het bijwerken van alle productprijzen per leverancier zijn er drie dingen nodig:

### 1. Leveranciers koppelen (bestaande UI)

De Tradeplace-instellingenpagina (`TradeplaceSettings.tsx` + `SupplierTradeplaceDialog.tsx`) bestaat al. Daar kun je per leverancier de GLN en TP-ID invullen en `tradeplace_enabled` aanzetten. Dit is een handmatige stap die je zelf moet doen voor bijv. Bosch, Miele, Siemens, Atag, Gaggenau.

Geen code-aanpassing nodig -- alleen configuratie.

### 2. Server-side bulk price update edge function

Een nieuwe edge function `tradeplace-bulk-price-update` die:
- Alle actieve producten met EAN-code ophaalt voor een leverancier
- Ze in batches van 50 stuks naar TMH2 stuurt (ProductPriceRequest)
- De teruggekomen nettoprijzen wegschrijft als `cost_price` op het product
- Een samenvatting retourneert (bijgewerkt / niet gevonden / fouten)

```text
POST tradeplace-bulk-price-update
Body: { supplier_id: "uuid" }

Response: {
  success: true,
  supplier_name: "Miele",
  total_products: 1639,
  batches_sent: 33,
  updated: 1580,
  not_found: 42,
  errors: 17
}
```

### 3. UI: "Prijzen ophalen" knop per leverancier

Op de Tradeplace-instellingenpagina (`TradeplaceSettings.tsx`) een actie-knop toevoegen per gekoppelde leverancier: **"Inkoopprijzen bijwerken"**. Deze knop:
- Roept de nieuwe edge function aan
- Toont een laad-indicator (kan even duren bij 1600+ producten)
- Toont een samenvatting na afloop (x bijgewerkt, x niet gevonden)

## Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/tradeplace-bulk-price-update/index.ts` | **Nieuw** - Bulk prijsophaling met batching |
| `supabase/config.toml` | Nieuwe function registreren |
| `src/hooks/useTradeplace.ts` | Nieuwe `useBulkPriceUpdate` mutation hook |
| `src/components/settings/TradeplaceSettings.tsx` | "Inkoopprijzen bijwerken" knop per leverancier |

## Technische details

### Edge function: `tradeplace-bulk-price-update`

- Haalt producten op: `SELECT id, ean_code FROM products WHERE supplier_id = $1 AND ean_code IS NOT NULL AND is_active = true`
- Batcht in groepen van 50 EAN-codes
- Hergebruikt dezelfde TMH2 API-aanroep als `tradeplace-product-price` (XML ProductPriceRequest)
- Per batch: matcht EAN-codes terug en doet `UPDATE products SET cost_price = net_price WHERE ean_code = $ean`
- Logt elke batch in `tradeplace_messages` (audit trail)
- Retourneert aggregaat-resultaat

### Batching logica

```text
Totaal: 1639 producten (Miele)
Batch grootte: 50
Aantal batches: 33
Per batch: 1 ProductPriceRequest XML -> 1 ProductPriceReply XML
Totale doorlooptijd: ~30-60 seconden (afhankelijk van TMH2 responstijd)
```

### Prijs-mapping

De nettoprijzen uit de TMH2-reply worden opgeslagen als `cost_price` op het product. Dit is de daadwerkelijke inkoopprijs. De bestaande `base_price` (verkoopprijs) en `book_price` (catalogusprijs) blijven ongewijzigd.

### Geen impact op bestaande functionaliteit

- De individuele `tradeplace-product-price` function blijft beschikbaar voor ad-hoc prijscontroles
- Bestaande prijshierarchie (price_groups, supplier_discounts) wordt niet aangetast
- Alleen `cost_price` wordt bijgewerkt, geen verkoopprijzen
