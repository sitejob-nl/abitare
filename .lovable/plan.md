

## Plan: Ontbrekende functionaliteiten toevoegen (alles behalve staffel/bundelkortingen)

Dit plan implementeert 13 verbeteringen gegroepeerd in 7 werkblokken.

---

### Blok 1: Import Health Dashboard

Nieuw component `ImportHealthDashboard` op de ProductImport pagina dat samenvattingskaarten toont per leverancier:
- Aantal producten per leverancier (query `products` grouped by `supplier_id`)
- Leveranciers met 0 producten → rode waarschuwing
- Producten zonder prijs (`base_price IS NULL AND NOT EXISTS product_prices`)
- Laatste import datum + delta t.o.v. vorige run (uit `import_logs`)
- Prijsafwijkingen: vergelijk huidige `base_price` met vorige `import_logs` run (optioneel, eenvoudige indicator)

**Bestanden:**
- `src/components/import/ImportHealthDashboard.tsx` (nieuw)
- `src/pages/ProductImport.tsx` — dashboard bovenaan toevoegen

---

### Blok 2: Prijslijst versiebeheer

Database migratie:
```sql
ALTER TABLE public.price_groups 
  ADD COLUMN IF NOT EXISTS edition text,
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date;
```

UI: In de PriceGroups pagina editie/geldigheid tonen. Bij import: `edition` meegeven.

**Bestanden:**
- Database migratie
- `src/pages/PriceGroups.tsx` — editie/geldigheid kolommen tonen

---

### Blok 3: Prijstraceerbaarheid per offerteregel

Database migratie:
```sql
ALTER TABLE public.quote_lines 
  ADD COLUMN IF NOT EXISTS price_source_metadata jsonb;
```

Bij het toevoegen van een offerteregel wordt `price_source_metadata` gevuld met:
```json
{ "source": "price_group", "price_group_id": "...", "import_run": "...", "timestamp": "..." }
```

**Bestanden:**
- Database migratie
- `src/hooks/useQuoteLines.ts` — metadata meegeven bij insert
- `src/components/quotes/EditableLineRow.tsx` — indicator icoon als prijs een override is

---

### Blok 4: Product varianten (parent_product_id)

Database migratie:
```sql
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS parent_product_id uuid REFERENCES public.products(id);
CREATE INDEX IF NOT EXISTS idx_products_parent ON public.products(parent_product_id);
```

Dit maakt groepering mogelijk zonder bestaande logica te breken. UI: op ProductDetail pagina een "Varianten" sectie tonen als er gerelateerde producten met dezelfde `parent_product_id` bestaan.

**Bestanden:**
- Database migratie
- `src/pages/ProductDetail.tsx` — varianten-lijst card

---

### Blok 5: PDF configuratie-kop uitbreiden

De `drawSpecsTable` functie toont al front_number, front_color, corpus_color, etc. Ontbrekend: **model_name**, **handle_number** (greep) staat er al, maar **grip_color** (kleur greep) ontbreekt, en **configuration** JSON bevat extra STOSA-specifieke velden.

Uitbreiding: `model_name` als eerste spec tonen. Uit `configuration` JSON eventueel `front_type_name` halen.

**Bestanden:**
- `src/lib/pdf/quotePdfHelpers.ts` — `drawSpecsTable` uitbreiden met `model_name` en config-velden

---

### Blok 6: Communicatie-verbeteringen

**6a. Inbox zoekfunctionaliteit:**
De Inbox pagina heeft al een zoek-input maar die is niet functioneel. Koppelen aan de Microsoft Graph API `$search` parameter of client-side filtering op subject/sender.

**6b. Van gesprek naar actie/taak:**
Op `ServiceTicketCard` en communicatie-notities een "Maak taak" knop toevoegen die een snelle notitie/actiepunt aanmaakt (insert in `order_notes` of `service_ticket_notes` met type `actie`).

**Bestanden:**
- `src/pages/Inbox.tsx` — zoekfilter activeren (client-side op emails array)
- `src/components/customers/CustomerCommunicationTab.tsx` — "Maak actie" knop op berichten

---

### Blok 7: Overige verbeteringen

**7a. Google Maps deep link op monteursapp:**
Al aanwezig! (regel 213-221 InstallerOrderDetail.tsx). ✅ Geen actie nodig.

**7b. Ticketstatus automatisering bij drag & drop:**
Controleren dat de kalender drag & drop handler ook de ticketstatus naar "ingepland" zet. Check `handleDragEnd` in Calendar.tsx — dit lijkt al geïmplementeerd via `scheduleTicket`.

**7c. Delta import met soft delete:**
In de `import-products` edge function: na een volledige import (mode `replace_all`), producten die niet in de batch zaten markeren als `is_active = false`.

**7d. Raw import payload opslag:**
In de `import-products` edge function: de ruwe payload opslaan in een `import_payloads` storage bucket of een `raw_payload` JSONB kolom op `import_logs`.

**7e. Product documenten tabel:**
```sql
CREATE TABLE public.product_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'datasheet',
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view product documents" ON public.product_documents FOR SELECT TO authenticated USING (true);
```

**7f. Herinneringsfunctie:**
Dashboard `AgendaToday` component uitbreiden: afspraken die binnen 1 uur beginnen markeren met een gele badge "Binnenkort".

**Bestanden:**
- Database migratie voor `product_documents` tabel en `import_logs.raw_payload`
- `supabase/functions/import-products/index.ts` — soft delete logica + raw payload opslag
- `src/components/dashboard/AgendaToday.tsx` — herinnerings-badge
- `src/pages/ProductDetail.tsx` — documenten-sectie

---

### Samenvatting wijzigingen

| Blok | Bestanden | DB migratie |
|------|-----------|-------------|
| 1. Import Health Dashboard | `ImportHealthDashboard.tsx` (nieuw), `ProductImport.tsx` | Nee |
| 2. Prijslijst versiebeheer | `PriceGroups.tsx` | `edition`, `valid_from`, `valid_until` op `price_groups` |
| 3. Prijstraceerbaarheid | `useQuoteLines.ts`, `EditableLineRow.tsx` | `price_source_metadata` op `quote_lines` |
| 4. Product varianten | `ProductDetail.tsx` | `parent_product_id` op `products` |
| 5. PDF configuratie-kop | `quotePdfHelpers.ts` | Nee |
| 6. Communicatie | `Inbox.tsx`, `CustomerCommunicationTab.tsx` | Nee |
| 7. Overig | `AgendaToday.tsx`, `ProductDetail.tsx`, edge function | `product_documents` tabel, `raw_payload` op `import_logs` |

