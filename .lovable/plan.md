

## Plan: Alle 5 Exact Online API-verbeterpunten implementeren

### Overzicht

5 verbeterpunten in scope:
1. **SalesInvoices API** i.p.v. SalesEntries
2. **Contactpersonen** synchronisatie via `/crm/Contacts`
3. **Offertes** synchronisatie via `/crm/Quotations`
4. **Artikelen** synchronisatie via `/logistics/Items`
5. **Webhook topics** uitbreiden + daadwerkelijke data-sync bij events

### Database migratie

Nieuwe kolommen toevoegen:

```sql
-- Customers: Exact contact ID voor contactpersonen-sync
ALTER TABLE customers ADD COLUMN exact_contact_id text;

-- Quotes: Exact quotation ID + nummer
ALTER TABLE quotes ADD COLUMN exact_quotation_id text;
ALTER TABLE quotes ADD COLUMN exact_quotation_number text;

-- Products: Exact item ID voor artikelen-sync
ALTER TABLE products ADD COLUMN exact_item_id text;
```

Geen `invoices` tabel gevonden — facturen worden via `orders.exact_invoice_id` bijgehouden. Dit blijft zo, maar de waarde wordt nu een Exact `InvoiceID` GUID i.p.v. een `EntryNumber`.

### Stap 1: Factuur-sync naar SalesInvoices API

**Bestand:** `supabase/functions/exact-sync-invoices/index.ts`

Wijzigingen:
- Vervang `SalesEntries` + `SalesEntryLines` interfaces door `SalesInvoices` + `SalesInvoiceLines`
- POST endpoint wordt `/salesinvoice/SalesInvoices` met geneste `SalesInvoiceLines`
- Regels krijgen `Item` (Exact item GUID als beschikbaar), `Quantity`, `NetPrice`, `Description`, `VATCode`
- Fallback naar `GLAccount` als er geen `exact_item_id` gekoppeld is aan het product
- Na succesvolle POST: sla `InvoiceID` op in `orders.exact_invoice_id` en `InvoiceNumber` als referentie
- Verwijder `mapToExactSalesEntry` functie, vervang door `mapToExactSalesInvoice`
- Journal code selectie: zoek Journal met Type 70 (verkoopfactuurjournaal) i.p.v. Type 50/20

### Stap 2: Contactpersonen synchronisatie

**Nieuw bestand:** `supabase/functions/exact-sync-contacts/index.ts`

Acties: `push`, `pull`, `sync`

**Push** (klant → Exact):
- Per customer met `exact_account_id`: POST/PUT naar `/crm/Contacts`
- Map: `first_name` → `FirstName`, `last_name` → `LastName`, `email` → `Email`, `phone` → `BusinessPhone`, `mobile` → `BusinessMobile`, `city` → `City`, `postal_code` → `Postcode`
- Sla `exact_contact_id` op na POST

**Pull** (Exact → klant):
- GET `/crm/Contacts?$select=ID,Account,FirstName,LastName,Email,BusinessPhone,BusinessMobile,City,Postcode,IsMainContact`
- Match op `Account` GUID → lokale customer via `exact_account_id`
- Update contactgegevens als `IsMainContact = true`

**Config:** Voeg `exact-sync-contacts` toe aan `supabase/config.toml` met `verify_jwt = false`

### Stap 3: Offertes synchronisatie

**Nieuw bestand:** `supabase/functions/exact-sync-quotes/index.ts`

Acties: `push`, `pull_status`

**Push:**
- Per quote zonder `exact_quotation_id`: POST naar `/crm/Quotations`
- Map: `customer.exact_account_id` → `OrderAccount`, `quote_date` → `QuotationDate`, `valid_until` → `ClosingDate`, `reference` → `Description`
- Geneste `QuotationLines` uit `quote_lines` (filter `is_group_header`): `Description`, `Quantity`, `UnitPrice`, optioneel `Item` (via `product.exact_item_id`)
- Sla `QuotationID` en `QuotationNumber` op

**Pull status:**
- GET bestaande quotations, update lokale status bij accept/reject in Exact

**Config:** Voeg `exact-sync-quotes` toe aan `supabase/config.toml`

### Stap 4: Artikelen synchronisatie

**Nieuw bestand:** `supabase/functions/exact-sync-items/index.ts`

Acties: `push`, `pull`, `sync`

**Push:**
- Per product zonder `exact_item_id`: POST naar `/logistics/Items`
- Map: `article_code` → `Code`, `name` → `Description`, `base_price` als `CostPriceStandard`, `IsSalesItem: true`
- Sla `exact_item_id` op

**Pull:**
- Bulk GET `/bulk/Logistics/Items?$select=ID,Code,Description,CostPriceStandard,IsSalesItem`
- Match op `Code` ↔ `article_code`, update of insert

**Config:** Voeg `exact-sync-items` toe aan `supabase/config.toml`

### Stap 5: Webhook topics uitbreiden + processing

**Bestand:** `supabase/functions/exact-webhooks-manage/index.ts`
- Voeg topics toe: `"SalesOrder.SalesOrders"`, `"Logistics.Items"`, `"CRM.Quotations"`

**Bestand:** `supabase/functions/exact-webhook/index.ts`
- Voeg cases toe in de switch:
  - `SalesOrder.SalesOrders`: bij Create/Update → fetch order data van Exact, update lokale `orders` tabel (`exact_sales_order_id`, status)
  - `Logistics.Items`: bij Create/Update → fetch item, upsert product met matching `article_code`
  - `CRM.Quotations`: bij Update → fetch quotation status, update lokale quote status
  - `CRM.Accounts` Create/Update → fetch account data, upsert customer (nu alleen logging)
  - `SalesInvoice.SalesInvoices` Create/Update → fetch invoice, update betaalstatus

Per webhook processing: haal het record op via GET `{ExactOnlineEndpoint}` met de access token en sync de data.

### Stap 6: Frontend hooks

**Bestand:** `src/hooks/useExactOnline.ts`

Toevoegen:
- `useSyncContacts` — mutation voor `exact-sync-contacts`
- `useSyncQuotes` — mutation voor `exact-sync-quotes`
- `useSyncItems` — mutation voor `exact-sync-items`

### Stap 7: Frontend settings UI

**Bestand:** `src/components/settings/ExactOnlineSettings.tsx`

Sync-blokken uitbreiden met:
- **Contactpersonen sync** (push/pull/sync buttons)
- **Offertes sync** (push naar Exact / status ophalen)
- **Artikelen sync** (push/pull/sync buttons)
- Bestaand klanten-blok en webhooks behouden

### Bestanden overzicht

| Actie | Bestand |
|---|---|
| Migratie | Kolommen: `customers.exact_contact_id`, `quotes.exact_quotation_id/number`, `products.exact_item_id` |
| Refactor | `supabase/functions/exact-sync-invoices/index.ts` (SalesEntries → SalesInvoices) |
| Nieuw | `supabase/functions/exact-sync-contacts/index.ts` |
| Nieuw | `supabase/functions/exact-sync-quotes/index.ts` |
| Nieuw | `supabase/functions/exact-sync-items/index.ts` |
| Refactor | `supabase/functions/exact-webhooks-manage/index.ts` (3 extra topics) |
| Refactor | `supabase/functions/exact-webhook/index.ts` (daadwerkelijke data-sync) |
| Refactor | `src/hooks/useExactOnline.ts` (3 nieuwe mutations) |
| Refactor | `src/components/settings/ExactOnlineSettings.tsx` (3 nieuwe sync-blokken) |
| Config | `supabase/config.toml` (3 nieuwe functies) |

