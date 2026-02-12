

# Stosa Volledige Import: Edge Function v2-2 + LOOK/FRAME/Classic Glamour

## Overzicht
Dit plan brengt de Edge Function up-to-date met de complete variant mapping en voegt de ontbrekende collecties (LOOK, Classic Glamour, FRAME) toe aan de database, zodat alle JSON import-bestanden correct verwerkt kunnen worden.

---

## Stap 1: Edge Function updaten naar v2-2

De huidige `import-products/index.ts` heeft een onvolledige en deels foutieve variant mapping. De v2-2 versie bevat:

- **169 variant codes** (huidig: ~13)
- Correcte LOOK mapping: 401 -> L1, 402 -> L2, ... 412 -> L12 (was foutief E1-E10)
- Classic Glamour: 461 -> CG1, ... 467 -> CG7 + glasvarianten
- ART: A01 -> ART1, ... A05 -> ART5
- FRAME: 334/335 -> FRAME
- Alle combo-codes (8xx Evolution, 5xx LOOK, A5x ART)
- Verbeterde `getCollectionForVariant()` en `getCollectionForPriceGroup()` met regex-detectie

## Stap 2: Ontbrekende price_groups seeden

Nieuwe prijsgroepen toevoegen voor:

**LOOK collectie (14 groepen)**:
- L1 t/m L12 (solid door)
- LA, LB, LC (glass door)
- LDECOR, LNATURAL, LRIBBED, LSLIM (special glass)

**Classic Glamour collectie (7 groepen)**:
- CG1 t/m CG7

**FRAME collectie (1 groep)**:
- FRAME

**Overige**:
- NATURAL, RIBBED, SLIM (Evolution special glass -- ontbreken mogelijk)
- EQ (special/equipment)

## Stap 3: JSON importbestanden klaarzetten

De geüploade JSON bestanden (LOOK 001-007 + FRAME 001) zijn kant-en-klaar voor de Edge Function. Ze bevatten:
- `supplier_id: "STOSA_SUPPLIER_UUID"` -- dit moet vervangen worden door de werkelijke Stosa supplier UUID
- `import_mode: "price_groups"`
- Producten met article_code, catalog_code, afmetingen, discount_group
- Ranges met variant codes
- Prijzen per product per variant

Na deployment van de Edge Function kunnen deze bestanden direct verstuurd worden via de ProductImport pagina of via curl.

## Stap 4: Import-pagina uitbreiden (optioneel)

Een "Bulk JSON Import" functie toevoegen aan de ProductImport pagina zodat de gebruiker:
1. Meerdere JSON bestanden kan selecteren
2. Ze sequentieel (met pauze) naar de Edge Function stuurt
3. Voortgang ziet per chunk

---

## Technische details

### Edge Function wijzigingen
Het bestand `supabase/functions/import-products/index.ts` wordt volledig vervangen door de v2-2 versie. Belangrijkste verbeteringen:

| Onderdeel | Huidig | v2-2 |
|---|---|---|
| Variant mapping | 13 codes (alleen Evolution) | 169 codes (alle collecties) |
| LOOK mapping | 401-410 -> E1-E10 (FOUT) | 401-412 -> L1-L12 (correct) |
| Collection detectie | Hardcoded lijst | Regex-based + fallback |
| Classic Glamour | Niet ondersteund | CG1-CG7 + glasvarianten |
| FRAME | Niet ondersteund | 334/335 -> FRAME |
| Combo's | Niet ondersteund | 80+ combo codes |

### Database migratie (seed data)

```text
INSERT INTO price_groups (supplier_id, code, name, collection, sort_order)
VALUES
  -- LOOK L1-L12
  (stosa_id, 'L1', 'Look Prijsgroep 1', 'look', 1),
  ... (L2-L12)
  (stosa_id, 'LA', 'Look Glas A', 'look', 13),
  (stosa_id, 'LB', 'Look Glas B', 'look', 14),
  (stosa_id, 'LC', 'Look Glas C', 'look', 15),
  -- CLASSIC GLAMOUR CG1-CG7
  (stosa_id, 'CG1', 'Classic Glamour 1', 'classic_glamour', 1),
  ... (CG2-CG7)
  -- FRAME
  (stosa_id, 'FRAME', 'Frame', 'frame', 1),
  -- Evolution special glass
  (stosa_id, 'NATURAL', 'Natural Glass', 'evolution', 14),
  (stosa_id, 'RIBBED', 'Ribbed Glass', 'evolution', 15),
  (stosa_id, 'SLIM', 'Slim Glass', 'evolution', 16);
```

### Bestanden die worden gewijzigd/aangemaakt

| Bestand | Actie |
|---|---|
| `supabase/functions/import-products/index.ts` | Vervangen door v2-2 (complete variant mapping) |
| `supabase/migrations/..._stosa_look_cg_frame.sql` | Nieuw: seed LOOK/CG/FRAME price_groups |
| `src/components/quotes/AddSectionDialog.tsx` | Kleine fix: collectie-dropdown uitbreiden met 'look', 'classic_glamour', 'frame' opties |

### Uitvoervolgorde
1. Database migratie draaien (LOOK/CG/FRAME prijsgroepen)
2. Edge Function deployen (v2-2)
3. AddSectionDialog collectie-opties uitbreiden
4. JSON import bestanden versturen (handmatig of via UI) met correcte supplier UUID
5. Resterende LOOK chunks (008-010) later importeren wanneer beschikbaar

