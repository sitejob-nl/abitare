

## Plan: Exact Online API-plan + Performance + Security

### A. Exact Online API-verbeterpunten (5 items)

Dit plan staat al uitgewerkt in `.lovable/plan.md`. Samengevat:

1. **Factuur-sync** — `exact-sync-invoices` refactoren van SalesEntries naar SalesInvoices API (Type 70 journaal)
2. **Contactpersonen** — Nieuw `exact-sync-contacts` endpoint (push/pull via `/crm/Contacts`)
3. **Offertes** — Nieuw `exact-sync-quotes` endpoint (push + status-pull via `/crm/Quotations`)
4. **Artikelen** — Nieuw `exact-sync-items` endpoint (push/pull via `/logistics/Items`)
5. **Webhooks uitbreiden** — 3 extra topics + daadwerkelijke data-sync bij events

**Database:** Kolommen toevoegen: `customers.exact_contact_id`, `quotes.exact_quotation_id/number`, `products.exact_item_id`

**Frontend:** 3 nieuwe sync-mutations in `useExactOnline.ts` + 3 sync-blokken in `ExactOnlineSettings.tsx`

### B. Performance optimalisatie

| Item | Aanpak |
|---|---|
| Bundle analyse | Controleren welke dependencies groot zijn; `recharts` en `xlsx` alleen lazy importeren waar nodig |
| Query optimalisatie | `useOrders`, `useProducts` etc. checken op onnodige re-fetches; `select` clauses beperken tot benodigde kolommen |
| Image loading | Product-images via `loading="lazy"` en `srcset` waar mogelijk |
| React Query tuning | `staleTime` per query-type differentiëren (statische data langer, orders korter) |
| List virtualisatie | Grote lijsten (producten, orders) overwegen voor `react-window` als er >100 items gerenderd worden |

### C. Security scan

| Item | Aanpak |
|---|---|
| RLS audit | Alle tabellen doorlopen op ontbrekende of te ruime policies |
| Edge function auth | Controleren dat alle niet-publieke endpoints `getClaims()` valideren |
| Input sanitisatie | Controleren op raw SQL, ongesanitiseerde HTML inputs |
| Token-opslag | Verifiëren dat geen tokens in localStorage/client-side staan |
| CORS headers | Edge functions controleren op te brede `Allow-Origin` |

### Volgorde van uitvoering

1. **Security scan** eerst — kwetsbaarheden vinden voor livegang
2. **Exact Online API-plan** — de 5 verbeterpunten implementeren
3. **Performance** — optimalisaties doorvoeren

Geschatte omvang: ~10 bestanden nieuw/gewijzigd voor Exact, ~5 voor security fixes, ~5 voor performance.

