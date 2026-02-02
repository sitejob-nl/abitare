
# Prijsgroepen Systeem - Uitbreiding Offertesysteem

## Samenvatting

Na analyse van de PDF orderbevestiging en de database structuur is duidelijk dat het huidige systeem wel de tabellen heeft voor prijsgroepen (`product_ranges`, `product_prices`, `product_colors`) maar deze nog niet actief gebruikt. In de Abitare werkwijze worden productprijzen bepaald door een **prijsgroep** (bijv. MPTS GL LB = Metropolis Greeploos Laminaat Bronze) die per sectie wordt gekozen.

---

## Wat is het Prijsgroepen Concept?

In de PDF zie je bijvoorbeeld:
- **Frontnummer: MPTS GL LB** - Dit is de prijsgroep/range code
- **Kleur front: Rovere Nodato** - Dit is de kleur binnen die range

De prijs van een kast (bijv. CD60T12) hangt af van welke prijsgroep is geselecteerd:
- CD60T12 in prijsgroep 1 = € 400
- CD60T12 in prijsgroep 5 = € 650
- CD60T12 in prijsgroep 8 = € 890

---

## Database Structuur (Bestaand maar niet gebruikt)

```text
+------------------+       +------------------+       +------------------+
| suppliers        |       | product_ranges   |       | product_colors   |
|------------------|       |------------------|       |------------------|
| id               |<---+  | id               |<---+  | id               |
| code: STOSA      |    |  | code: MPTS GL LB |    |  | code: RN         |
| name: Stosa      |    +--| supplier_id      |    +--| range_id         |
+------------------+       | price_group: 5   |       | name: Rovere     |
                           | name: Metropolis |       | hex_color: #A58  |
                           +------------------+       +------------------+
                                   |
                                   v
+------------------+       +------------------+
| products         |       | product_prices   |
|------------------|       |------------------|
| id               |<------| product_id       |
| article_code     |       | range_id         |--------+
| name             |       | price            |
| base_price (std) |       | valid_from       |
+------------------+       +------------------+
```

---

## Wat wordt er gebouwd?

### 1. Prijsgroepen Beheer Pagina
Een nieuwe pagina `/settings/price-groups` voor:
- Bekijken en beheren van ranges per leverancier
- Toevoegen van nieuwe prijsgroepen
- Koppelen van kleuren aan prijsgroepen

### 2. Prijslijst per Prijsgroep
Uitbreiding van de product import om prijzen per prijsgroep te importeren:
- Stosa heeft ~10 prijsgroepen (1-10)
- Elk product krijgt meerdere prijzen (1 per prijsgroep)

### 3. Sectie Range/Kleur Selectie
In de sectie configuratie (nu al via `range_id` en `color_id`):
- Dropdown om prijsgroep te kiezen
- Dropdown om kleur te kiezen (gefilterd op range)
- Prijs van producten wordt automatisch aangepast

### 4. Automatische Prijsberekening
Wanneer een product wordt toegevoegd aan een sectie:
1. Check of de sectie een `range_id` heeft
2. Zoek de prijs in `product_prices` voor die combinatie
3. Gebruik die prijs in plaats van `base_price`

---

## Wijzigingen Overzicht

### Database (Migraties)

| Tabel | Wijziging |
|-------|-----------|
| `product_ranges` | Seed data toevoegen voor Stosa prijsgroepen |
| `product_colors` | Seed data voor kleuren per range |
| `product_prices` | Prijzen per product-range combinatie |

**Seed Data Voorbeeld:**
```sql
-- Stosa prijsgroepen
INSERT INTO product_ranges (code, name, price_group, supplier_id) VALUES
('MPTS-1', 'Metropolis Prijsgroep 1', 1, 'stosa-id'),
('MPTS-2', 'Metropolis Prijsgroep 2', 2, 'stosa-id'),
...
('MPTS-10', 'Metropolis Prijsgroep 10', 10, 'stosa-id');

-- Kleuren voor Metropolis
INSERT INTO product_colors (code, name, range_id) VALUES
('RN', 'Rovere Nodato', 'mpts-range-id'),
('BRONZE', 'Bronze', 'mpts-range-id');
```

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/pages/PriceGroups.tsx` | Beheer prijsgroepen |
| `src/hooks/useProductRanges.ts` | Hook voor ranges ophalen |
| `src/hooks/useProductColors.ts` | Hook voor kleuren ophalen |
| `src/hooks/useProductPrices.ts` | Hook voor prijzen per range |
| `src/components/quotes/RangeSelector.tsx` | Dropdown component |

### Bestaande Bestanden Aanpassen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/quotes/QuoteSectionConfig.tsx` | Range/kleur dropdowns toevoegen |
| `src/components/quotes/AddProductDialog.tsx` | Prijs ophalen uit product_prices |
| `src/hooks/useQuoteLines.ts` | Rekening houden met range prijs |
| `src/pages/ProductImport.tsx` | Optie om prijzen per prijsgroep te importeren |
| `src/App.tsx` | Route `/settings/price-groups` toevoegen |

