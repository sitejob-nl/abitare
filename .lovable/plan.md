
# Plan: Variabele Type Kolom Toevoegen aan Product Import

## Probleem

De Stosa prijslijst heeft drie variabele-gerelateerde kolommen:

| Kolom | Betekenis | Voorbeeld |
|-------|-----------|-----------|
| `Variabile 1` | **Type** variabele | `CAM` (kleur accessoires) |
| `Variante 1` | **Code** variant | `X0`, `X1`, `BC` |
| `Descrizione 1° variabile` | **Naam** variant | `Bolgheri Natural Oak` |

De huidige import herkent `Variante 1` (code) en `Descrizione` (naam), maar **mist het type variabele** (`Variabile 1`). Dit type geeft aan waar de variant over gaat: kleur, maat, materiaal, etc.

## Oplossing

1. **Nieuw veld toevoegen**: `range_type` voor het type variabele
2. **Auto-detectie uitbreiden** met patronen voor `variabile 1`
3. **UI aanpassen** met extra dropdown in de prijsgroepen mapping
4. **Backend aanpassen** om het type mee te sturen naar de import functie

## Technische Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/ProductImport.tsx` | `range_type` veld toevoegen aan interface, auto-detectie, en UI |
| `supabase/functions/import-products/index.ts` | Type variabele verwerken bij range creatie |
| Database | Optioneel: `product_ranges.type` kolom toevoegen |

## Gedetailleerde Implementatie

### 1. PriceGroupMapping Interface Uitbreiden

```typescript
interface PriceGroupMapping extends ColumnMapping {
  range_code: string;
  range_name: string;
  range_type: string;  // NIEUW: type variabele (bijv. "CAM")
  dimension_1: string;
  dimension_2: string;
  dimension_3: string;
}
```

### 2. Auto-Detectie Patroon Toevoegen

```typescript
// Type variabele patronen
const rangeTypePatterns = [
  'variabile 1',        // Stosa exact
  'variable type',
  'variant type',
  'type variabele',
];

// In de mapping loop:
if (!mapping.range_type && rangeTypePatterns.some(p => colLower.includes(p))) {
  mapping.range_type = col;
}
```

### 3. UI Aanpassen - Extra Dropdown

In de "Prijsgroep velden" sectie komt een derde dropdown:

```typescript
{[
  { key: 'range_code', label: 'Prijsgroep code *' },
  { key: 'range_name', label: 'Prijsgroep naam' },
  { key: 'range_type', label: 'Type variabele' },  // NIEUW
].map(({ key, label }) => (
  // ... dropdown component
))}
```

### 4. Extracted Price Groups Uitbreiden

De `extractedPriceGroups` memo wordt aangepast om ook het type mee te nemen:

```typescript
const extractedPriceGroups = useMemo(() => {
  const rangeMap = new Map<string, { 
    code: string; 
    name: string; 
    type: string;  // NIEUW
    count: number 
  }>();
  
  fileData.forEach(row => {
    const code = row[columnMapping.range_code]?.toString().trim();
    const name = columnMapping.range_name ? row[columnMapping.range_name]?.toString().trim() : code;
    const type = columnMapping.range_type ? row[columnMapping.range_type]?.toString().trim() : '';
    
    if (code && !rangeMap.has(code)) {
      rangeMap.set(code, { code, name: name || code, type, count: 1 });
    } else if (code) {
      rangeMap.get(code)!.count++;
    }
  });
  
  return Array.from(rangeMap.values());
}, [fileData, columnMapping.range_code, columnMapping.range_name, columnMapping.range_type, importMode]);
```

### 5. Preview Verbeteren

In stap 3 tonen we een preview van de gedetecteerde ranges inclusief type:

```typescript
{extractedPriceGroups.length > 0 && (
  <div className="mt-4">
    <h4 className="font-medium mb-2">Gedetecteerde prijsgroepen ({extractedPriceGroups.length})</h4>
    <div className="flex flex-wrap gap-2">
      {extractedPriceGroups.slice(0, 10).map(range => (
        <Badge key={range.code} variant="secondary">
          {range.type && <span className="opacity-60 mr-1">{range.type}:</span>}
          {range.code} 
          <span className="opacity-60 ml-1">({range.count}x)</span>
        </Badge>
      ))}
      {extractedPriceGroups.length > 10 && (
        <Badge variant="outline">+{extractedPriceGroups.length - 10} meer</Badge>
      )}
    </div>
  </div>
)}
```

## Database Wijziging (Optioneel)

Als je het type wilt opslaan in de database, is een migratie nodig:

```sql
ALTER TABLE product_ranges ADD COLUMN IF NOT EXISTS type text;
```

De Edge Function moet dan ook aangepast worden om dit veld te verwerken.

## Resultaat

Na deze wijzigingen:
1. De import herkent automatisch `Variabile 1` als type variabele
2. Gebruiker kan handmatig de type-kolom selecteren als auto-detectie faalt
3. Preview toont type + code per prijsgroep (bijv. "CAM: X0")
4. Het type wordt opgeslagen bij de prijsgroep (optioneel)

## Voorbeeld: Stosa Import Preview

Na upload van de Stosa lijst:

| Type | Code | Naam | Aantal |
|------|------|------|--------|
| CAM | X0 | Bolgheri Natural Oak Tint | 1.250 |
| CAM | X1 | Charcoal Grey | 980 |
| CAM | BC | Bianco Carrara | 1.100 |
