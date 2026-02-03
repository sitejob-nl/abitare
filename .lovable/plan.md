
# Plan: Optimalisatie Offerte Workflow met Sectie-Korting

## Overzicht

Dit plan optimaliseert de offerte-workflow op basis van het referentiesysteem uit de screenshots. Het doel is om de workflow logisch en efficient te maken voor het hele traject: van offerte-aanmaak, via bestelling, tot facturatie.

## Analyse van Screenshots

Op basis van de aangeleverde screenshots herken ik de volgende workflow-stappen:

### 1. Leverancier & Prijsgroep Selectie (image002)
Het dialoogvenster toont een drietraps-selectie:
- Leverancier selecteren (bijv. STOS1IT = Stosa)
- Range/Model kiezen (MPPT, MPPT GL met beschrijving en prijsgroep)
- Kleur kiezen uit de beschikbare codes (AS, BAL, CHO, etc.)

### 2. Meubelen Configuratie (image003, image004)
Uitgebreide eigenschappen per uitvoering:
- Front: uitvoering, kleur
- Korpus: kleur binnenzijde
- Plint: hoogte en kleur
- Greep: uitvoering en kleur
- Scharnieren, lades, etc.
- Kolomkast hoogte, aanrecht hoogte, blad dikte

### 3. Apparatuur met Groepering (image005)
Apparaten gegroepeerd per locatie:
- "Apparatuur kastenwand bestaande uit:" (Miele koelkast, oven, etc.)
- "Apparatuur eiland bestaande uit:" (kookplaat, afzuig, vaatwasser)

### 4. Werkbladen (image006)
Configuratie met:
- Materiaal (Keramiek 12mm)
- Kleur
- Randafwerking
- Groepering: "Werkblad voor eiland:", "Werkblad voor dressoir:"

### 5. Montage Artikelen (image007)
Serviceregels zoals:
- Keukenmontage per m1
- Aansluitkosten
- Transportkosten per zone

---

## Huidige Situatie vs. Gewenste Situatie

| Functie | Huidige Status | Nodig |
|---------|----------------|-------|
| Klant selecteren bij offerte | Ja | - |
| Secties aanmaken (meubelen, apparatuur, etc.) | Ja | - |
| Leverancier/Prijsgroep per sectie | Ja | - |
| Kleur selectie per sectie | Ja | - |
| Configuratie-eigenschappen (front, corpus, etc.) | Ja | - |
| Producten toevoegen met prijs-lookup | Ja | - |
| Groepkoppen (bijv. "Eiland bestaande uit:") | Ja | - |
| Korting op offerte-niveau | Ja | - |
| **Korting per sectie** | **Nee** | **Ja** |
| Sectie-configuratie doorkopiëren naar order | Gedeeltelijk | Verbeteren |
| Sectie-subtotalen met korting | Nee | Ja |

---

## Te Implementeren Functionaliteiten

### 1. Korting per Sectie

Voeg de mogelijkheid toe om per sectie een korting (percentage of bedrag) in te stellen.

**Database wijziging - quote_sections tabel:**
```sql
ALTER TABLE quote_sections ADD COLUMN discount_percentage numeric;
ALTER TABLE quote_sections ADD COLUMN discount_amount numeric DEFAULT 0;
ALTER TABLE quote_sections ADD COLUMN discount_description text;
```

**Database wijziging - order_sections tabel (nieuw):**
Om secties ook op orders te behouden (voor facturatie en leveranciersorders):
```sql
CREATE TABLE order_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  quote_section_id uuid REFERENCES quote_sections(id),
  section_type text NOT NULL,
  title text,
  sort_order int,
  subtotal numeric DEFAULT 0,
  discount_percentage numeric,
  discount_amount numeric DEFAULT 0,
  discount_description text,
  -- Configuratie velden (gekopieerd van quote_section)
  range_id uuid REFERENCES product_ranges(id),
  color_id uuid REFERENCES product_colors(id),
  front_number text,
  front_color text,
  corpus_color text,
  plinth_color text,
  hinge_color text,
  drawer_color text,
  handle_number text,
  column_height_mm int,
  countertop_height_mm int,
  countertop_thickness_mm int,
  workbench_material text,
  workbench_edge text,
  workbench_color text,
  description text,
  created_at timestamp DEFAULT now()
);
```

