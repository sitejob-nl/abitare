

## Plan: Fix seed-demo-data to populate complete mock data

### Problem
The seed function has multiple bugs causing empty/incomplete data:
- `subtotal` column doesn't exist on `quotes` (correct: `subtotal_products`)
- Quote lines use `upsert` with `ignoreDuplicates` but no `id`, so nothing inserts
- 5 of 8 orders have zero order lines
- Zero `order_sections` and zero `quote_sections` with configuration details
- Agenda shows nothing because no orders have delivery/installation dates set to today
- Quote sections missing front/corpus/model configuration fields

### Changes (single file: `supabase/functions/seed-demo-data/index.ts`)

**Fix 1: Quotes — replace `subtotal` with `subtotal_products`**
All 8 quotes need `subtotal` renamed to `subtotal_products`.

**Fix 2: Quote lines — add explicit UUIDs and use insert instead of upsert**
Give each quote line a fixed UUID so they can be upserted reliably. Also add lines for quotes 4-8 (currently only quotes 1-3 have lines).

**Fix 3: Quote sections — add configuration fields**
Add realistic front/corpus/model/handle data to keuken sections:
```
front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Wit",
handle_number: "G-220", model_code: "CITY", model_name: "City"
```

**Fix 4: Order lines for ALL orders**
Add order lines for orders 8004, 8006, 8007, 8008 (currently they have zero lines).

**Fix 5: Order sections**
Create `order_sections` entries mirroring quote sections structure, with configuration details (range, colors, model).

**Fix 6: Agenda — set dates to TODAY**
- Set 2 orders with `expected_delivery_date = TODAY` (status: `levering_gepland`)  
- Set 2 orders with `expected_installation_date = TODAY` (status: `montage_gepland`)
- Use dynamic `today` variable instead of fixed dates

**Fix 7: Add more delivery/installation dates across orders**
Spread dates across coming 2 weeks so the calendar page also shows events.

### Deployment
Redeploy edge function, then call POST to re-seed.

