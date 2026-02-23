
# TradeXML 2.1.19 - Volledige inkoopkoppeling via TMH2

## Huidige situatie

De basis is gelegd met 4 edge functions:
- **tradeplace-config**: connectietest
- **tradeplace-availability**: ProductAvailabilityRequest/Reply
- **tradeplace-order**: OrderPlacementRequest (bestelling verzenden)
- **tradeplace-webhook**: ontvangen van push-berichten (OrderPlacementReply, PushOrderConfirmation, ShippingNotification, OrderStatus, BillingDocument, etc.)

## Wat ontbreekt voor een volledige inkoopworkflow

### Deel 1: Orderstatus opvragen (OrderStatusRequest)

Nu kun je alleen wachten op push-berichten van de fabrikant. Met een OrderStatusRequest kun je actief de status opvragen.

**Nieuw edge function: `tradeplace-order-status`**
- Bouwt een `OrderStatusRequest` XML op basis van het supplier_order_id
- Verstuurt naar TMH2 en parsed de `OrderStatusReply`
- Werkt de supplier_order bij met de laatste statusgegevens (bevestigde leverdata, regelstatussen, tracking)

**Frontend**: "Status opvragen" knop toevoegen in `SupplierOrdersCard.tsx` bij elke bestelling met status `sent` of `confirmed`.

---

### Deel 2: Bestelling annuleren (OrderCancellationRequest)

Toestaan om een verzonden of bevestigde bestelling te annuleren.

**Nieuw edge function: `tradeplace-order-cancel`**
- Bouwt een `OrderCancellationRequest` XML
- Verstuurt naar TMH2 en parsed de `OrderCancellationReply`
- Als geaccepteerd: status naar `cancelled`
- Als afgewezen: foutmelding tonen (fabrikant kan annulering weigeren)

**Frontend**: "Annuleren" knop bij bestellingen met status `sent` of `confirmed`, met bevestigingsdialoog.

---

### Deel 3: Prijsinformatie opvragen (ProductPriceRequest)

Actuele inkoopprijzen ophalen bij de fabrikant voor geselecteerde producten.

**Nieuw edge function: `tradeplace-product-price`**
- Bouwt een `ProductPriceRequest` XML (vergelijkbare structuur als availability)
- Parsed de `ProductPriceReply` met MonetaryAmounts (netto/bruto/advies)
- Retourneert prijzen per EAN

**Frontend**: "Prijzen ophalen" actie in het inkoopoverzicht naast de beschikbaarheidscheck.

---

### Deel 4: Webhook-verwerking verbeteren

De webhook handler verwerkt al de meeste berichttypen, maar mist:

1. **StockPush verwerking**: voorraadniveaus per EAN opslaan
2. **BillingDocument verwerking**: factuurgegevens extraheren en opslaan
3. **Audit trail**: elke binnenkomende XML opslaan in een log-tabel

**Database migratie**:
- Nieuwe tabel `tradeplace_messages` voor audit trail (message_type, supplier_order_id, raw_xml, processed_at)
- Kolom `tradeplace_stock` (jsonb) op products voor voorraaddata uit StockPush

**Webhook updates**:
- Alle binnenkomende berichten loggen in `tradeplace_messages`
- StockPush: voorraadstatus per EAN bijwerken in products
- BillingDocument: factuurnummer, bedrag en datum extraheren en opslaan op supplier_order

---

### Deel 5: UI-verbeteringen inkoopoverzicht

1. **Orderstatus-timeline**: per leveranciersbestelling een tijdlijn tonen (aangemaakt, verzonden, bevestigd, verzendnotificatie, geleverd)
2. **Regelstatus detail**: per orderregel de fabrikant-status tonen (bevestigd/backorder/afgewezen met DeliveredLineQuantity, BackorderLineQuantity, RejectedLineQuantity uit 2.1.18+)
3. **Leverdata tonen**: bevestigde en geschatte leverdatums prominent weergeven
4. **Beschikbaarheid inline**: bij het samenstellen van een bestelling direct beschikbaarheid per product tonen

---

## Technische details

### Nieuwe edge functions

| Function | TradeXML bericht | Richting |
|----------|-----------------|----------|
| `tradeplace-order-status` | OrderStatusRequest/Reply | Uitgaand (request) |
| `tradeplace-order-cancel` | OrderCancellationRequest/Reply | Uitgaand (request) |
| `tradeplace-product-price` | ProductPriceRequest/Reply | Uitgaand (request) |

### Database migratie

```text
-- Audit trail tabel voor alle TMH2 berichten
CREATE TABLE public.tradeplace_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',  -- 'inbound' of 'outbound'
  supplier_order_id UUID REFERENCES supplier_orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  raw_xml TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Voorraadinformatie uit StockPush
ALTER TABLE products ADD COLUMN IF NOT EXISTS tradeplace_stock JSONB;

-- Factuurgegevens op supplier_order
ALTER TABLE supplier_orders 
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS invoice_date DATE;
```

### Bestanden die wijzigen of nieuw zijn

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/tradeplace-order-status/index.ts` | **Nieuw** - OrderStatusRequest |
| `supabase/functions/tradeplace-order-cancel/index.ts` | **Nieuw** - OrderCancellationRequest |
| `supabase/functions/tradeplace-product-price/index.ts` | **Nieuw** - ProductPriceRequest |
| `supabase/functions/tradeplace-webhook/index.ts` | Audit trail + StockPush + BillingDocument verwerking |
| `src/hooks/useTradeplace.ts` | Nieuwe hooks voor status/cancel/price |
| `src/components/orders/SupplierOrdersCard.tsx` | Status opvragen, annuleren, timeline |
| `src/components/orders/SupplierLineGroups.tsx` | Beschikbaarheid/prijs inline |
| Database migratie | `tradeplace_messages` tabel + kolommen |

### XML-structuur conformiteit

De bestaande `tradeplace-order` en `tradeplace-availability` functions voldoen al grotendeels aan 2.1.19. Kleine verbeteringen:
- `PurchaseOrderVersion` toevoegen aan OrderPlacement (optioneel veld uit 2.1.16+)
- `CompleteDeliveryFlag` ondersteuning (optioneel)
- Robuustere parsing van MonetaryAmounts in replies (meerdere prijstypen)

### Implementatievolgorde

1. Database migratie (audit trail tabel + kolommen)
2. Webhook verbeteren (audit trail + StockPush + BillingDocument)
3. OrderStatusRequest edge function + hook + UI
4. OrderCancellationRequest edge function + hook + UI
5. ProductPriceRequest edge function + hook + UI
6. UI timeline en regelstatus-detail
