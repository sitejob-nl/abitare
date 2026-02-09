

# Tradeplace Koppeling Activeren op basis van TMH2 Documentatie

## Wat het document onthult

Het TMH2 (Tradeplace Message Hub 2) setup-document beschrijft het volgende:

- **Protocol**: TradeXML 2.0 via HTTP
- **Authenticatie**: Basic Auth (username + password), NIET een API key
- **API Endpoints**:
  - TEST: `https://qhub-api.tradeplace.com/hub`
  - LIVE: `https://hub-api.tradeplace.com/hub`
- **IP whitelisting vereist**: TEST `20.105.183.63`, LIVE `20.76.155.18`
- **Berichttypen**: ProductAvailabilityRequest/Reply, OrderPlacementRequest/Reply, OrderStatusRequest/Reply, ShippingNotification, BillingDocuments, etc.
- **Webhook (outbound)**: TMH2 stuurt berichten (bevestigingen, verzendmeldingen) naar een door jou opgegeven endpoint

## Wat er mis is in de huidige code

| Probleem | Huidig | Moet zijn |
|----------|--------|-----------|
| Authenticatie | `TRADEPLACE_API_KEY` (enkele key) | Basic Auth met `TRADEPLACE_USERNAME` + `TRADEPLACE_PASSWORD` |
| Endpoint | Niet geconfigureerd | `https://qhub-api.tradeplace.com/hub` (TEST) of `https://hub-api.tradeplace.com/hub` (LIVE) |
| API calls | Geen echte HTTP calls (alleen "TODO") | Daadwerkelijke POST requests met Basic Auth naar TMH2 hub |
| XML formaat | Vereenvoudigde placeholder XML | TradeXML 2.0 DTD-conforme berichten |
| Settings UI | Vraagt om API key + GLN | Moet vragen om Username, Password, Environment (TEST/LIVE) |

## Stappen

### Stap 1: Secrets bijwerken
De huidige `TRADEPLACE_API_KEY` secret vervangen door:
- `TRADEPLACE_USERNAME` -- TMH2 Basic Auth username (bijv. `tradingpartner1-xxxxx`)
- `TRADEPLACE_PASSWORD` -- TMH2 Basic Auth password
- `TRADEPLACE_ENVIRONMENT` -- `test` of `live`
- `TRADEPLACE_RETAILER_GLN` -- blijft behouden

### Stap 2: Edge functions updaten

**tradeplace-config** -- Controleren op de nieuwe secrets (`USERNAME`, `PASSWORD` i.p.v. `API_KEY`), environment tonen (TEST/LIVE).

**tradeplace-availability** -- Echte HTTP POST naar TMH2:
```text
POST https://qhub-api.tradeplace.com/hub/api/messages/tp/{MANUFACTURER_TP_ID}
Authorization: Basic base64(username:password)
Content-Type: application/xml

<ProductAvailabilityRequest> ... TradeXML 2.0 ... </ProductAvailabilityRequest>
```

**tradeplace-order** -- Echte OrderPlacementRequest versturen naar TMH2 met Basic Auth, response parsen.

**tradeplace-webhook** -- Endpoint URL aanpassen zodat TMH2 bevestigingen/verzendmeldingen kan ontvangen. Authenticatie via de door TMH2 verstrekte credentials verwerken.

### Stap 3: Settings UI aanpassen
- `TradeplaceSettings.tsx`: instructies bijwerken -- geen "API key" meer, maar TMH2 login credentials
- Environment toggle (TEST/LIVE) toevoegen
- Webhook URL tonen die de gebruiker in TMH2 admin moet invoeren als "Outbound HTTP endpoint"
- Link naar TMH2 admin tool toevoegen

### Stap 4: Per-leverancier TMH2 configuratie
- `SupplierTradeplaceDialog.tsx`: veld voor **TP-ID** toevoegen (bijv. `bsh@tradeplace.com`) -- dit is nodig in de API URL per fabrikant
- Het bestaande `tradeplace_gln` veld behouden
- Database: kolom `tradeplace_tp_id` toevoegen aan `suppliers` tabel

## Technische details

### Nieuwe secrets (vervangt TRADEPLACE_API_KEY)

| Secret | Beschrijving | Voorbeeld |
|--------|-------------|-----------|
| `TRADEPLACE_USERNAME` | TMH2 Basic Auth username | `tradingpartner1-ef29293` |
| `TRADEPLACE_PASSWORD` | TMH2 Basic Auth password | (uit approval email) |
| `TRADEPLACE_ENVIRONMENT` | `test` of `live` | `test` |
| `TRADEPLACE_RETAILER_GLN` | Eigen GLN (blijft) | `8712345678901` |

### API call structuur

```text
Base URL (test): https://qhub-api.tradeplace.com/hub/api/messages/tp/{MANUFACTURER_TP_ID}
Base URL (live): https://hub-api.tradeplace.com/hub/api/messages/tp/{MANUFACTURER_TP_ID}

Headers:
  Authorization: Basic base64(TRADEPLACE_USERNAME:TRADEPLACE_PASSWORD)
  Content-Type: application/xml

Body: TradeXML 2.0 XML document
```

### Database migratie

```sql
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tradeplace_tp_id VARCHAR(255);
```

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/tradeplace-config/index.ts` | Nieuwe secrets, environment info |
| `supabase/functions/tradeplace-availability/index.ts` | Echte HTTP POST naar TMH2 met Basic Auth |
| `supabase/functions/tradeplace-order/index.ts` | Echte OrderPlacementRequest via TMH2 |
| `supabase/functions/tradeplace-webhook/index.ts` | Inbound authenticatie vanuit TMH2 |
| `src/components/settings/TradeplaceSettings.tsx` | Nieuwe instructies, environment toggle, webhook URL |
| `src/components/suppliers/SupplierTradeplaceDialog.tsx` | TP-ID veld toevoegen |
| `src/hooks/useTradeplace.ts` | Interface updates voor nieuwe config |
| Nieuwe migratie | `tradeplace_tp_id` op suppliers |

### Webhook URL voor TMH2 configuratie
De gebruiker moet in TMH2 admin onder "Outbound > Transport HTTP" het volgende endpoint invoeren:
```text
https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/tradeplace-webhook
```

## Vereisten voordat we beginnen
1. Je hebt TMH2 inloggegevens nodig (username + password uit de approval email)
2. Je GLN-code moet bekend zijn
3. In TMH2 admin moeten de gewenste message types (ProductAvailability, OrderPlacement, etc.) al zijn geconfigureerd en goedgekeurd door de fabrikant(en)

