
# Plan: Fase 3 - Monteur View Verbeteren

## Huidige Situatie

Goed nieuws: er is al een **complete monteur-omgeving** gebouwd binnen dit project. Je hoeft geen apart project te maken!

### Wat al werkt:
- `/monteur` - Dashboard met opdrachten (gefilterd op `installer_id`)
- `/monteur/opdracht/:id` - Order detail zonder prijzen
- `/monteur/werkbon/:id` - Werkbon formulier met foto's en taken
- `/monteur/werkbonnen` - Overzicht van eigen werkbonnen
- Mobiel-vriendelijk design met eigen layout
- RLS policies op work_reports tabellen

### Wat verbeterd moet worden:

**Probleem**: De huidige implementatie verbergt financiële data alleen op frontend-niveau. Een technisch onderlegde monteur kan via browser DevTools of API-calls nog steeds toegang krijgen tot prijzen, marges en betalingsstatus.

## Oplossing: Database-niveau Beveiliging

### Stap 1: Database VIEW voor Orders (zonder financiële data)

Maak een Postgres VIEW die financiële kolommen uitsluit:

```sql
CREATE VIEW installer_orders AS
SELECT 
  id, order_number, customer_id, quote_id, division_id,
  status, order_date, 
  expected_delivery_date, actual_delivery_date,
  expected_installation_date, actual_installation_date,
  delivery_method, requires_elevator, delivery_notes,
  salesperson_id, assistant_id, installer_id,
  -- UITGESLOTEN: payment_condition, payment_status, amount_paid
  -- UITGESLOTEN: subtotal_products, subtotal_montage, discount_amount
  -- UITGESLOTEN: total_excl_vat, total_vat, total_incl_vat
  -- UITGESLOTEN: total_cost_price, margin_amount, margin_percentage
  internal_notes, customer_notes,
  created_by, created_at, updated_at
FROM orders
WHERE installer_id = auth.uid()
  AND status IN ('montage_gepland', 'geleverd');
```

### Stap 2: Database VIEW voor Order Lines (zonder prijzen)

```sql
CREATE VIEW installer_order_lines AS
SELECT 
  id, order_id, product_id, supplier_id,
  article_code, description, quantity, unit,
  -- UITGESLOTEN: unit_price, cost_price, discount_percentage, line_total, vat_rate
  is_ordered, ordered_at, expected_delivery,
  is_delivered, delivered_at,
  configuration, section_type, is_group_header, group_title, sort_order
FROM order_lines ol
WHERE EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.id = ol.order_id 
    AND o.installer_id = auth.uid()
);
```

### Stap 3: RLS op de Views

```sql
-- Enable RLS op de views
ALTER VIEW installer_orders OWNER TO authenticated;
CREATE POLICY "installer_orders_select" ON installer_orders
  FOR SELECT TO authenticated
  USING (installer_id = auth.uid());
```

### Stap 4: Frontend Hooks Aanpassen

Update `useInstallerOrders.ts` om de views te gebruiken:

```typescript
// Van: .from("orders")
// Naar: .from("installer_orders")
const { data, error } = await supabase
  .from("installer_orders")
  .select(`...`)
```

### Stap 5: Handtekening Functionaliteit (Optioneel)

Voeg canvas-gebaseerde handtekening capture toe aan werkbonnen:
- Signature pad component
- Opslag als base64 of image file
- Veld `customer_signature` aan work_reports tabel

---

## Technische Details

### Bestandswijzigingen

| Bestand | Actie |
|---------|-------|
| **Migratie** | VIEW `installer_orders` aanmaken |
| **Migratie** | VIEW `installer_order_lines` aanmaken |
| `src/hooks/useInstallerOrders.ts` | Query's aanpassen naar views |
| `src/integrations/supabase/types.ts` | Types voor views (auto-generated) |

### Velden die Monteurs WEL zien:

| Orders | Order Lines |
|--------|-------------|
| order_number | description |
| status | quantity |
| expected_installation_date | article_code |
| delivery_notes | is_delivered |
| customer_id (→ adres, telefoon) | expected_delivery |

### Velden die Monteurs NIET zien:

| Orders | Order Lines |
|--------|-------------|
| payment_status | unit_price |
| amount_paid | cost_price |
| total_incl_vat | line_total |
| margin_percentage | discount_percentage |
| subtotal_products | vat_rate |

---

## Alternatief: RLS met Column-level Security

Postgres ondersteunt ook column-level permissions, maar dit is complexer en minder flexibel. De VIEW-aanpak is standaard en beproefd.

---

## Samenvatting

De monteur-omgeving bestaat al en werkt goed. De hoofdverbetering is het toevoegen van **database-niveau beveiliging** zodat financiële data niet alleen verborgen is in de UI, maar ook ontoegankelijk via directe API-calls.

Dit vereist:
1. Twee database migraties (views)
2. Kleine aanpassing in de installer hooks
3. Optioneel: handtekening functionaliteit

Totale geschatte tijd: **4-6 uur**
