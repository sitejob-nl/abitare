

# Tradeplace Direct Connection Integratie

## Overzicht

Dit plan implementeert de volledige Tradeplace integratie waarbij alles gebouwd wordt zodat het direct bruikbaar is, maar **werkt in "demo modus"** totdat de secrets via Instellingen worden geconfigureerd. De UI toont duidelijke feedback wanneer de koppeling nog niet actief is.

---

## Aanpak: Graceful Degradation

De integratie wordt zo gebouwd dat:
- Alle UI-componenten direct beschikbaar zijn
- Edge functions geven duidelijke foutmeldingen als secrets ontbreken
- Settings pagina toont configuratiestatus met instructies
- Gebruikers kunnen de hele flow testen met mock-responses (optioneel)

---

## Fase 1: Database Migraties

### 1.1 Uitbreiding `suppliers` tabel

Nieuwe velden voor Tradeplace-koppeling:

| Veld | Type | Doel |
|------|------|------|
| `tradeplace_enabled` | BOOLEAN DEFAULT false | Is fabrikant gekoppeld? |
| `tradeplace_gln` | TEXT | GLN-nummer fabrikant |
| `tradeplace_endpoint` | TEXT | API endpoint URL |

### 1.2 Uitbreiding `products` tabel

Nieuwe velden voor productidentificatie:

| Veld | Type | Doel |
|------|------|------|
| `ean_code` | TEXT | EAN/barcode |
| `manufacturer_product_id` | TEXT | Fabrikant product ID |

### 1.3 Nieuwe tabel: `tradeplace_settings`

Centrale configuratie voor Tradeplace:

| Veld | Type | Doel |
|------|------|------|
| `id` | UUID | Primary key |
| `retailer_gln` | TEXT | GLN-nummer retailer |
| `is_configured` | BOOLEAN | Zijn secrets ingesteld? |
| `last_sync_at` | TIMESTAMP | Laatste succesvolle sync |
| `created_at` | TIMESTAMP | Aangemaakt op |

### 1.4 Nieuwe tabel: `supplier_orders`

Inkooporders naar leveranciers:

| Veld | Type | Doel |
|------|------|------|
| `id` | UUID | Primary key |
| `order_id` | UUID | Link naar klantorder |
| `supplier_id` | UUID | Link naar leverancier |
| `external_order_id` | TEXT | Tradeplace referentie |
| `status` | TEXT | pending/sent/confirmed/shipped/delivered |
| `total_amount` | NUMERIC | Inkoopbedrag |
| `sent_at` | TIMESTAMP | Verzonden op |
| `confirmed_at` | TIMESTAMP | Bevestigd op |
| `expected_delivery_date` | DATE | Verwachte levering |
| `xml_request` | TEXT | Verzonden XML |
| `xml_response` | TEXT | Ontvangen XML |
| `created_at` | TIMESTAMP | Aangemaakt op |

### 1.5 Nieuwe tabel: `supplier_order_lines`

Regels per leveranciersbestelling:

| Veld | Type | Doel |
|------|------|------|
| `id` | UUID | Primary key |
| `supplier_order_id` | UUID | Link naar supplier_order |
| `order_line_id` | UUID | Link naar klant orderregel |
| `product_id` | UUID | Link naar product |
| `ean_code` | TEXT | EAN code |
| `quantity` | INTEGER | Besteld aantal |
| `unit_price` | NUMERIC | Inkoopprijs |
| `status` | TEXT | pending/confirmed/shipped |
| `availability_status` | TEXT | in_stock/limited/out_of_stock |
| `availability_qty` | INTEGER | Beschikbaar aantal |
| `availability_checked_at` | TIMESTAMP | Laatste check |
| `created_at` | TIMESTAMP | Aangemaakt op |

---

## Fase 2: Edge Functions

### 2.1 `tradeplace-config` - Configuratie Check

Controleert of secrets aanwezig zijn:

```text
Endpoint: POST /tradeplace-config
Body: { action: "check" | "test" }

Response (niet geconfigureerd):
{
  "configured": false,
  "missing_secrets": ["TRADEPLACE_API_KEY", "TRADEPLACE_RETAILER_GLN"],
  "message": "Configureer de Tradeplace secrets in Supabase"
}

Response (geconfigureerd):
{
  "configured": true,
  "retailer_gln": "8712345678901"
}
```

### 2.2 `tradeplace-availability` - Beschikbaarheid Check

Controleert voorraad bij fabrikant:

```text
Endpoint: POST /tradeplace-availability
Body: {
  "supplier_id": "uuid",
  "products": [
    { "ean_code": "4242003826638", "quantity": 1 }
  ]
}

Response (niet geconfigureerd):
{
  "error": "not_configured",
  "message": "Tradeplace is nog niet geconfigureerd. Ga naar Instellingen > Koppelingen."
}

Response (succes):
{
  "results": [
    {
      "ean_code": "4242003826638",
      "available": true,
      "quantity_available": 5,
      "lead_time_days": 3
    }
  ]
}
```

