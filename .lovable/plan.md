
# Plan: Product Import Verbetering - Varianten Herkenning & Mode Detectie

## Probleemanalyse

### Stosa Prijslijst Structuur

Het Stosa-bestand heeft een unieke structuur:

| Kolom | Betekenis | Voorbeeld |
|-------|-----------|-----------|
| `Codice gestionale` | Artikelcode (uniek per variant) | `X0GAA00002` |
| `Codice listino cartaceo` | Basiscode product | `AA00002` |
| `Descrizione` | Productnaam | `PAIR OF CONNECTING DOWELS` |
| `Variabile 1` | Type variabele | `CAM` (kleur accessoires) |
| `Variante 1` | Variantcode | `X0`, `X1`, `BC` |
| `Descrizione 1° variabile - 1°Variante` | Variantnaam | `Bolgheri Natural Oak Tint` |
| `Prezzo Listino` | Prijs per variant | `39.00 €` |

Een product (`AA00002`) komt meerdere keren voor met verschillende varianten (X0, X1, X2), elk met een eigen prijs.

### Huidige Fouten

1. **Verkeerde kolom-detectie**: `Variante 1` wordt gemapped maar `Variabile 1` wordt genegeerd
2. **Siemens false positive**: Standaard prijslijsten worden verkeerd als "prijsgroepen" gedetecteerd
3. **Geen validatie**: Er wordt niet gecontroleerd of de data echt meerdere unieke ranges bevat

---

## Oplossing

### 1. Verbeterde Auto-Detectie met Validatie

De auto-detectie moet controleren of er daadwerkelijk meerdere unieke ranges per product zijn:

```typescript
// Na kolommen detectie, controleer of het echt een prijsgroep bestand is
const detectedMapping = autoDetectMapping(columns);

if (detectedMapping.range_code) {
  // Tel unieke ranges in de eerste 200 rijen
  const rangeValues = new Set<string>();
  const productValues = new Set<string>();
  
  jsonData.slice(0, 200).forEach(row => {
    const rangeVal = row[detectedMapping.range_code]?.toString().trim();
    const productVal = detectedMapping.article_code 
      ? row[detectedMapping.article_code]?.toString().trim() 
      : null;
    
    if (rangeVal && rangeVal !== '-' && rangeVal !== '') {
      rangeValues.add(rangeVal);
    }
    if (productVal) {
      productValues.add(productVal);
    }
  });
  
  // Alleen prijsgroepen modus als:
  // - Meer dan 2 unieke ranges
  // - Minder ranges dan producten (anders is het 1:1 mapping)
  // - Tenminste 3 ranges
  const isPriceGroupFile = rangeValues.size >= 3 && 
                           rangeValues.size < productValues.size * 0.5;
  
  if (isPriceGroupFile) {
    setImportMode('price_groups');
  } else {
    // Reset range kolom - dit is geen prijsgroep bestand
    detectedMapping.range_code = '';
    setImportMode('standard');
  }
}
```

### 2. Strikter Kolom-Patroon Matching

De huidige patronen zijn te breed. Update naar specifiekere patronen:

```typescript
// HUIDIGE CODE (te breed)
const rangeCodePatterns = ['variante 1', 'variante', 'range_code', 'prijsgroep_code', 'variant'];

// NIEUWE CODE (strikter)
const rangeCodePatterns = [
  'variante 1',      // Stosa: exacte kolom
  'range_code',      // Generiek
  'prijsgroep_code', // Nederlands
  'variant code',    // Met spatie
];

// Aparte patroon voor range naam
const rangeNamePatterns = [
  'descrizione 1° variabile',  // Stosa: exacte kolom
  'descrizione variante',
  'range_name',
  'prijsgroep_naam',
  'variant naam',
];
```

### 3. Gebruiker kan Handmatig Kolommen Selecteren

De huidige UI laat al handmatige selectie toe, maar we moeten:
1. Preview tonen van gedetecteerde ranges zodat gebruiker kan zien of detectie klopt
2. Waarschuwing tonen als detectie mogelijk verkeerd is

---

## Technische Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/ProductImport.tsx` | Verbeterde auto-detectie met validatie, striktere patronen |

---

## Gedetailleerde Code Wijzigingen

### ProductImport.tsx - Auto-Detectie Validatie

Na het parsen van het bestand, voeg validatie toe:

