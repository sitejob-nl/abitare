

# Offerte Layout Aanpassen naar Abitare Format

## Wat is het verschil?

Na analyse van jullie huidige orderbevestiging (PDF) en de huidige implementatie zijn er belangrijke verschillen gevonden die moeten worden aangepast.

---

## Huidige Situatie vs. Gewenste Situatie

| Aspect | Huidige Implementatie | PDF Voorbeeld |
|--------|----------------------|---------------|
| **Header** | Simpele header met status dropdown | Volledige briefhoofd met bedrijfsinfo, klantadres, referentie |
| **Configuratie sectie** | Niet aanwezig | Per sectie: frontnummer, kleur, plint, corpus, scharnier, etc. |
| **Tabel kolommen** | Artikel, Omschrijving, Aantal, Eenheid, Prijs, %, Totaal | no, code, omschrijving, hg, br, aantal, bedrag |
| **Subregels** | Niet ondersteund | Regels met "." prefix voor accessoires (bv `.1 PUSHPULL-C`) |
| **Groepkoppen** | `is_group_header` veld bestaat | "Eiland bestaande uit:", "Diversen bestaande uit:" |
| **Afmetingen** | Niet zichtbaar | Hoogte (hg) en Breedte (br) per product |
| **Secties** | Generieke types | Specifiek: Meubelen, Apparatuur/Accessoires, Werkblad(en), Montage |
| **Totalen** | Simpele card onderaan | "Totaal te betalen (inclusief montage): € 44.195,00" |
| **Betalingsvoorwaarden** | Niet aanwezig | "25% aanbetaling, 75% voor levering" |

---

## Wat wordt er aangepast?

### 1. Nieuwe Sectie Configuratie Header
Elke sectie (vooral "Meubelen") krijgt een configuratieblok:

```text
+----------------------------------------------------------+
| MEUBELEN                                                  |
|----------------------------------------------------------|
| Stosa Evolution Metropolis greeploos front met kunststof  |
| toplaag rondom afgewerkt met ABS                         |
|                                                          |
| Frontnummer: MPTS GL LB    | Kleur front: Rovere Nodato  |
| Plintkleur: Bronze         | Corpuskleur: Rose          |
| Kolomkast hoogte: 2400 mm  | Scharnier kleur: Peltro    |
| Greepnummer: Greeploos     | Lade kleur: Titanium       |
| Aanrecht hoogte: 970 mm    | Blad dikte: 60 mm          |
+----------------------------------------------------------+
```

### 2. Aangepaste Tabel met Afmetingen

```text
| no | code       | omschrijving                    | hg  | br  | aantal | bedrag |
|----|------------|--------------------------------|-----|-----|--------|--------|
| 1  | CB00T00    | Hoog passtuk                   | 234 | 10  | 1.32   | € 150  |
|    |            | Passtuk hoge kast 132 x 2340mm |     |     |        |        |
| 2  | CD60T12 L  | Hoge voorraadkast              | 234 | 60  | 1      | € 890  |
| 3  | CH60T00 L  | Hoge kast t.b.v. inbouwapp.    | 234 | 60  | 1      | € 750  |
```

### 3. Sub-regels Ondersteuning
Regels die beginnen met een punt zijn accessoires bij het vorige product:

```text
| 6  | BE10H00-81 | Onderkast met 2 uittrekladen   | 81  | 100 | 1      | € 420  |
|    |            | 1050mm                         |     |     |        |        |
| .1 | PUSHPULL-C | Meerprijs systeem open/sluit   |     |     | 1      | € 45   |
| .2 | PUSH50     | Ladegeleidingsrail             |     |     | 1      | € 35   |
```

### 4. Groepskoppen (Gele Headers)
Voor logische groepering van producten:

```text
|    |            | Eiland bestaande uit:          |     |     |        |        |
| 18 | BE10H00-81 | Onderkast met 2 uittrekladen   | 81  | 100 | 1      | € 420  |
| 19 | BE10H00-81 | Onderkast met 2 uittrekladen   | 81  | 100 | 1      | € 420  |
```

### 5. Werkblad Sectie met Specificaties

```text
+----------------------------------------------------------+
| WERKBLAD(EN)                                             |
|----------------------------------------------------------|
| Uitvoering: Keramiek 12 mm dikte met facet randafwerking |
| Randafwerking: 1P                                        |
| Kleur: QUARZO GOLD ARTON BM                              |
+----------------------------------------------------------+
| no | code | omschrijving                     | aantal    |
| 2  | 9999 | Werkblad kastenwand 2000 x 616mm | 1.32 m²   |
| 3  | 9999 | Opdikking korte zijde 50 x 60mm  | 0.03 m²   |
```

---

## Database Wijzigingen

