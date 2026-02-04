

# Plan: Factuur Detail Pagina (/invoices/:id)

## Samenvatting

Een nieuwe factuurdetailpagina maken met focus op betalingsinformatie en Exact Online synchronisatie. De huidige links naar `/orders/{id}` worden aangepast naar `/invoices/{id}`.

---

## Wat de pagina toont

De factuurdetailpagina geeft een overzichtelijke weergave van facturatiegegevens:

| Sectie | Inhoud |
|--------|--------|
| **Header** | Factuurnummer, klantnaam, betalingsstatus badge |
| **Betalingsoverzicht** | Totaal, betaald, openstaand met voortgangsbalk |
| **Factuurregels** | Alle orderlijnen met prijzen (alleen lezen) |
| **Klantgegevens** | Naam, adres, contactinfo |
| **Exact Online info** | Exact Invoice ID, link naar order |
| **Acties** | Betaling registreren |

---

## Exact Online Synchronisatie

De synchronisatie met Exact Online werkt al correct:

**PUSH (Orders → Exact):**
- Orders zonder `exact_invoice_id` worden als SalesInvoice naar Exact gepusht
- Gebruikt endpoint: `/api/v1/{division}/salesinvoice/SalesInvoices` (POST)
- Na succes wordt het Exact Invoice nummer opgeslagen

**PULL (Betalingen ← Exact):**  
- Haalt betalingsstatus op via `/api/v1/{division}/salesinvoice/SalesInvoices` en `/api/v1/{division}/read/financial/Receivables`
- Berekent betaald bedrag en update `payment_status` (open → deels_betaald → betaald)

**Vereisten voor sync:**
- Klant moet gekoppeld zijn aan Exact (`exact_account_id`)
- Actieve Exact Online connectie voor de divisie

---

## Technische Aanpak

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/pages/InvoiceDetail.tsx` | **Nieuw** - Factuurdetailpagina |
| `src/hooks/useInvoices.ts` | **Update** - `useInvoice(id)` hook toevoegen |
| `src/pages/Invoices.tsx` | **Update** - Links naar `/invoices/:id` |
| `src/App.tsx` | **Update** - Route `/invoices/:id` toevoegen |

### Nieuwe useInvoice Hook

```typescript
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(`
          id, order_number, order_date, customer_id, division_id,
          total_incl_vat, total_excl_vat, total_vat,
          payment_status, amount_paid, exact_invoice_id,
          customers(id, first_name, last_name, company_name, email, phone, 
            street_address, postal_code, city),
          divisions(name),
          order_lines(id, description, quantity, unit_price, vat_rate, line_total),
          order_sections(id, title, position)
        `)
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });
}
```

### InvoiceDetail Pagina Layout

De pagina hergebruikt bestaande componenten:
- `PaymentCard` - Betalingsregistratie (ongewijzigd)
- `OrderLinesTable` - Factuurregels (readonly, ongewijzigd)
- Nieuwe `InvoiceInfoCard` geïntegreerd in de pagina - Klant + factuurgegevens

---

## Navigatie

```text
Facturenoverzicht (/invoices)
    │
    ├── Klik op factuur → Factuurdetail (/invoices/:id)
    │                           │
    │                           └── Link "Bekijk order" → Order (/orders/:id)
    │
    └── Exact Online sync knoppen blijven werken
```

