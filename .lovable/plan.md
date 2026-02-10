

# Herschrijf Tradeplace Edge Functions naar TradeXML 2.1.19

## Samenvatting

Alle drie de edge functions (`tradeplace-order`, `tradeplace-availability`, `tradeplace-webhook`) gebruiken momenteel verzonnen XML-tags die niet overeenkomen met het TradeXML 2.x protocol. Op basis van de officieel geuploadde TradeXML 2.1.19 Technical Documentation worden ze herschreven naar de correcte structuur.

---

## 1. tradeplace-order (OrderPlacementRequest)

### Huidige fouten

| Huidig (fout) | TradeXML 2.1.19 (correct) |
|---|---|
| `<OrderLine>` | `<OrderPlacementRequestLineItem>` |
| `<EAN>...` | `<Material materialQualifier="EAN">...` |
| `<Quantity>` | `<QuantityRequested>` |
| `<OrderID>` | `<PurchaseOrderNumber>` |
| `<OrderDate>` | `<PurchaseOrderDate>` (container met Year/Month/Day) |
| `<Header>` met SenderGLN/ReceiverGLN | `<OrderPlacementRequestHeader>` met CustomerCode/SellerCode |
| `<OrderLines>` | `<OrderPlacementRequestLineItems>` |
| `<UnitPrice>` | `<CustomerExpectedPrice>` (optioneel) |
| Ontbreekt: `<MessageType>` | Verplicht: `<MessageType>OrderPlacementRequest</MessageType>` |
| Ontbreekt: `<RequestedDeliveryDate>` | Verplicht container |
| Ontbreekt: `<LineItemNumber>` | Verplicht per line item |

### Correcte XML-structuur

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE OrderPlacementRequest SYSTEM "TradeXML.dtd">
<OrderPlacementRequest>
  <OrderPlacementRequestHeader>
    <MessageType>OrderPlacementRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">RETAILER_GLN</CustomerCode>
    <SellerCode>SUPPLIER_GLN</SellerCode>
    <RequestedDeliveryDate>
      <Year>2026</Year><Month>03</Month><Day>15</Day>
    </RequestedDeliveryDate>
    <PurchaseOrderNumber>ORDER_ID</PurchaseOrderNumber>
    <PurchaseOrderDate>
      <Year>2026</Year><Month>02</Month><Day>10</Day>
    </PurchaseOrderDate>
  </OrderPlacementRequestHeader>
  <OrderPlacementRequestLineItems>
    <OrderPlacementRequestLineItem>
      <LineItemNumber>1</LineItemNumber>
      <Material materialQualifier="EAN">4242003...</Material>
      <QuantityRequested>2</QuantityRequested>
    </OrderPlacementRequestLineItem>
  </OrderPlacementRequestLineItems>
</OrderPlacementRequest>
```

### Aanpassingen response-parsing

De TMH2 response na een order bevat ofwel een `<Acknowledgement>` of een `<OrderPlacementReply>`. De huidige parsing zoekt naar `<OrderID>` en `<ExternalOrderID>` -- dit wordt:
- `<PurchaseOrderNumber>` (ons eigen ordernummer teruggestuurd)
- `<SalesDocumentNumber>` (leverancier ordernummer)

---

## 2. tradeplace-availability (ProductAvailabilityRequest)

### Huidige fouten

| Huidig (fout) | TradeXML 2.1.19 (correct) |
|---|---|
| `<ProductAvailabilityRequest xmlns="...">` | `<ProductAvailabilityRequest>` (geen namespace, DTD-based) |
| `<Product><EAN>` | `<ProductAvailabilityRequestLineItem>` met `<Material materialQualifier="EAN">` |
| `<Quantity>` | `<QuantityRequested>` |
| `<Products>` wrapper | `<ProductAvailabilityRequestLineItems>` |
| Ontbreekt: `<MessageType>` | Verplicht |
| Ontbreekt: `<LineItemNumber>` | Verplicht per line item |

### Correcte XML-structuur

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ProductAvailabilityRequest SYSTEM "TradeXML.dtd">
<ProductAvailabilityRequest>
  <ProductAvailabilityRequestHeader>
    <MessageType>ProductAvailabilityRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">RETAILER_GLN</CustomerCode>
    <SellerCode>SUPPLIER_GLN</SellerCode>
  </ProductAvailabilityRequestHeader>
  <ProductAvailabilityRequestLineItems>
    <ProductAvailabilityRequestLineItem>
      <LineItemNumber>1</LineItemNumber>
      <Material materialQualifier="EAN">4242003...</Material>
      <QuantityRequested>1</QuantityRequested>
    </ProductAvailabilityRequestLineItem>
  </ProductAvailabilityRequestLineItems>
</ProductAvailabilityRequest>
```

