

# STOSA Sectie-Wizard implementeren

## Overzicht

De huidige `AddSectionDialog` werkt al goed met leveranciers, prijsgroepen en kleuren, maar mist de STOSA-specifieke model/lijn selectie en de stapsgewijze wizard-ervaring. De referentiebestanden beschrijven een 5-staps wizard (type, leverancier, model, prijsgroep, configuratie) met bijbehorende database tabellen.

## Wat er al werkt

- `quote_sections` heeft al: `price_group_id`, `front_color`, `corpus_color`, `plinth_color`, `hinge_color`, `handle_number`, `column_height_mm`, `configuration` (JSONB)
- `AddSectionDialog` ondersteunt al leverancier/collectie/prijsgroep/kleurselectie
- `SortableSectionCard` leidt al `sectionSupplierId` af uit price_group
- `fetchProductPrice()` zoekt al op `price_group_id`

## Stap 1: Database migratie

Drie nieuwe kolommen toevoegen aan `quote_sections`:
- `supplier_id UUID REFERENCES suppliers(id)` -- directe leverancier link
- `model_code VARCHAR(50)` -- STOSA model code (bijv. "evolution_metropolis")
- `model_name VARCHAR(100)` -- Model naam voor weergave

Drie nieuwe tabellen aanmaken:
- `stosa_models` -- Beschikbare modellen/lijnen (code, name, description, sort_order)
- `stosa_front_types` -- Front types per model (model_code, code, name, price_groups array)
- `stosa_colors` -- Kleuren voor front/corpus/greep/plint (code, name, color_type, hex_color)

Seed data voor de modellen (10 STOSA modellen), front types, en basis kleuren.

Indexen op `quote_sections.supplier_id`, `quote_sections.model_code`.

RLS policies: select open voor iedereen, insert/update/delete voor admin_or_manager.

## Stap 2: Types bestand aanmaken

Nieuw bestand `src/types/quote-sections.ts` met:
- `SectionType` union type
- `StosaConfig` interface (front_code, front_name, front_color, corpus_color, handle_type, handle_code, handle_color, plinth_type, plinth_color, plinth_height, worktop_height, worktop_thickness)
- `StosaModel`, `StosaFrontType`, `StosaColor` interfaces
- `SectionWizardStep` type
- Constanten: `HANDLE_TYPES`, `PLINTH_TYPES`, `PLINTH_HEIGHTS`, `WORKTOP_THICKNESSES`

## Stap 3: useStosaData hook aanmaken

Nieuw bestand `src/hooks/useStosaData.ts` met:
- `useStosaModels()` -- alle actieve modellen ophalen
- `useStosaModel(modelCode)` -- enkel model met front_types
- `useStosaFrontTypes(modelCode)` -- front types voor een model
- `useStosaColors(colorType?)` -- kleuren gefilterd op type
- `isStosaSupplier(supplierCode)` -- helper functie
- `getPriceGroupDisplay(priceGroup)` -- weergave helper

Alle queries met `staleTime: 30 minuten` (statische referentiedata).

NB: De `useSuppliers` en `usePriceGroups` hooks bestaan al in het project, de wizard hergebruikt die.

## Stap 4: Wizard componenten aanmaken

Vijf nieuwe bestanden in `src/components/quotes/section-wizard/`:

### SectionTypeSelector.tsx
Visuele kaarten (grid) voor het kiezen van het sectietype. Elke kaart heeft een icoon, label en korte beschrijving. Iconen uit Lucide: LayoutGrid, Refrigerator, Square, Droplet, Package.

### SupplierSelector.tsx
Leverancier-selectie met zoekfunctie. Filtert leveranciers op basis van het gekozen sectietype (bijv. bij "keukenmeubelen" alleen keukenleveranciers tonen). Toont "aanbevolen" leveranciers bovenaan.

### StosaModelSelector.tsx
Grid van STOSA modellen met naam en beschrijving. Alleen zichtbaar als de gekozen leverancier STOSA is. Data uit `useStosaModels()`.

### PriceGroupSelector.tsx (wizard versie)
Visuele buttons voor prijsgroepen 1-10 en A-C (glas). Scheidt standaard deuren en glasdeuren. Data uit bestaande `usePriceGroups()`.

### StosaConfigPanel.tsx
Configuratiepaneel met secties voor:
- Front (frontnummer dropdown uit `stosa_front_types`, kleur uit `stosa_colors`)
- Corpus (kleur dropdown)
- Greep (type select + kleur, conditioneel verborgen bij "greeploos")
- Plint (type + kleur + hoogte)
- Werkblad (hoogte + dikte, optioneel)

Alle velden gebruiken `Select` dropdowns wanneer referentiedata beschikbaar is, anders `Input` als fallback.

## Stap 5: AddSectionDialog aanpassen

De huidige `AddSectionDialog` wordt vervangen door een wizard-variant die:

1. De 5 stappen sequentieel doorloopt met "Volgende" / "Vorige" navigatie
2. De wizard-stappen conditioneel toont:
   - Type: altijd
   - Leverancier: altijd
   - Model: alleen bij STOSA-leverancier
   - Prijsgroep: alleen bij leverancier met `has_price_groups`
   - Config: alleen bij STOSA-leverancier
3. Bij niet-STOSA leveranciers springt de wizard van leverancier direct naar bevestiging
4. Bij submit: slaat `supplier_id`, `model_code`, `model_name` en uitgebreide `config` JSONB op
5. Genereert automatisch een titel uit de configuratie

De bestaande velden (range_id, front_color, corpus_color, etc.) blijven behouden voor backward compatibiliteit. De wizard vult ook de nieuwe velden.

## Stap 6: SortableSectionCard bijwerken

- `sectionSupplierId` ook afleiden uit `section.supplier_id` (directe link, voorrang boven range/price_group afleidingen)
- Model info tonen in de sectie-header als badge

## Supabase types regenereren

Na de migratie moeten de Supabase types geregenereerd worden zodat `supplier_id`, `model_code`, `model_name` en de nieuwe tabellen in de TypeScript types beschikbaar zijn.

## Samenvatting wijzigingen

| Bestand | Actie |
|---------|-------|
| Database migratie | 3 kolommen + 3 tabellen + seed data + RLS |
| `src/types/quote-sections.ts` | Nieuw -- types en constanten |
| `src/hooks/useStosaData.ts` | Nieuw -- data hooks voor STOSA referentiedata |
| `src/components/quotes/section-wizard/SectionTypeSelector.tsx` | Nieuw -- stap 1 |
| `src/components/quotes/section-wizard/SupplierSelector.tsx` | Nieuw -- stap 2 |
| `src/components/quotes/section-wizard/StosaModelSelector.tsx` | Nieuw -- stap 3 |
| `src/components/quotes/section-wizard/PriceGroupSelector.tsx` | Nieuw -- stap 4 |
| `src/components/quotes/section-wizard/StosaConfigPanel.tsx` | Nieuw -- stap 5 |
| `src/components/quotes/AddSectionDialog.tsx` | Herschrijven naar wizard-flow |
| `src/components/quotes/SortableSectionCard.tsx` | Kleine update -- supplier_id direct gebruiken |
| `src/integrations/supabase/types.ts` | Regenereren na migratie |