```typescript
// In handleFileUpload, na autoDetectMapping:
const detectedMapping = autoDetectMapping(columns);

// Valideer of dit echt een prijsgroepen bestand is
let shouldUsePriceGroups = false;

if (detectedMapping.range_code) {
  const rangeValues = new Set<string>();
  const articleValues = new Set<string>();
  
  jsonData.slice(0, 200).forEach(row => {
    const rangeVal = row[detectedMapping.range_code]?.toString().trim();
    const articleVal = detectedMapping.article_code 
      ? row[detectedMapping.article_code]?.toString().trim() 
      : null;
    
    // Filter lege en speciale waarden
    if (rangeVal && rangeVal !== '-' && rangeVal !== '' && rangeVal !== '€ -') {
      rangeValues.add(rangeVal);
    }
    if (articleVal && articleVal !== '-' && articleVal !== '') {
      articleValues.add(articleVal);
    }
  });
  
  // Prijsgroepen modus alleen als:
  // 1. Er tenminste 3 unieke ranges zijn
  // 2. Het aantal ranges significant minder is dan het aantal artikelen
  //    (anders is elke regel uniek = standaard import)
  // 3. Er minder dan 500 ranges zijn (anders is het geen prijsgroep structuur)
  const hasMultipleRanges = rangeValues.size >= 3;
  const rangesAreReused = rangeValues.size < articleValues.size * 0.3;
  const notTooManyRanges = rangeValues.size < 500;
  
  shouldUsePriceGroups = hasMultipleRanges && rangesAreReused && notTooManyRanges;
  
  if (!shouldUsePriceGroups) {
    // Reset range kolom - dit is geen prijsgroep bestand
    detectedMapping.range_code = '';
    detectedMapping.range_name = '';
  }
}

setColumnMapping(detectedMapping);
setImportMode(shouldUsePriceGroups ? 'price_groups' : 'standard');
```

### ProductImport.tsx - Strikter Kolom Patronen

```typescript
const autoDetectMapping = (columns: string[]): PriceGroupMapping => {
  const mapping: PriceGroupMapping = {
    article_code: '',
    name: '',
    cost_price: '',
    base_price: '',
    range_code: '',
    range_name: '',
    dimension_1: '',
    dimension_2: '',
    dimension_3: '',
  };

  // Artikelcode patronen - specifiek naar generiek
  const articlePatterns = [
    'codice gestionale',    // Stosa
    'codice listino',       // Stosa alternatief
    'artikel',              // NL
    'article_code',
    'artikelcode',
    'artikelnummer',
    'article',
    'codice',
    'code',
    'sku',
    'product_code',
  ];
  
  // Naam patronen
  const namePatterns = [
    'descrizione',          // IT (maar niet variabile)
    'omschrijving',         // NL
    'naam',
    'name',
    'description',
    'product',
    'title',
    'productnaam',
  ];
  
  // Inkoopprijs patronen
  const costPatterns = [
    'netto factuur',        // Siemens exact
    'inkoop',
    'cost',
    'netto',
    'inkoopprijs',
    'cost_price',
    'costo',
  ];
  
  // Verkoopprijs patronen
  const pricePatterns = [
    'prezzo listino',       // Stosa exact
    'adviesprijs',          // Siemens
    'verkoop',
    'advies',
    'price',
    'prijs',
    'base_price',
    'verkoopprijs',
    'prezzo',
    'listino',
  ];
  
  // Prijsgroep code patronen - STRIKTER
  const rangeCodePatterns = [
    'variante 1',           // Stosa exact
    'range_code',
    'prijsgroep_code',
  ];
  
  // Prijsgroep naam patronen
  const rangeNamePatterns = [
    'descrizione 1° variabile',  // Stosa exact
    'descrizione variante',
    'range_name',
    'prijsgroep_naam',
  ];

  // ... rest van detectie logica
  
  columns.forEach(col => {
    const colLower = col.toLowerCase();
    
    // Speciale check: "Descrizione" moet NIET matchen als het "variabile" bevat
    if (!mapping.name && namePatterns.some(p => colLower.includes(p)) 
        && !colLower.includes('variabile') && !colLower.includes('variante')) {
      mapping.name = col;
    }
    
    // ... andere mappings
  });

  return mapping;
};
```

---

## Preview Verbeteringen

Na de wijzigingen toont de import pagina:

**Stap 2 - Import instellingen:**
- Import type selectie met duidelijke uitleg
- Als prijsgroepen gedetecteerd: badge met aantal gevonden ranges
- Waarschuwing als detectie onzeker is

**Stap 3 - Kolommen mappen:**
- Preview van gedetecteerde ranges (eerste 10)
- Mogelijkheid om handmatig te corrigeren
- Duidelijke foutmeldingen als verplichte kolommen missen

---

## Testscenario's

| Bestand | Verwachte Modus | Reden |
|---------|-----------------|-------|
| Siemens prijslijst | `standard` | Geen herbruikbare ranges, elke regel uniek |
| Stosa prijslijst | `price_groups` | ~50 ranges, 69000+ prijzen, ranges hergebruikt |
| Eenvoudige CSV | `standard` | Geen range kolom gedetecteerd |

---

## Resultaat

Na deze wijzigingen:
1. **Siemens** wordt correct als standaard import verwerkt (geen timeout meer)
2. **Stosa** wordt correct als prijsgroepen verwerkt met juiste kolom mapping
3. Gebruiker kan handmatig kolommen selecteren als auto-detectie verkeerd is
4. Duidelijke feedback over wat er gedetecteerd is
