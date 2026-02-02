

# Stosa Prijslijst Import - Uitbreiding Import Systeem

## Wat moet er gebeuren?

De huidige import is ontworpen voor simpele prijslijsten (1 product = 1 prijs). De Stosa prijslijst heeft een complexere structuur waar elk product meerdere prijzen heeft afhankelijk van de prijsgroep.

---

## Huidige Import vs. Stosa Import

| Aspect | Huidige Import | Stosa Prijslijst |
|--------|----------------|------------------|
| Structuur | 1 rij = 1 product | 1 product = meerdere rijen (per prijsgroep) |
| Prijzen | 1 prijs per product | Prijs per prijsgroep |
| Kolommen | Simpele mapping | Complexere mapping met varianten |
| Prijsgroepen | Niet ondersteund | Code + naam uit kolommen |

---

## Oplossing

### Import Modus Selectie

Na stap 2 (Leverancier selectie) komt een nieuwe keuze:

```text
+----------------------------------------------------------+
| Import Type                                               |
|----------------------------------------------------------|
| ( ) Standaard - Eén prijs per product                    |
|     Voor simpele prijslijsten                            |
|                                                          |
| (o) Prijsgroepen - Meerdere prijzen per product          |
|     Voor Stosa en vergelijkbare leveranciers             |
+----------------------------------------------------------+
```

### Uitgebreide Kolom Mapping voor Stosa

```text
+----------------------------------------------------------+
| Kolom Mapping                                             |
|----------------------------------------------------------|
| Artikelcode:        [Codice listino cartaceo    v]       |
| Naam:               [Descrizione                v]       |
| Prijs:              [Prezzo Listino             v]       |
|                                                          |
| -- Prijsgroep Velden --                                  |
| Prijsgroep Code:    [Variante 1                 v]       |
| Prijsgroep Naam:    [Descrizione 1° variabile   v]       |
|                                                          |
| -- Afmetingen (optioneel) --                             |
| Breedte (mm):       [Dimensione 1               v]       |
| Hoogte (mm):        [Dimensione 2               v]       |
| Diepte (mm):        [Dimensione 3               v]       |
+----------------------------------------------------------+
```

---

## Import Logica

### Stap 1: Prijsgroepen Extractie

Uit de data worden unieke prijsgroepen geëxtraheerd:

```text
Variante 1  | Descrizione 1° variabile
------------|--------------------------------
GAB         | Open structure Super Matt
GAC         | Open structure UV Lacquered
GAD         | Open structure Thermo-Struct.
GAG         | Open struct. Matt Lacquered
...         | ...
```

Deze worden automatisch toegevoegd aan `product_ranges`.

### Stap 2: Producten Dedupliceren

```text
Unieke producten op basis van artikelcode:
- AA00002 -> PAIR OF CONNECTING DOWELS (BLUM)
- AP00001 -> CORNER GUARD FOR MATCHBOARDS
- BC00A00 -> "COMBO LINE" 3 HOOK KIT
...
```

### Stap 3: Prijzen per Prijsgroep

Voor elk product-prijsgroep combinatie:

```text
product_prices:
| product_id | range_id | price  |
|------------|----------|--------|
| AA00002    | GAB      | 39.00  |
| BC12P00    | GAB      | 44.00  |
| BC12P00    | GAC      | 124.00 |
| BC12P00    | GAD      | 63.00  |
...
```

---

## Database Wijzigingen

### Geen nieuwe tabellen nodig!

Het bestaande schema ondersteunt dit al:

- `product_ranges` - prijsgroep definities
- `product_prices` - prijzen per product-range combinatie
- `products` - basisproducten met afmetingen

### Nieuwe velden (optioneel)

Producten tabel uitbreiden voor afmetingen:

| Kolom | Type | Doel |
|-------|------|------|
| `dimension_1_mm` | INTEGER | Breedte/lengte |
| `dimension_2_mm` | INTEGER | Hoogte |
| `dimension_3_mm` | INTEGER | Diepte |

---

## Wijzigingen Overzicht

### Nieuwe/Aangepaste Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/ProductImport.tsx` | Import type toggle, extra mapping velden |
| `src/hooks/useProductImport.ts` | Prijsgroep import logica |
| `supabase/functions/import-products/index.ts` | Uitbreiding voor prijsgroepen |
| Database migratie | Afmeting velden op products (optioneel) |

### UI Wijzigingen

**Stap 2.5: Import Type Selectie**
- Radio buttons voor import modus
- Uitleg per modus

**Stap 3: Uitgebreide Mapping**
- Extra velden voor prijsgroep code/naam
- Afmeting velden (optioneel)
- Preview die prijsgroepen toont

**Stap 3.5: Prijsgroepen Preview**
- Lijst van te importeren prijsgroepen
- Optie om te selecteren welke
- Bestaande prijsgroepen markeren

---

## Import Preview Voorbeeld

```text
+----------------------------------------------------------+
| Preview Import                                            |
|----------------------------------------------------------|
| Producten: 8.542 unieke artikelen                        |
| Prijsgroepen: 47 ranges gevonden                         |
| Prijzen: 69.028 product-prijsgroep combinaties           |
|                                                          |
| Top 5 Prijsgroepen:                                      |
| - GAG: Open struct. Matt Lacquered (5.234 prijzen)       |
| - GAD: Open structure Thermo-Struct. (4.891 prijzen)     |
| - GAE: Open struct. Textured Laminate (4.567 prijzen)    |
| - GAC: Open structure UV Lacquered (4.123 prijzen)       |
| - GAB: Open structure Super Matt (3.987 prijzen)         |
+----------------------------------------------------------+
```

---

## Edge Function Uitbreiding

De `import-products` edge function wordt uitgebreid:

```typescript
// Nieuwe request body optie
interface ImportRequest {
  products: ProductRow[];
  supplier_id: string;
  category_id?: string;
  
  // Nieuw: prijsgroep modus
  import_mode: 'standard' | 'price_groups';
  price_group_data?: {
    ranges: { code: string; name: string }[];
    prices: { article_code: string; range_code: string; price: number }[];
  };
}
```

---

## Samenvatting

| Onderdeel | Status |
|-----------|--------|
| Import type toggle UI | Nieuw |
| Prijsgroep kolom mapping | Nieuw |
| Afmeting kolom mapping | Nieuw |
| Prijsgroepen extractie logica | Nieuw |
| product_ranges upsert | Nieuw |
| product_prices bulk insert | Nieuw |
| Preview met prijsgroep statistieken | Nieuw |
| Edge function uitbreiding | Aanpassing |

---

## Verwacht Resultaat

Na import van de Stosa prijslijst:

- **~8.500 producten** in de products tabel
- **~47 prijsgroepen** in product_ranges
- **~69.000 prijzen** in product_prices
- Producten automatisch gekoppeld aan juiste leverancier
- Prijsgroepen direct bruikbaar in offertesecties

