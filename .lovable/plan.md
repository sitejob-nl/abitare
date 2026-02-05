
# Plan: STOSA Volledige Ondersteuning - Fase 2

## Overzicht

Dit plan breidt het bestaande import systeem uit met ontbrekende features voor volledige STOSA ondersteuning.

## Database Wijzigingen

### 1. Product Ranges Uitbreiden

```sql
ALTER TABLE product_ranges ADD COLUMN IF NOT EXISTS 
  is_handleless BOOLEAN DEFAULT false;

ALTER TABLE product_ranges ADD COLUMN IF NOT EXISTS 
  door_type TEXT; -- 'full', 'glass', 'wood_panel'

CREATE INDEX IF NOT EXISTS idx_product_ranges_type ON product_ranges(type);
```

### 2. Product Colors - Kleur Type Toevoegen

```sql
ALTER TABLE product_colors ADD COLUMN IF NOT EXISTS 
  color_type TEXT DEFAULT 'front'; 
  -- 'front', 'corpus', 'handle', 'hinge', 'drawer', 'plinth'
```

### 3. Nieuwe Tabel: Leverancier Kortingen

```sql
CREATE TABLE IF NOT EXISTS supplier_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  discount_group TEXT NOT NULL,      -- 'GR1', 'GR2', 'GR3'
  discount_percent DECIMAL(5,2),     -- Dealer korting %
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, discount_group)
);
```

### 4. Nieuwe Tabel: Montage Tarieven

```sql
CREATE TABLE IF NOT EXISTS installation_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'stuk',         -- 'm1', 'stuk', 'uur'
  default_price DECIMAL(10,2),
  vat_rate DECIMAL(5,2) DEFAULT 21,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standaard tarieven
INSERT INTO installation_rates (code, name, unit, default_price) VALUES
  ('STOSA', 'Keuken montage per m1', 'm1', 200.00),
  ('AANSLUIT', 'Aansluitkosten op maat gelegde leidingen', 'stuk', 175.00),
  ('KOKENDW', 'Aansluiten kokendwater kraan', 'stuk', 100.00),
  ('ZONE1', 'Transportkosten zone 1 (Limburg)', 'stuk', 250.00),
  ('ZONE2', 'Transportkosten zone 2', 'stuk', 350.00)
ON CONFLICT (code) DO NOTHING;
```

### 5. Nieuwe Tabel: Werkblad Bewerkingen

```sql
CREATE TABLE IF NOT EXISTS worktop_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  price_type TEXT DEFAULT 'fixed',   -- 'fixed', 'per_meter', 'per_m2'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, code)
);
```

## Frontend Wijzigingen

### 1. QuoteSectionConfig Verbeteren

Kleuren filteren op `color_type`:

```typescript
// Huidige code
const { data: colors = [] } = useProductColors(formData.range_id || null);

// Nieuwe code - groepeer per type
const frontColors = colors.filter(c => c.color_type === 'front' || !c.color_type);
const corpusColors = colors.filter(c => c.color_type === 'corpus');
const hingeColors = colors.filter(c => c.color_type === 'hinge');
const drawerColors = colors.filter(c => c.color_type === 'drawer');
const plinthColors = colors.filter(c => c.color_type === 'plinth');
```

En dropdowns per kleurtype:

```typescript
{/* Front kleur - nu met dropdown ipv input */}
<Select 
  value={formData.color_id} 
  onValueChange={handleColorChange}
>
  <SelectContent>
    {frontColors.map(color => (
      <SelectItem key={color.id} value={color.id}>
        {color.code} - {color.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 2. Nieuwe Hook: useSupplierDiscounts

```typescript
// hooks/useSupplierDiscounts.ts
export function useSupplierDiscounts(supplierId: string | null) {
  return useQuery({
    queryKey: ['supplier-discounts', supplierId],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_discounts')
        .select('*')
        .eq('supplier_id', supplierId);
      return data || [];
    },
    enabled: !!supplierId,
  });
}
```

### 3. Nieuwe Hook: useInstallationRates

```typescript
// hooks/useInstallationRates.ts
export function useInstallationRates() {
  return useQuery({
    queryKey: ['installation-rates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('installation_rates')
        .select('*')
        .eq('is_active', true)
        .order('code');
      return data || [];
    },
  });
}
```

### 4. Import Uitbreiden met Kleuren & Kortingen

In de ProductImport pagina, een extra stap voor kleur import:

```typescript
interface ColorImportRow {
  code: string;
  name: string;
  color_type: 'front' | 'corpus' | 'hinge' | 'drawer' | 'plinth';
  hex_color?: string;
}
```

### 5. Settings Pagina: Kortingen Configureren

Nieuwe tab in Settings voor leverancier kortingen:

```typescript
// components/settings/SupplierDiscountsSettings.tsx
export function SupplierDiscountsSettings() {
  // UI voor GR1/GR2/GR3 percentages per leverancier
}
```

## Bestandsoverzicht

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/xxx.sql` | Database migratie |
| `src/integrations/supabase/types.ts` | Types regenereren |
| `src/hooks/useSupplierDiscounts.ts` | Nieuw |
| `src/hooks/useInstallationRates.ts` | Nieuw |
| `src/hooks/useProductColors.ts` | Uitbreiden met color_type |
| `src/components/quotes/QuoteSectionConfig.tsx` | Dropdowns voor kleuren |
| `src/components/settings/SupplierDiscountsSettings.tsx` | Nieuw |
| `src/pages/Settings.tsx` | Tab toevoegen |

## Prioriteit Implementatie

```text
1. Database migratie          → Basis voor alles
2. supplier_discounts         → Inkoopprijs berekening
3. product_colors.color_type  → Kleur filtering in offertes
4. installation_rates         → Montage op offertes
5. worktop_operations         → Werkblad bewerkingen
```

## Resultaat

Na implementatie:
- Automatische inkoopprijs berekening (adviesprijs × (100 - korting%)
- Kleuren selectie per type (front, corpus, scharnier, etc.)
- Montage tarieven als standaard producten op offerte
- Werkblad bewerkingen configureerbaar