### 2.3 `tradeplace-order` - Bestelling Plaatsen

Plaatst order bij fabrikant:

```text
Endpoint: POST /tradeplace-order
Body: {
  "supplier_order_id": "uuid"
}

Response (niet geconfigureerd):
{
  "error": "not_configured",
  "message": "Tradeplace is nog niet geconfigureerd."
}

Response (succes):
{
  "success": true,
  "external_order_id": "TP-2024-12345",
  "confirmation_date": "2024-02-01"
}
```

### 2.4 `tradeplace-webhook` - Ontvang Updates

Ontvangt orderbevestigingen en verzendmeldingen:

```text
Endpoint: POST /tradeplace-webhook
Headers: X-Webhook-Secret: xxx

Verwerkt:
- OrderConfirmation → update supplier_order status
- ShippingNotification → update expected_delivery_date
```

---

## Fase 3: Frontend Hooks

### 3.1 `useTradeplace.ts`

```text
Exports:
- useTradeplaceConfig() - Check configuratiestatus
- useCheckAvailability() - Mutation voor beschikbaarheidscheck
- usePlaceSupplierOrder() - Mutation voor bestelling
```

### 3.2 `useSupplierOrders.ts`

```text
Exports:
- useSupplierOrders(orderId) - Query leveranciersorders voor een order
- useCreateSupplierOrder() - Mutation nieuwe leveranciersorder
- useUpdateSupplierOrderStatus() - Mutation status update
```

---

## Fase 4: UI Componenten

### 4.1 Settings: TradeplaceSettings.tsx

Toegevoegd aan Settings pagina onder "Koppelingen" tab:

```text
+----------------------------------------------------------+
| Tradeplace Direct Connection                              |
|----------------------------------------------------------|
| Status: [!] Niet geconfigureerd                          |
|                                                           |
| Om Tradeplace te activeren:                              |
| 1. Vraag een account aan via connect@tradeplace.com      |
| 2. Voeg de volgende secrets toe in Supabase:             |
|    - TRADEPLACE_API_KEY                                  |
|    - TRADEPLACE_RETAILER_GLN                             |
|    - TRADEPLACE_WEBHOOK_SECRET (optioneel)               |
|                                                           |
| [Open Supabase Secrets →]                                |
|                                                           |
| Gekoppelde fabrikanten:                                   |
| ○ BSH Hausgeräte (Siemens/Bosch) - GLN: niet ingesteld   |
| ○ Miele - GLN: niet ingesteld                            |
| ○ Electrolux - GLN: niet ingesteld                       |
+----------------------------------------------------------+
```

Na configuratie:

```text
+----------------------------------------------------------+
| Tradeplace Direct Connection                              |
|----------------------------------------------------------|
| Status: [✓] Actief                                       |
| Retailer GLN: 8712345678901                              |
| Laatste sync: vandaag 14:32                              |
|                                                           |
| [Test verbinding]                                         |
|                                                           |
| Gekoppelde fabrikanten:                                   |
| [✓] BSH Hausgeräte - GLN: 4012345678901 [Configureer]    |
| [✓] Miele - GLN: 4099999999999 [Configureer]             |
| ○ Electrolux - GLN: niet ingesteld [Configureer]         |
+----------------------------------------------------------+
```

### 4.2 Order Detail: SupplierOrdersCard.tsx

Nieuwe sectie op Order Detail pagina:

```text
+----------------------------------------------------------+
| Leveranciersbestellingen                                  |
|----------------------------------------------------------|
| [!] Tradeplace niet geconfigureerd                       |
| Configureer Tradeplace in Instellingen om te bestellen   |
| [Ga naar Instellingen]                                   |
+----------------------------------------------------------+
```

Of indien geconfigureerd:

```text
+----------------------------------------------------------+
| Leveranciersbestellingen                                  |
|----------------------------------------------------------|
| BSH Hausgeräte                                           |
| Status: Bevestigd | Order: TP-2024-12345                  |
| Verwacht: 15 feb 2024                                     |
| 3 artikelen | € 2.340,00                                  |
| [Bekijk details]                                          |
|----------------------------------------------------------|
| [ + Nieuwe leveranciersbestelling ]                      |
+----------------------------------------------------------+
```

### 4.3 Order Lines: Beschikbaarheid Indicator

Per orderregel een kolom voor voorraadstatus:

```text
| Artikel      | Omschrijving     | Leverancier | Voorraad       |
|--------------|------------------|-------------|----------------|
| iQ700-12345  | Siemens Oven     | BSH         | [?] Check      |
| iQ500-67890  | Siemens Koelkast | BSH         | [✓] Op voorraad|
```

Klik op "Check" roept beschikbaarheid API aan.
Toont "Niet beschikbaar" als Tradeplace niet geconfigureerd.

### 4.4 PlaceSupplierOrderModal.tsx

Modal voor het plaatsen van bestellingen:

```text
+----------------------------------------------------------+
| Bestellen bij BSH Hausgeräte                              |
|----------------------------------------------------------|
| [!] Tradeplace niet actief - kan niet bestellen          |
| [Configureer in Instellingen]                            |
|----------------------------------------------------------|
| OF                                                        |
|----------------------------------------------------------|
| Selecteer producten:                                      |
| [x] Siemens iQ700 Oven (1x)           € 890,00           |
| [x] Siemens iQ500 Koelkast (1x)       € 1.240,00         |
|                                                           |
| Totaal inkoop: € 2.130,00                                |
|                                                           |
| [ Annuleren ]              [ Bestelling plaatsen ]       |
+----------------------------------------------------------+
```

---

## Fase 5: Supplier Configuratie

### 5.1 SupplierTradeplaceDialog.tsx

Dialog om leveranciers te koppelen aan Tradeplace:

```text
+----------------------------------------------------------+
| BSH Hausgeräte - Tradeplace Configuratie                  |
|----------------------------------------------------------|
| [x] Tradeplace koppeling inschakelen                      |
|                                                           |
| GLN-nummer fabrikant:                                     |
| [4012345678901_____________]                              |
|                                                           |
| API Endpoint (optioneel):                                 |
| [https://api.tradeplace.com/bsh]                         |
|                                                           |
| [ Annuleren ]              [ Opslaan ]                   |
+----------------------------------------------------------+
```

---

## Benodigde Secrets

Via Supabase Dashboard toe te voegen (later door gebruiker):

| Secret | Doel |
|--------|------|
| `TRADEPLACE_API_KEY` | API authenticatie |
| `TRADEPLACE_RETAILER_GLN` | GLN-nummer retailer |
| `TRADEPLACE_WEBHOOK_SECRET` | Webhook verificatie (optioneel) |

---

## Bestandsoverzicht

### Database Migratie
- `supabase/migrations/xxx_tradeplace_integration.sql` - Alle tabelwijzigingen

### Edge Functions
- `supabase/functions/tradeplace-config/index.ts`
- `supabase/functions/tradeplace-availability/index.ts`
- `supabase/functions/tradeplace-order/index.ts`
- `supabase/functions/tradeplace-webhook/index.ts`

### Hooks
- `src/hooks/useTradeplace.ts`
- `src/hooks/useSupplierOrders.ts`

### Components
- `src/components/settings/TradeplaceSettings.tsx`
- `src/components/orders/SupplierOrdersCard.tsx`
- `src/components/orders/AvailabilityIndicator.tsx`
- `src/components/orders/PlaceSupplierOrderModal.tsx`
- `src/components/suppliers/SupplierTradeplaceDialog.tsx`

### Pagina Wijzigingen
- `src/pages/Settings.tsx` - TradeplaceSettings toevoegen
- `src/pages/OrderDetail.tsx` - SupplierOrdersCard toevoegen
- `src/components/orders/OrderLinesTable.tsx` - Beschikbaarheid kolom

---

## Technische Details

### Edge Function Pattern (Secret Check)

Elke edge function controleert eerst of secrets aanwezig zijn:

```typescript
// Pattern voor alle tradeplace-* functions
const apiKey = Deno.env.get("TRADEPLACE_API_KEY");
const retailerGln = Deno.env.get("TRADEPLACE_RETAILER_GLN");

if (!apiKey || !retailerGln) {
  return new Response(JSON.stringify({
    error: "not_configured",
    message: "Tradeplace is nog niet geconfigureerd. Ga naar Instellingen > Koppelingen.",
    missing: [
      !apiKey && "TRADEPLACE_API_KEY",
      !retailerGln && "TRADEPLACE_RETAILER_GLN"
    ].filter(Boolean)
  }), {
    status: 503,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

### Frontend Hook Pattern (Config Check)

```typescript
// useTradeplaceConfig hook
export function useTradeplaceConfig() {
  return useQuery({
    queryKey: ["tradeplace-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tradeplace-config", {
        body: { action: "check" }
      });
      
      if (error) throw error;
      return data as { configured: boolean; retailer_gln?: string };
    },
    staleTime: 5 * 60 * 1000 // Cache 5 minuten
  });
}
```

---

## Verwacht Resultaat

Na implementatie:

1. **Zonder secrets**: Alle UI zichtbaar met duidelijke "niet geconfigureerd" berichten en links naar configuratie
2. **Met secrets**: Volledig werkende Tradeplace integratie met:
   - Real-time beschikbaarheidscontrole
   - Automatisch bestellen bij fabrikanten
   - Status updates via webhooks
   - Leveranciers gekoppeld aan GLN-nummers

---

## RLS Policies

Alle nieuwe tabellen krijgen RLS met:
- `tradeplace_settings`: Alleen admin kan lezen/schrijven
- `supplier_orders`: Lezen voor ingelogde users, schrijven voor admin/manager
- `supplier_order_lines`: Zelfde als supplier_orders

