

## Exact Online Integratie — Volledige Audit

Na grondige analyse van alle 11 Edge Functions, de frontend hooks, de database-schema en de API-referentie volgt hier het testrapport met bevindingen.

### Architectuur Overzicht

De integratie bestaat uit:

```text
Frontend (useExactOnline.ts)
    ↓ supabase.functions.invoke()
Edge Functions (11 functies)
    ↓ getExactTokenFromConnection()
SiteJob Connect (token broker)
    ↓ access_token
Exact Online REST API (OData v3)
```

Alle database-kolommen zijn aanwezig: `exact_account_id`, `exact_contact_id`, `exact_item_id`, `exact_quotation_id/number`, `exact_invoice_id`, `exact_sales_order_id/number`.

---

### Bevinding 1: Factuur-sync (SalesInvoices) — API-fout

**Bestand:** `exact-sync-invoices/index.ts` regel 318-326

Het veld `OrderDate` wordt meegestuurd in de SalesInvoice POST, maar de Exact Online SalesInvoices API gebruikt `InvoiceDate` (niet `OrderDate`). `OrderDate` is geen geldig veld op SalesInvoices en zal genegeerd worden of een fout geven.

Daarnaast: `OrderedBy` is correct voor SalesOrders maar voor SalesInvoices heet het verplichte klant-veld ook `OrderedBy` — dat klopt wel.

**Fix:** Wijzig `OrderDate` → `InvoiceDate` in de `mapToExactSalesInvoice` functie.

---

### Bevinding 2: Factuur-sync — Ontbrekende `AmountFC` logica bij betaalstatus

**Bestand:** `exact-sync-invoices/index.ts` regel 206, 220-225

Bij `pullPaymentStatus` wordt `AmountDC` (openstaand bedrag in eigen valuta) gebruikt om betaalstatus te berekenen. De logica `amountPaid = totalIncl - amountDC` is correct — `AmountDC` bevat het openstaande saldo.

Maar de `$select` bevat `StarterSalesInvoiceStatus` wat niet bestaat op het SalesInvoices endpoint. Dit veroorzaakt geen fout (Exact negeert onbekende select-velden) maar is ruis.

**Fix:** Verwijder `StarterSalesInvoiceStatus` uit de `$select`.

---

### Bevinding 3: Contacten-sync — `AddressStreet` is geen geldig veld

**Bestand:** `exact-sync-contacts/index.ts` regel 79

Het veld `AddressStreet` wordt gebruikt maar bestaat niet op de Contacts entity. Contacten erven hun adres van het Account. Het correcte veld voor een straatadres op een contact is er niet — adresgegevens op contactniveau worden niet ondersteund in Exact.

**Fix:** Verwijder de `AddressStreet`-mapping. Adresgegevens worden alleen op Account-niveau gesynchroniseerd (wat al werkt via `exact-sync-customers`).

---

### Bevinding 4: Offertes — Ontbrekende valuta

**Bestand:** `exact-sync-quotes/index.ts` regel 122-128

De Quotations POST mist het `Currency` veld. Hoewel Exact standaard de administratievaluta gebruikt, is het veiliger om deze expliciet mee te sturen.

**Fix:** Voeg `Currency: "EUR"` toe aan het quotation-object.

---

### Bevinding 5: Artikelen — `Code` lengte-restrictie

**Bestand:** `exact-sync-items/index.ts` regel 84

Artikelcodes worden afgekort op 30 tekens (`substring(0, 30)`). Exact Online staat maximaal **30 tekens** toe voor `Code`, dus dit is correct. Maar de `Description` wordt afgekort op 100 tekens — Exact staat **100 tekens** toe, dus ook correct.

Geen fix nodig.

---

### Bevinding 6: Webhook processing — Ontbrekende `Content` wrapper

**Bestand:** `exact-webhook/index.ts` regel 24

De webhook handler destructureert `Topic, Division, Key, ExactOnlineEndpoint, EventAction` direct uit `content = await req.json()`. Maar volgens de API-referentie zit de data in een `Content` wrapper:

```json
{
  "Content": {
    "Topic": "...",
    "Division": 123,
    "Key": "...",
    "ExactOnlineEndpoint": "...",
    "EventAction": "Update"
  },
  "HashCode": "..."
}
```

Als de webhook via de SiteJob Connect router gaat, kan deze al unwrapped zijn. Dit hangt af van de Connect-architectuur. Als Connect de `Content` doorgeeft zonder wrapper, is de huidige code correct.

**Risico:** Als Exact de webhook direct verstuurt (niet via Connect), crasht de verwerking. Verificatie nodig of Connect de payload unwrapt.

