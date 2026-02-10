

## Derde prijsveld 'abitare_price' toevoegen aan producten

### Wat verandert er?

Producten krijgen een derde prijsveld: de **Abitare-prijs** (inkoop x factor). Bij het toevoegen van een product aan een offerte kan je kiezen welke verkoopprijs wordt gebruikt: de boekprijs of de Abitare-prijs.

### Huidige situatie

- Producten hebben nu twee prijsvelden: `base_price` (verkoopprijs/boekprijs) en `cost_price` (inkoopprijs)
- Bij offerte-regels wordt altijd `base_price` als terugval-prijs gebruikt
- Leveranciers hebben geen prijsfactor-instelling

### Aanpak

#### 1. Database-migratie

- Kolom `book_price DECIMAL(12,2)` toevoegen aan `products` -- de catalogusprijs/boekprijs (wat nu `base_price` heet wordt hernoemd naar de Abitare-prijs)
- Kolom `price_factor DECIMAL(6,3) DEFAULT 1.0` toevoegen aan `suppliers` -- de factor waarmee inkoop vermenigvuldigd wordt
- `base_price` blijft bestaan als de **Abitare-prijs** (= `cost_price * price_factor`)
- `book_price` wordt de ongewijzigde catalogusprijs van de leverancier
- Kolom `price_type VARCHAR(20) DEFAULT 'abitare'` toevoegen aan `quote_lines` -- slaat op welk prijstype is gekozen ('boekprijs' of 'abitare')

#### 2. Types bijwerken (types.ts)

Nieuwe velden toevoegen aan de Products, Suppliers en QuoteLines type-definities.

#### 3. ProductDetail pagina uitbreiden

In de prijzen-sidebar drie prijzen tonen:
- **Inkoopprijs** (`cost_price`)
- **Boekprijs** (`book_price`) -- catalogusprijs leverancier
- **Abitare-prijs** (`base_price`) -- berekend als inkoop x factor

Bij bewerken: boekprijs-veld toevoegen. De Abitare-prijs kan handmatig worden ingevuld of automatisch berekend via de factor.

#### 4. AddProductDialog aanpassen

Na productselectie een **prijstype-keuze** toevoegen met twee radio-opties:
- **Abitare-prijs** (standaard) -- toont de berekende prijs
- **Boekprijs** -- toont de catalogusprijs

De gekozen prijs wordt ingevuld in het prijsveld. Het gekozen type wordt opgeslagen als `price_type` op de offerteregel.

#### 5. fetchProductPrice uitbreiden

De prijshierarchie wordt uitgebreid: na de bestaande 4 niveaus (override -> sectie -> offerte-default -> base_price) wordt bij terugval op `base_price` gekeken naar het gekozen `price_type` om ofwel `base_price` (abitare) ofwel `book_price` te retourneren.

#### 6. EditableLineRow aanpassen

Bij inline bewerking van een offerteregel de mogelijkheid tonen om het prijstype te wisselen, zodat ook na toevoegen nog gewisseld kan worden tussen boekprijs en Abitare-prijs.

#### 7. Leverancier prijsfactor

Op de leverancierspagina of in de instellingen de mogelijkheid toevoegen om per leverancier een `price_factor` in te stellen.

### Technische details

**Migratie SQL:**
```text
ALTER TABLE products ADD COLUMN book_price DECIMAL(12,2);
ALTER TABLE suppliers ADD COLUMN price_factor DECIMAL(6,3) DEFAULT 1.0;
ALTER TABLE quote_lines ADD COLUMN price_type VARCHAR(20) DEFAULT 'abitare';
```

**Bestanden die worden gewijzigd:**
- `supabase/migrations/` -- nieuwe migratie
- `src/integrations/supabase/types.ts` -- nieuwe kolommen
- `src/pages/ProductDetail.tsx` -- boekprijs tonen/bewerken
- `src/components/quotes/AddProductDialog.tsx` -- prijstype-keuze met RadioGroup
- `src/components/quotes/EditableLineRow.tsx` -- prijstype wisselaar
- `src/hooks/useProductPrices.ts` -- fetchProductPrice uitbreiden met book_price
- `src/hooks/useQuoteLines.ts` -- price_type meenemen bij create/update

**Bestanden die worden aangemaakt:**
- Geen nieuwe bestanden nodig; alle wijzigingen passen in bestaande componenten