**Database wijziging - order_lines uitbreiden:**
```sql
ALTER TABLE order_lines ADD COLUMN section_id uuid REFERENCES order_sections(id);
```

### 2. UI Aanpassingen

#### Sectie Korting Editor (QuoteSectionCard)
Voeg een korting-editor toe aan elke sectie:
- Percentage/bedrag toggle
- Automatische berekening van kortingsbedrag
- Optionele omschrijving (bijv. "Showroommodel", "Actie")

#### Sectie Totalen Update
Pas `QuoteSectionCard` aan om:
- Bruto subtotaal te tonen (som van alle regels)
- Korting regel te tonen (als korting > 0)
- Netto sectietotaal te tonen

#### QuoteTotals Component
Pas aan voor:
- Toon totalen per sectie met korting
- Totaal alle secties
- Quote-niveau korting
- Eindtotalen

### 3. Quote naar Order Conversie Verbeteren

Update `useConvertQuoteToOrder` om:
1. Order secties aan te maken (nieuw)
2. Sectie-configuratie volledig te kopiëren
3. Sectie-korting mee te nemen
4. Order lines te koppelen aan order sections

### 4. Order Secties Weergave

Update `OrderLinesTable` om:
- Regels per sectie te groeperen
- Sectie-korting te tonen
- Sectie-totalen te berekenen

---

## Technische Implementatie

### Fase 1: Database Migratie

```sql
-- 1. Korting velden toevoegen aan quote_sections
ALTER TABLE quote_sections 
ADD COLUMN IF NOT EXISTS discount_percentage numeric,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_description text;

-- 2. Order sections tabel aanmaken
CREATE TABLE order_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_section_id uuid REFERENCES quote_sections(id),
  section_type text NOT NULL,
  title text,
  sort_order int DEFAULT 0,
  subtotal numeric DEFAULT 0,
  discount_percentage numeric,
  discount_amount numeric DEFAULT 0,
  discount_description text,
  range_id uuid REFERENCES product_ranges(id),
  color_id uuid REFERENCES product_colors(id),
  front_number text,
  front_color text,
  corpus_color text,
  plinth_color text,
  hinge_color text,
  drawer_color text,
  handle_number text,
  column_height_mm int,
  countertop_height_mm int,
  countertop_thickness_mm int,
  workbench_material text,
  workbench_edge text,
  workbench_color text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 3. Section_id toevoegen aan order_lines
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES order_sections(id);

-- 4. RLS policies
ALTER TABLE order_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order sections"
ON order_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert order sections"
ON order_sections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update order sections"
ON order_sections FOR UPDATE TO authenticated USING (true);

-- 5. Index voor performance
CREATE INDEX idx_order_sections_order_id ON order_sections(order_id);
CREATE INDEX idx_order_lines_section_id ON order_lines(section_id);
```

### Fase 2: Frontend - Sectie Korting

**Bestanden te wijzigen:**

1. `src/hooks/useQuoteSections.ts` - Update types voor discount velden
2. `src/components/quotes/QuoteSectionCard.tsx` - Korting UI toevoegen
3. `src/components/quotes/QuoteSectionConfig.tsx` - Korting tab toevoegen in config dialog
4. `src/components/quotes/QuoteTotals.tsx` - Sectie-korting meenemen in berekening

**Nieuwe component: SectionDiscountEditor**
```
src/components/quotes/SectionDiscountEditor.tsx
```
- Percentage/bedrag toggle
- Input velden
- Live preview van korting

### Fase 3: Quote naar Order Conversie

**Bestanden te wijzigen:**

