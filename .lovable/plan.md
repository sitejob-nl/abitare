
# Plan: Prijzen Import Fix - Valutasymbolen Verwijderen

## Probleem

De Siemens prijslijst bevat prijzen met Euro-symbolen en speciale formaten:
- `€ 1,559.45` - normale prijs met € teken
- `€ -` - geen prijs beschikbaar
- US-format met komma's als duizendtallen separator

De huidige `parsePrice` functie verwijdert geen valutasymbolen, waardoor `parseFloat("€ 1,559.45")` `NaN` oplevert.

## Oplossing

De `parsePrice` functie in `src/hooks/useProductImport.ts` uitbreiden met:

1. **Valutasymbolen verwijderen** (`€`, `$`, `£`, `¥`)
2. **Speciale waarden herkennen** (`-` betekent geen prijs)
3. **Auto-detectie verbeteren** voor mixed formats

## Technische Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useProductImport.ts` | `parsePrice` functie verbeteren |

## Nieuwe parsePrice Functie

```typescript
export function parsePrice(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  
  let str = String(value).trim();
  
  // Verwijder valutasymbolen (€, $, £, ¥) en spaties
  str = str.replace(/[€$£¥\s]/g, '');
  
  // Check voor speciale waarden (bijv. "-" betekent geen prijs)
  if (str === '-' || str === '' || str === '--') return undefined;
  
  // Auto-detect format
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  // Bepaal of komma of punt de decimaal separator is
  const isCommaDecimal = lastComma > lastDot;
  
  if (isCommaDecimal) {
    // Europees format: 1.275,00 → 1275.00
    str = str.replace(/\./g, '');   // Verwijder duizendtallen
    str = str.replace(',', '.');    // Komma → decimaal
  } else {
    // US format: 1,275.00 → 1275.00
    str = str.replace(/,/g, '');    // Verwijder duizendtallen
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? undefined : parsed;
}
```

## Test Cases

| Input | Verwachte Output |
|-------|------------------|
| `€ 1,559.45` | `1559.45` |
| `€ 1,275.00` | `1275.00` |
| `€ -` | `undefined` |
| `€ 2,719.00` | `2719.00` |
| `1.275,00` | `1275.00` |
| `1275` | `1275` |
| `1275.50` | `1275.50` |

## Resultaat

Na deze wijziging zal de import:
- Siemens prijslijsten correct herkennen
- Euro-symbolen automatisch verwijderen
- `€ -` waarden negeren (geen prijs)
- Zowel US als Europees nummerformaat ondersteunen
