

# Plan: Productcategorisatie uit PIMS-data

## Huidige situatie

- Alle 667 Bosch-producten hebben **geen categorie** (`category_id = null`)
- De `product_categories` tabel ondersteunt al hierarchie via `parent_id`
- Bestaande top-level categorien: Keukenmeubelen, Apparatuur, Werkbladen, Montage, Transport, Accessoires
- De BMEcat XML bevat classificatie-data in `CATALOG_GROUP_SYSTEM` en `ARTICLE_TO_CATALOGGROUP_MAP` tags

## Gewenste structuur

```text
Apparatuur (bestaand)
  └── Bosch (merk-niveau, nieuw)
        ├── MDA - Inbouw (hoofdgroep)
        │     ├── Baking oven
        │     ├── Cooker hood
        │     ├── Dishwasher
        │     ├── Hob
        │     └── ...
        ├── MDA - Vrijstaand (hoofdgroep)
        │     ├── Washing machine
        │     └── ...
        └── Accessory (hoofdgroep)
              └── Other
```

## Wat wordt aangepast

### 1. Supplier-kolom op categorien

Een `supplier_id` kolom toevoegen aan `product_categories` zodat leverancier-specifieke categorien (Bosch > MDA - Inbouw > Dishwasher) gescheiden zijn van generieke categorien (Apparatuur, Werkbladen).

### 2. BMEcat classificatie-parser

De XML bevat een `CATALOG_GROUP_SYSTEM` blok met `CATALOG_STRUCTURE` entries die de hiearchie beschrijven (groep-id, naam, parent-id). Elk product is gekoppeld via `ARTICLE_TO_CATALOGGROUP_MAP`.

Nieuwe parsing-logica:
1. Alle `CATALOG_STRUCTURE` entries uitlezen (groep-id, naam, parent-groep-id)
2. Hiearchie opbouwen: hoofdgroep > productgroep
3. Per product de `ARTICLE_TO_CATALOGGROUP_MAP` uitlezen voor de classificatie-link
4. Categorien automatisch aanmaken in `product_categories` (upsert op code + supplier_id)
5. Product toewijzen aan de juiste leaf-categorie

### 3. Bestaande producten categoriseren

Na het opnieuw importeren van de Bosch-data worden de 667 producten automatisch aan de juiste categorie gekoppeld. Er is geen aparte SQL-correctie nodig; de volgende import doet dit automatisch.

## Technische details

### Database migratie

```text
ALTER TABLE product_categories ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
```

Een index toevoegen voor snelle lookups:
```text
CREATE INDEX idx_product_categories_supplier ON product_categories(supplier_id) WHERE supplier_id IS NOT NULL;
```

### Parser-wijzigingen (`pims-import/index.ts`)

**Nieuwe functie: `parseCatalogGroups`**
- Leest `CATALOG_GROUP_SYSTEM` uit de XML
- Bouwt een map van groep-id naar `{ name, parent_id }`
- Retourneert de hiearchie

**Nieuwe functie: `parseProductGroupMapping`**
- Leest `ARTICLE_TO_CATALOGGROUP_MAP` per product
- Koppelt artikel aan groep-id

**Upsert-logica uitbreiden:**
- Voor elke unieke groep: upsert in `product_categories` met `code = groep-id`, `supplier_id`, en correcte `parent_id`
- Merk-categorie (bijv. "Bosch") automatisch aanmaken als tussenniveau onder "Apparatuur"
- Product `category_id` vullen met de leaf-categorie

### PimsProduct interface uitbreiden

```text
interface PimsProduct {
  // ... bestaande velden
  catalog_group_id?: string  // classificatie-groep uit XML
}
```

### Geen wijzigingen nodig aan

- Frontend: de productlijst/filter pagina gebruikt al `category_id` met de bestaande categorien
- Andere edge functions