### Response parsing aanpassen

De reply is een `<ProductAvailabilityReply>` met `<ProductAvailabilityReplyLineItem>` elementen. Relevante velden per line item:
- `<Material materialQualifier="EAN">` -- EAN-code
- `<QuantityRequested>` -- wat we vroegen
- `<ConfirmedQuantity>` -- wat beschikbaar is
- `<LineStatus>` -- met `<ErrorType>`, `<ErrorCode>`, `<ErrorText>`
- `<ConfirmationSchedule>` -- met `<ConfirmedDeliveryDate>` (levertijd)
- `<SalesUnit>` -- eenheid

---

## 3. tradeplace-webhook (inkomende berichten)

### Huidige fouten in detectie

| Huidig (fout) | TradeXML 2.1.19 (correct) |
|---|---|
| `<OrderConfirmation>` / `<OrderResponse>` | `<OrderPlacementReply>` of `<PushOrderConfirmation>` |
| `<ShippingNotification>` / `<DespatchAdvice>` | `<ShippingNotifications>` (meervoud, met ShipmentNotification in 2.1.17+) |
| `<BillingDocument>` / `<Invoice>` | `<BillingDocument>` (dit klopt al deels) |
| `<PriceList>` / `<PriceCatalog>` | `<PushProductList>` of `<ProductListReply>` |

### Fouten in orderbevestiging-parsing

| Huidig (fout) | TradeXML 2.1.19 (correct) |
|---|---|
| `<OrderID>` | `<PurchaseOrderNumber>` (ons ordernummer) |
| `<ExternalOrderID>` | `<SalesDocumentNumber>` (leverancier ordernummer) |
| `<ConfirmationDate>` | `<ConfirmationSchedule><ConfirmedDeliveryDate>` |
| `<ExpectedDeliveryDate>` | Zit in `<ConfirmationSchedule>` per line item |

### Fouten in verzendmelding-parsing

| Huidig (fout) | TradeXML 2.1.19 (correct) |
|---|---|
| `<TrackingNumber>` | `<TrackingDetails><TrackingDetail><TrackingNumber>` |
| `<ExpectedDeliveryDate>` | `<EstimatedDeliveryDate>` |
| `<OrderID>` | `<PurchaseOrderNumber>` |

### Correcte detectie-functie

```typescript
function detectMessageType(xml: string): string {
  if (xml.includes('<OrderPlacementReply')) return 'OrderPlacementReply';
  if (xml.includes('<PushOrderConfirmation')) return 'PushOrderConfirmation';
  if (xml.includes('<ShippingNotification')) return 'ShippingNotification';
  if (xml.includes('<ShipmentNotification')) return 'ShipmentNotification';
  if (xml.includes('<PushOrderStatus')) return 'PushOrderStatus';
  if (xml.includes('<OrderStatusReply')) return 'OrderStatusReply';
  if (xml.includes('<BillingDocument')) return 'BillingDocument';
  if (xml.includes('<PushProductList')) return 'PushProductList';
  if (xml.includes('<PushOrderChangeConfirmation')) return 'PushOrderChangeConfirmation';
  if (xml.includes('<OrderCancellationReply')) return 'OrderCancellationReply';
  if (xml.includes('<Acknowledgement')) return 'Acknowledgement';
  return 'Unknown';
}
```

---

## 4. Bestanden die worden gewijzigd

| Bestand | Actie |
|---|---|
| `supabase/functions/tradeplace-order/index.ts` | Volledig herschrijven `buildOrderRequest()` + response parsing |
| `supabase/functions/tradeplace-availability/index.ts` | Volledig herschrijven `buildAvailabilityRequest()` + `parseAvailabilityResponse()` |
| `supabase/functions/tradeplace-webhook/index.ts` | Herschrijven `detectMessageType()` + alle handlers |

---

## 5. Gemeenschappelijke helpers

Een gedeelde helper-functie voor TradeXML datumformaat (komt overal terug):

```typescript
function tradeplaceDate(date: Date): string {
  return `<Year>${date.getFullYear()}</Year><Month>${String(date.getMonth()+1).padStart(2,'0')}</Month><Day>${String(date.getDate()).padStart(2,'0')}</Day>`;
}
```

---

## 6. Geen database-wijzigingen nodig

De bestaande `supplier_orders` en `supplier_order_lines` tabellen hebben alle benodigde velden (`xml_request`, `xml_response`, `external_order_id`, `expected_delivery_date`, `confirmed_at`, etc.). De front-end hook `useTradeplace.ts` hoeft ook niet te wijzigen -- alleen de edge functions produceren/consumeren nu correct XML.

