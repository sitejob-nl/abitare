
# STOSA Prijsgroepen Systeem - Implementatieplan

## Huidige Situatie

- **3.000 Stosa producten** al geimporteerd in `products`
- **2.667 product_ranges** met variant codes (401, 402, 404...) als code en "FPC" als naam
- Prijzen staan al in `product_prices` gekoppeld aan deze ranges
- `worktop_operations` tabel bestaat al
- `QuoteSectionConfig` heeft al leverancier/prijsgroep/kleur selectie

## Probleem

De huidige ranges zijn ruwe variant codes uit de Excel (401 = E1, 701 = E1 variant). Er is geen structuur voor:
- Echte prijsgroepen (E1-E10, A, B, C) met betekenisvolle namen
- Kleur-per-prijsgroep mapping
- Model/collectie laag (Metropolis, Natural, Kaya)
- Werkbladmaterialen en plintopties

## Plan - Fase 1: Database Schema Uitbreiden

### 1.1 Suppliers tabel uitbreiden
Twee kolommen toevoegen aan `suppliers`:
- `has_price_groups` (boolean, default false)
- `price_system` (text: 'direct', 'price_groups', 'points')

Stosa instellen op `price_system = 'price_groups'`.

### 1.2 Product_ranges tabel uitbreiden
Kolommen toevoegen:
- `collection` (text) - 'evolution' of 'art'
- `available_price_groups` (text[]) - bijv. ['E1','E2',...]

### 1.3 Nieuwe tabel: `price_groups`
Definitie van prijsgroepen per leverancier:

| Kolom | Type | Omschrijving |
|-------|------|-------------|
| id | uuid | PK |
| supplier_id | uuid | FK naar suppliers |
| code | text | 'E1', 'E2', ..., 'A', 'B', 'C' |
| name | text | 'Prijsgroep E1 - Termo Strutturato' |
| collection | text | 'evolution', 'art' |
| sort_order | integer | Sorteervolgorde |
| is_glass | boolean | True voor A, B, C |

Seed data: E1-E10 + A, B, C voor Stosa Evolution.

### 1.4 Nieuwe tabel: `price_group_colors`
Kleuren per prijsgroep:

| Kolom | Type | Omschrijving |
|-------|------|-------------|
| id | uuid | PK |
| price_group_id | uuid | FK naar price_groups |
| color_code | text | 'RNO', 'BIA', etc. |
| color_name | text | 'Rovere Nodato' |
| material_type | text | 'termo_strutturato', 'laccato' |
| finish | text | 'opaco', 'lucido' |

### 1.5 Nieuwe tabel: `worktop_materials`
Werkbladmaterialen:

| Kolom | Type | Omschrijving |
|-------|------|-------------|
| id | uuid | PK |
| supplier_id | uuid | FK |
| code | text | Artikelcode |
| name | text | Naam |
| material_type | text | 'laminato', 'fenix', 'dekton' |
| thickness_mm | integer | 20, 40, 60 |
| price_per_meter | numeric | Prijs per meter |

### 1.6 Nieuwe tabel: `plinth_options`
Plintopties:

| Kolom | Type | Omschrijving |
|-------|------|-------------|
| id | uuid | PK |
| supplier_id | uuid | FK |
| code | text | Artikelcode |
| name | text | Naam |
| height_mm | integer | 100, 120, 150 |
| price_per_meter | numeric | Meterprijs |

### 1.7 Quote_sections: `price_group_id` kolom toevoegen
Zodat een sectie direct verwijst naar een prijsgroep (E5) naast de range (model).

## Fase 2: Prijsgroep Selectie in Offerte Workflow

### 2.1 AddSectionDialog aanpassen
Na het selecteren van leverancier "Stosa" (met `has_price_groups = true`):
1. Toon **Model** dropdown (product_ranges gefilterd op leverancier)
2. Toon **Prijsgroep** dropdown (price_groups gefilterd op leverancier + collectie)
3. Automatisch de sectietitel zetten op model + prijsgroep

### 2.2 QuoteSectionConfig aanpassen
- Prijsgroep selectie toevoegen (E1-E10, A, B, C)
- Kleuren filteren op geselecteerde prijsgroep via `price_group_colors`
- Bestaande kleurvelden (front, corpus, scharnier, lade, plint) behouden

### 2.3 Prijs lookup aanpassen
Bij het toevoegen van een product aan een sectie:
- Huidige prijs lookup via `product_prices.range_id` blijft werken
- De prijsgroep uit de sectie bepaalt welke range_id gebruikt wordt voor de prijs

## Fase 3: Beheer UI

### 3.1 PriceGroups pagina uitbreiden
- Tabblad voor "Prijsgroepen" (E1-E10) naast bestaande "Ranges"
- Per prijsgroep: kleuren beheren
- Seed knop om E1-E10 + A, B, C aan te maken voor Stosa

### 3.2 Werkbladen & Plinten beheer
- Aparte sectie op de PriceGroups pagina of nieuwe pagina
- CRUD voor worktop_materials en plinth_options

## Fase 4: Import Aanpassen

### 4.1 Excel import verbeteren
De bestaande import al werkt met variant codes (701-710 mapping naar ranges). Aanpassing:
- Bij import automatisch koppelen aan `price_groups` in plaats van losse ranges
- Mapping: 701=E1, 702=E2, ..., 710=E10, 731=A, 732=B, 733=C

## Technische Details

### Migraties nodig
1. ALTER TABLE suppliers - 2 kolommen
2. ALTER TABLE product_ranges - 2 kolommen  
3. ALTER TABLE quote_sections - 1 kolom (price_group_id)
4. CREATE TABLE price_groups + RLS
5. CREATE TABLE price_group_colors + RLS
6. CREATE TABLE worktop_materials + RLS
7. CREATE TABLE plinth_options + RLS
8. INSERT seed data voor E1-E10 + A, B, C

### Frontend bestanden te wijzigen
- `src/components/quotes/AddSectionDialog.tsx` - prijsgroep selectie
- `src/components/quotes/QuoteSectionConfig.tsx` - prijsgroep + kleuren
- `src/pages/PriceGroups.tsx` - beheer prijsgroepen/kleuren
- `src/hooks/useProductPrices.ts` - lookup via price_group_id
- `src/hooks/useProductRanges.ts` - collection filter
- Nieuwe hooks: `usePriceGroups.ts`, `usePriceGroupColors.ts`, `useWorktopMaterials.ts`, `usePlinthOptions.ts`
- Supabase types regenereren

### RLS Policies
Alle nieuwe tabellen:
- SELECT: `true` (iedereen mag lezen)
- INSERT/UPDATE/DELETE: `is_admin_or_manager(auth.uid())`

## Aanbevolen Volgorde

Vanwege de omvang stel ik voor om te starten met **Fase 1 + 2**: database schema + offerte workflow. Dit geeft direct werkende functionaliteit. Fase 3 en 4 kunnen daarna als vervolgstappen.