**Fix:** Defensieve check toevoegen: `const payload = content.Content || content;`

---

### Bevinding 7: Webhook HMAC-validatie ontbreekt

**Bestand:** `exact-webhook/index.ts` regel 18-50

De webhook valideert via `X-Webhook-Secret` header-vergelijking met de opgeslagen `webhook_secret`. Maar de Exact Online API stuurt een `HashCode` in de body (HMAC-SHA256 van de Content). De huidige validatie is een custom mechanisme via SiteJob Connect, niet de standaard Exact HMAC-validatie.

Dit is correct als Connect de `X-Webhook-Secret` header toevoegt als proxy — dan is de validatie veilig. De architectuur-memory bevestigt dit.

Geen fix nodig — de Connect-proxy handelt de HMAC-validatie af.

---

### Bevinding 8: Sync-functies missen authenticatie

**Bestanden:** Alle sync-functies behalve `exact-api`

Alleen `exact-api/index.ts` gebruikt `requireAuth(req)`. Alle sync-functies (`exact-sync-customers`, `exact-sync-contacts`, `exact-sync-quotes`, `exact-sync-items`, `exact-sync-invoices`, `exact-sync-sales-orders`, `exact-sync-purchase-orders`) valideren GEEN gebruiker-authenticatie. Ze accepteren elke request met een `divisionId`.

Dit is deels bewust: `exact-process-queue` roept ze intern aan met de anon key. Maar ze zijn ook rechtstreeks via de frontend bereikbaar zonder auth-check.

**Fix:** Voeg `requireAuth(req)` toe aan alle sync-functies, met een uitzondering voor interne calls (bijv. via een service-role header check).

---

### Bevinding 9: `exact-process-queue` — verkeerde URL-constructie

**Bestand:** `exact-process-queue/index.ts` regel 83-84

De queue processor roept sync-functies aan via:
```
fetch(`${SUPABASE_URL}/functions/v1/${syncConfig.functionName}`, ...)
```
Met de `SUPABASE_ANON_KEY` als Bearer token. Als we auth toevoegen aan de sync-functies (Bevinding 8), zal de queue processor falen omdat de anon key geen geldige user-sessie bevat.

**Fix bij auth-toevoeging:** Gebruik `SUPABASE_SERVICE_ROLE_KEY` in de queue processor, of voeg een bypass-header toe die sync-functies herkennen als interne call.

---

### Bevinding 10: Pull-paginering contacten — mogelijke infinite loop

**Bestand:** `exact-sync-contacts/index.ts` regel 146

De filter `$filter=IsMainContact eq true` gecombineerd met `$top=1000` zou moeten werken. Maar de pagineringslogica op regel 172-176 parst de `$skiptoken` met een regex. Als Exact de `__next` URL anders formatteert (bijv. URL-encoded quotes), zou de regex falen en de loop stoppen.

**Risico:** Laag. Standaard Exact paginering werkt met `__next` URLs die direct bruikbaar zijn. De huidige logica parst de token onnodig — beter is om de volledige `__next` URL direct te gebruiken.

**Fix:** Vervang de skiptoken-extractie door directe gebruik van `data.d.__next` als volledige URL.

---

### Samenvatting: Fixes nodig

| # | Bevinding | Ernst | Fix |
|---|---|---|---|
| 1 | `OrderDate` → `InvoiceDate` in factuur-sync | Hoog | Veldnaam wijzigen |
| 2 | `StarterSalesInvoiceStatus` in $select | Laag | Verwijderen |
| 3 | `AddressStreet` op Contacts | Medium | Verwijderen |
| 4 | Ontbrekende `Currency` op Quotations | Laag | Toevoegen |
| 6 | Webhook Content wrapper | Medium | Defensieve check |
| 8 | Ontbrekende auth op sync-functies | Hoog | Auth toevoegen |
| 9 | Queue processor auth-conflict | Hoog | Service-role bypass |
| 10 | Paginering __next URL | Laag | Direct URL gebruiken |

### Plan van aanpak

1. **exact-sync-invoices** — `OrderDate` → `InvoiceDate`, verwijder `StarterSalesInvoiceStatus`
2. **exact-sync-contacts** — Verwijder `AddressStreet`, fix paginering naar directe `__next` URL
3. **exact-sync-quotes** — Voeg `Currency: "EUR"` toe
4. **exact-webhook** — Defensieve `Content` wrapper check
5. **Auth toevoegen** — `requireAuth` in alle sync-functies + service-role bypass voor `exact-process-queue`
6. **exact-sync-items** en overige — Paginering naar directe `__next` URL

Totaal: 7 bestanden wijzigen, 0 nieuwe bestanden.