1. `src/hooks/useConvertQuoteToOrder.ts` - Volledig herschrijven om order_sections te creëren
2. `src/integrations/supabase/types.ts` - Wordt automatisch geüpdatet na migratie

**Nieuwe hooks:**
```
src/hooks/useOrderSections.ts - CRUD voor order sections
```

### Fase 4: Order Weergave Update

**Bestanden te wijzigen:**

1. `src/hooks/useOrders.ts` - Order sections ophalen
2. `src/components/orders/OrderLinesTable.tsx` - Groeperen per sectie
3. `src/pages/OrderDetail.tsx` - Secties tonen met configuratie

---

## Workflow Diagram

```text
OFFERTE AANMAKEN
┌────────────────────────────────────────────────────────────────┐
│ 1. Klant selecteren/aanmaken                                   │
│ 2. Nieuwe sectie toevoegen (bijv. "Meubelen - Eiland")        │
│    ├─ Leverancier kiezen                                       │
│    ├─ Prijsgroep (Range) selecteren                           │
│    ├─ Kleur kiezen                                            │
│    └─ Configuratie invullen (front, corpus, etc.)             │
│ 3. Producten toevoegen aan sectie                              │
│    ├─ Prijs automatisch op basis van prijsgroep               │
│    ├─ Groepkoppen toevoegen ("Bestaande uit:")                │
│    └─ Sub-regels/accessoires                                  │
│ 4. Sectie korting toepassen (optioneel)                        │
│ 5. Herhaal voor andere secties (apparatuur, werkblad, etc.)   │
│ 6. Offerte-niveau korting toepassen (optioneel)               │
│ 7. Betalingsvoorwaarden instellen                              │
│ 8. PDF exporteren en versturen                                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
OFFERTE GEACCEPTEERD → OMZETTEN NAAR ORDER
┌────────────────────────────────────────────────────────────────┐
│ • Alle secties met configuratie gekopieerd                     │
│ • Alle regels met prijzen gekopieerd                          │
│ • Sectie-kortingen behouden                                    │
│ • Status: "Nieuw"                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
ORDER VERWERKING
┌────────────────────────────────────────────────────────────────┐
│ • Bestelklaar maken (vier-ogen principe)                       │
│ • Per sectie/leverancier inkooporders plaatsen                │
│ • Levering en montage plannen                                  │
│ • Betalingen registreren                                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
FACTURATIE
┌────────────────────────────────────────────────────────────────┐
│ • Factuur genereren op basis van order + secties               │
│ • Sectie-structuur behouden in factuurregels                  │
│ • Push naar Exact Online                                       │
└────────────────────────────────────────────────────────────────┘
```

---

## Bestanden Overzicht

### Nieuwe bestanden
- `src/components/quotes/SectionDiscountEditor.tsx`
- `src/hooks/useOrderSections.ts`

### Te wijzigen bestanden
- `src/hooks/useQuoteSections.ts` - Discount types
- `src/components/quotes/QuoteSectionCard.tsx` - Korting UI
- `src/components/quotes/QuoteSectionConfig.tsx` - Korting tab
- `src/components/quotes/QuoteTotals.tsx` - Berekeningen update
- `src/hooks/useConvertQuoteToOrder.ts` - Sectie-conversie
- `src/hooks/useOrders.ts` - Sections ophalen
- `src/components/orders/OrderLinesTable.tsx` - Sectie-groepering
- `src/pages/OrderDetail.tsx` - Secties weergave

### Database migratie
- 1 migratie met alle schema-wijzigingen

---

## Voordelen van deze Aanpak

1. **Consistentie**: Sectie-structuur blijft behouden door hele workflow
2. **Flexibiliteit**: Korting op zowel sectie- als offerte-niveau
3. **Traceerbaarheid**: Van offerte-sectie naar order-sectie naar factuur
4. **Leveranciersorders**: Per sectie (= per leverancier) bestellingen plaatsen
5. **Rapportage**: Marge-analyse per sectie/leverancier mogelijk