### Nieuwe kolommen voor `quote_sections`:

| Kolom | Type | Doel |
|-------|------|------|
| `front_number` | VARCHAR(50) | "MPTS GL LB" |
| `front_color` | VARCHAR(100) | "Rovere Nodato" |
| `plinth_color` | VARCHAR(100) | "Bronze" |
| `corpus_color` | VARCHAR(100) | "Rose" |
| `hinge_color` | VARCHAR(100) | "Peltro" |
| `drawer_color` | VARCHAR(100) | "Titanium" |
| `column_height_mm` | INTEGER | 2400 |
| `countertop_height_mm` | INTEGER | 970 |
| `countertop_thickness_mm` | INTEGER | 60 |
| `workbench_material` | VARCHAR(255) | "Keramiek 12 mm dikte" |
| `workbench_edge` | VARCHAR(50) | "1P" |
| `workbench_color` | VARCHAR(255) | "QUARZO GOLD ARTON" |
| `configuration` | JSONB | Overige configuratie |

### Nieuwe kolommen voor `quote_lines`:

| Kolom | Type | Doel |
|-------|------|------|
| `height_mm` | INTEGER | Hoogte in mm (hg) |
| `width_mm` | INTEGER | Breedte in mm (br) |
| `parent_line_id` | UUID | Verwijzing naar hoofdregel voor subregels |
| `sub_line_number` | VARCHAR(10) | ".1", ".2" voor subregels |
| `extra_description` | TEXT | Tweede regel omschrijving |

---

## Nieuwe/Aangepaste Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/quotes/QuoteSectionCard.tsx` | Configuratieheader toevoegen |
| `src/components/quotes/QuoteLineRow.tsx` | Afmetingskolommen, subregels styling |
| `src/components/quotes/QuoteSectionConfig.tsx` | **NIEUW** - Configuratie formulier |
| `src/components/quotes/AddProductDialog.tsx` | Afmetingen en subregels velden |
| `src/components/quotes/QuoteTotals.tsx` | Aanpassen naar PDF format |
| `src/pages/QuoteDetail.tsx` | Betalingsvoorwaarden sectie |
| `src/hooks/useQuoteSections.ts` | Nieuwe velden ondersteunen |
| `src/hooks/useQuoteLines.ts` | Nieuwe velden ondersteunen |
| Database migratie | Nieuwe kolommen toevoegen |

---

## Nieuwe Componenten

### QuoteSectionConfig (Configuratie bewerken)

Een modal/expandable sectie waar je de configuratie van een sectie kunt invullen:
- Frontnummer en kleur
- Plint en corpuskleur
- Scharnier en lade kleur
- Kastmaten
- Werkblad specificaties (voor werkbladen sectie)

### QuoteSubLineRow

Specifieke styling voor subregels:
- Inspringen met `.1`, `.2` nummering
- Kleinere tekst
- Geen afmetingskolommen tonen

---

## Visuele Veranderingen

### Sectie Header Voorbeeld

```text
┌─────────────────────────────────────────────────────────────────┐
│ ≡ MEUBELEN - Keuken Kastenwand                    [⚙] [✎] [🗑] │
├─────────────────────────────────────────────────────────────────┤
│ Stosa Evolution Metropolis greeploos front met kunststof       │
│ toplaag rondom afgewerkt met ABS                               │
│                                                                 │
│ Frontnummer: MPTS GL LB      │ Kleur front: Rovere Nodato      │
│ Plintkleur: Bronze           │ Corpuskleur: Rose               │
│ Kolomkast hoogte: 2400 mm    │ Scharnier kleur: Peltro         │
│ Greepnummer: Greeploos       │ Lade kleur: Titanium            │
├─────────────────────────────────────────────────────────────────┤
│ no │ code       │ omschrijving           │ hg  │ br  │ # │ €   │
│────│────────────│────────────────────────│─────│─────│───│─────│
│ 1  │ CB00T00    │ Hoog passtuk           │ 234 │ 10  │1.3│€150 │
│    │            │ Passtuk 132 x 2340mm   │     │     │   │     │
├─────────────────────────────────────────────────────────────────┤
│ [+ Product toevoegen]                    Sectie totaal: € 8.500 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Samenvatting

| Onderdeel | Status |
|-----------|--------|
| Sectie configuratie velden (database) | Nieuw - migratie nodig |
| Quote lines afmetingen (database) | Nieuw - migratie nodig |
| Subregels ondersteuning | Nieuw |
| Configuratie header per sectie | Nieuw component |
| Tabel met hg/br kolommen | Aanpassing |
| Groepkoppen styling | Aanpassing |
| Tweede regel omschrijving | Nieuw |
| Werkblad specificaties | Nieuw component |

