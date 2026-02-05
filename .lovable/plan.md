# Plan: Stosa Prijslijst Volledige Ondersteuning

## ✅ Status: GEÏMPLEMENTEERD

Alle fases zijn nu geïmplementeerd voor volledige Stosa ondersteuning.

## Wijzigingen

### Database (Migratie uitgevoerd)
- `product_ranges.type` - Type variabele (FPC, CAM, MOL, etc.)
- `products.discount_group` - Kortingsgroep (GR1, GR2, GR3)
- `products.catalog_code` - Papieren cataloguscode
- `product_prices.variant_2_code` - Secundaire variant code
- `product_prices.variant_2_name` - Secundaire variant naam
- Indexes voor sneller zoeken

### Frontend (ProductImport.tsx)
Nieuwe kolom mappings met auto-detectie:
- **Primaire prijsgroep**: Variabile 1 (type), Variante 1 (code), Descrizione 1° (naam)
- **Secundaire variant**: Variabile 2 (type), Variante 2 (code), Descrizione 2° (naam)
- **Extra velden**: Cat. molt. (kortingsgroep), Codice listino cartaceo (cataloguscode)

### Backend (import-products Edge Function)
- Range type wordt opgeslagen bij prijsgroepen
- Kortingsgroep en cataloguscode bij producten
- Secundaire variant info bij prijzen

## Auto-detectie Patronen

| Veld | Patronen |
|------|----------|
| Type variabele 1 | `variabile 1` |
| Variant code 1 | `variante 1` |
| Type variabele 2 | `variabile 2` |
| Variant code 2 | `variante 2` |
| Kortingsgroep | `cat. molt`, `cat molt` |
| Cataloguscode | `codice listino cartaceo` |

## Resultaat

De import kan nu de volledige Stosa prijslijst (69.015 rijen) verwerken met:
- 40+ prijscategorieën (FPC codes)
- Secundaire varianten (TBF, LAJ)
- 3 kortingsgroepen (GR1/GR2/GR3)
- Cataloguscodes voor zoeken
