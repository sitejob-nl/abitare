
# Plan: Reparatie Exact Online Factuur Push

## Probleem

De Exact Online API geeft deze foutmelding:
```
"Verplicht: Grootboekrekening"
"Verplicht: Artikel"
```

**Oorzaak**: Het huidige systeem gebruikt het `SalesInvoices` endpoint (logistiek), maar stuurt geen `Item` of `GLAccount` mee per factuurregel.

## Oplossing

Wijzig naar het **SalesEntries** endpoint (financiële boekingen) - dit is geschikter voor diensten en facturen zonder artikelkoppeling.

---

## Technische Wijzigingen

### 1. Nieuw Endpoint

| Huidig | Nieuw |
|--------|-------|
| `POST /salesinvoice/SalesInvoices` | `POST /salesentry/SalesEntries` |

### 2. Nieuw Request Format

**Huidige structuur (werkt niet):**
```json
{
  "OrderedBy": "guid",
  "InvoiceTo": "guid",
  "SalesInvoiceLines": [
    { "Description": "...", "Quantity": 1, "UnitPrice": 100 }
  ]
}
```

**Nieuwe structuur (SalesEntries):**
```json
{
  "Customer": "guid-van-klant",
  "EntryDate": "2026-02-04",
  "Journal": "70",
  "Description": "Factuur order #1",
  "YourRef": "ORD-1",
  "Currency": "EUR",
  "SalesEntryLines": [
    {
      "GLAccount": "guid-van-omzet-grootboek",
      "Description": "Bakoven met magnetron",
      "AmountFC": 2304.96,
      "VATCode": "2"
    }
  ]
}
```

### 3. Grootboekrekening Ophalen

We moeten een standaard omzet-grootboekrekening uit Exact halen. Dit kan via:

```
GET /api/v1/{division}/financial/GLAccounts?$filter=
  Type eq 32 and IsSales eq true
&$select=ID,Code,Description
&$top=1
```

Of: configureerbaar maken in `exact_online_connections` tabel.

### 4. BTW-code Mapping

| Abitare VAT Rate | Exact VATCode |
|------------------|---------------|
| 0% | `"1"` |
| 9% | `"4"` |
| 21% | `"2"` |

---

## Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/exact-sync-invoices/index.ts` | Wijzig endpoint en request format |

### Code Wijzigingen

**1. Nieuwe interface voor SalesEntry:**
```typescript
interface ExactSalesEntry {
  Customer: string;
  EntryDate?: string;
  Journal: string;
  Description?: string;
  YourRef?: string;
  Currency: string;
  SalesEntryLines: ExactSalesEntryLine[];
}

interface ExactSalesEntryLine {
  GLAccount: string;
  Description: string;
  AmountFC: number;
  VATCode: string;
}
```

**2. Helper functie voor standaard grootboekrekening:**
```typescript
async function getDefaultRevenueGLAccount(
  accessToken: string,
  exactDivision: number
): Promise<string | null> {
  const url = `${EXACT_API_URL}/api/v1/${exactDivision}/financial/GLAccounts?` +
    `$filter=Type eq 32&$select=ID,Code&$top=1`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  const accounts = data.d?.results || [];
  return accounts[0]?.ID || null;
}
```

**3. Aangepaste map functie:**
```typescript
function mapToExactSalesEntry(
  order: AbitareOrder, 
  accountId: string,
  glAccountId: string
): ExactSalesEntry {
  const lines: ExactSalesEntryLine[] = [];
  
  for (const line of order.order_lines || []) {
    if ((line as any).is_group_header) continue;
    
    lines.push({
      GLAccount: glAccountId,
      Description: line.description,
      AmountFC: line.line_total || (line.unit_price * (line.quantity || 1)),
      VATCode: mapVatRateToCode(line.vat_rate || 21),
    });
  }
  
  if (lines.length === 0) {
    lines.push({
      GLAccount: glAccountId,
      Description: `Order #${order.order_number}`,
      AmountFC: order.total_excl_vat || 0,
      VATCode: "2",
    });
  }
  
  return {
    Customer: accountId,
    EntryDate: order.order_date || new Date().toISOString().split("T")[0],
    Journal: "70",  // Standaard verkoopboek
    Description: `Factuur order #${order.order_number}`,
    YourRef: `ORD-${order.order_number}`,
    Currency: "EUR",
    SalesEntryLines: lines,
  };
}

function mapVatRateToCode(vatRate: number): string {
  if (vatRate === 0) return "1";
  if (vatRate === 9) return "4";
  return "2"; // 21%
}
```

**4. Aangepaste push functie:**
```typescript
// In pushInvoicesInternal:

// Haal standaard grootboekrekening op (eenmalig)
const glAccountId = await getDefaultRevenueGLAccount(accessToken, exactDivision);
if (!glAccountId) {
  throw new Error("Kon geen standaard omzet-grootboekrekening vinden in Exact");
}

// Build sales entry
const exactEntry = mapToExactSalesEntry(order, accountId, glAccountId);

// Create sales entry in Exact
const response = await fetch(
  `${EXACT_API_URL}/api/v1/${exactDivision}/salesentry/SalesEntries`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(exactEntry),
  }
);
```

---

## Database Update (optioneel)

Voor configureerbare grootboekrekening per divisie:

```sql
ALTER TABLE exact_online_connections 
ADD COLUMN default_gl_account_id text;
```

---

## Resultaat

- Facturen worden correct naar Exact Online gepusht als financiële boekingen
- BTW-codes worden juist gemapt (0%, 9%, 21%)
- Geen artikel-koppeling nodig
- Standaard grootboekrekening wordt automatisch opgehaald uit Exact

## Alternatief

Als jullie wél artikelen uit Exact willen gebruiken:
1. Synchroniseer producten tussen systemen
2. Sla `exact_item_id` op bij producten
3. Gebruik `SalesInvoices` endpoint met `Item` veld

Dit is complexer en alleen nodig bij voorraadmutaties.