---

## UI Flow

### Sectie Configuratie (Uitgebreid)

```text
+----------------------------------------------------------+
| MEUBELEN                                         [Opslaan]|
|----------------------------------------------------------|
| Leverancier: [Stosa Cucine              v]               |
|                                                          |
| Prijsgroep:  [MPTS GL LB - Metropolis   v]               |
| Kleur front: [Rovere Nodato             v]               |
|                                                          |
| Plintkleur:  [Bronze                    v]               |
| Corpuskleur: [Rose                      v]               |
|                                                          |
| ... (rest van configuratie)                              |
+----------------------------------------------------------+
```

### Product Toevoegen met Prijsgroep

Wanneer een product wordt toegevoegd:

```text
1. Gebruiker selecteert product: CD60T12 (Hoge voorraadkast)
2. Systeem checkt sectie range_id
3. Systeem zoekt in product_prices:
   - product_id = CD60T12
   - range_id = MPTS-prijsgroep-5
4. Gevonden prijs: € 892,00
5. Prijs wordt ingevuld in formulier
```

---

## Product Import Uitbreiding

Het import systeem krijgt een extra optie voor prijsgroep-import:

```text
+----------------------------------------------------------+
| Product Import                                            |
|----------------------------------------------------------|
| Import Type:                                              |
| ( ) Standaard producten met basisprijs                   |
| (o) Producten met prijsgroep-specifieke prijzen          |
|                                                          |
| Leverancier: [Stosa Cucine              v]               |
| Prijsgroep:  [Prijsgroep 5              v]               |
|                                                          |
| Kolom Mapping:                                            |
| Artikel     -> article_code                              |
| Omschrijving-> name                                      |
| Prijs       -> price (voor deze prijsgroep)              |
+----------------------------------------------------------+
```

---

## Technische Implementatie

### 1. Hook: useProductPrice

```typescript
// Ophalen van de juiste prijs voor een product in een bepaalde range
function useProductPrice(productId: string, rangeId: string | null) {
  return useQuery({
    queryKey: ["product-price", productId, rangeId],
    queryFn: async () => {
      if (!rangeId) {
        // Fallback naar base_price
        const { data } = await supabase
          .from("products")
          .select("base_price")
          .eq("id", productId)
          .single();
        return data?.base_price;
      }
      
      // Zoek prijs in product_prices
      const { data } = await supabase
        .from("product_prices")
        .select("price")
        .eq("product_id", productId)
        .eq("range_id", rangeId)
        .single();
        
      return data?.price;
    },
  });
}
```

### 2. Sectie met Range

De `quote_sections` tabel heeft al `range_id` en `color_id`. Deze worden nu actief gebruikt:

```typescript
// In QuoteSectionConfig.tsx
const handleRangeChange = async (rangeId: string) => {
  await updateSection.mutateAsync({
    id: section.id,
    range_id: rangeId,
    color_id: null, // Reset kleur bij range wijziging
  });
};
```

### 3. Automatische Prijs Update

Bij wijziging van de range van een sectie, worden alle producten in die sectie herberekend.

---

## Samenvatting Taken

| Onderdeel | Status |
|-----------|--------|
| Hooks voor ranges/colors/prices | Nieuw |
| Prijsgroepen beheer pagina | Nieuw |
| Range selector in sectie config | Uitbreiding |
| Prijs lookup bij product toevoegen | Uitbreiding |
| Import met prijsgroep ondersteuning | Uitbreiding |
| Seed data voor Stosa ranges | Migratie |
| Herberekening bij range wijziging | Nieuw |

---

## Fasering

**Fase 1: Basis Infrastructuur**
- Hooks voor product_ranges, product_colors, product_prices
- Prijsgroepen beheer pagina (view only eerst)
- Range/color selectie in sectie configuratie

**Fase 2: Prijsberekening**
- Prijs lookup bij product toevoegen
- Automatische herberekening bij range wijziging

**Fase 3: Import Uitbreiding**
- Prijzen per prijsgroep importeren
- Seed data voor Stosa prijsgroepen en kleuren
