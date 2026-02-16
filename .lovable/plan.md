

# Plan: Bosch PIMS-data opschonen en verrijken

## Huidige situatie (667 producten)

| Veld | Status | Probleem |
|------|--------|----------|
| Naam | 667/667 | Bevat artikelcode: "BBH3ALL23, Draadloze steelstofzuiger" |
| Inkoopprijs | 654/667 | 13 producten zonder prijs |
| Verkoopprijs | 0/667 | Ontbreekt volledig, price_factor staat op 1.0 |
| Specificaties | 278/667 | Onleesbare codes: `EF000008: 541` in plaats van `Breedte: 541 mm` |
| Afmetingen | 0/667 | Niet ingevuld, terwijl data in specs zit (EF000008=breedte, EF000040=hoogte, EF000049=diepte) |
| EAN | 667/667 | Correct |
| Afbeeldingen | 0/667 | Geen MIME_SOURCE in XML |
| Omschrijving | 667/667 | Correct, maar bevat ook afmetingen in tekst |

## Wat wordt aangepast

### 1. Productnamen opschonen
De artikelcode aan het begin van de naam verwijderen.

**Voor:** `BBH3ALL23, Draadloze steelstofzuiger`
**Na:** `Draadloze steelstofzuiger`

Aanpassing in de PIMS parser: als `DESCRIPTION_SHORT` begint met de `SUPPLIER_AID` gevolgd door een komma, strip dat deel.

### 2. Specificaties vertalen naar leesbare namen
De BMEcat ETIM-codes (EF000008, EF000040, etc.) vertalen naar Nederlandse namen via een mapping-tabel. De belangrijkste codes die voorkomen:

| Code | Betekenis | Voorbeeld |
|------|-----------|-----------|
| EF000008 | Breedte (mm) | 541 |
| EF000040 | Hoogte (mm) | 874 |
| EF000049 | Diepte (mm) | 548 |
| EF002680 | Diepte met deur (mm) | 550 |
| EF008333 | Inbouw breedte (mm) | 560 |
| EF008334 | Inbouw hoogte (mm) | 880 |
| EF002065 | Energielabel | EV-codes |
| EF004149 | Bewaartijd bij storing (uur) | 10 |
| EF007823 | Scharnier type | EV000154 |

Aanpassing in de parser: een mapping dictionary toevoegen die EF-codes vertaalt. Onbekende codes worden genegeerd in plaats van opgeslagen als onleesbare data.

### 3. Afmetingen automatisch extraheren
De specificatie-codes EF000008 (breedte), EF000040 (hoogte) en EF000049 (diepte) mappen naar de `width_mm`, `height_mm` en `depth_mm` kolommen van het product.

### 4. Verkoopprijs berekenen via price_factor
De Bosch-leverancier heeft nu `price_factor = 1.0` waardoor de verkoopprijs gelijk is aan de inkoopprijs. Er zijn twee stappen:
- **Parser**: als er geen `base_price` uit de XML komt, gebruik `cost_price * supplier.price_factor` om een verkoopprijs in te vullen
- **Instelling**: je moet zelf de juiste `price_factor` instellen bij de Bosch leverancier (bijv. 1.4 voor 40% marge)

### 5. Bestaande data corrigeren (eenmalig)
Na het deployen van de verbeterde parser, een SQL-update uitvoeren om de 667 bestaande producten te corrigeren:
- Namen opschonen (artikelcode verwijderen)
- Specificaties opnieuw opslaan is niet mogelijk zonder de XML, dus alleen de namen worden gecorrigeerd
- Afmetingen worden bij de volgende import automatisch ingevuld

## Technische details

### Bestand: `supabase/functions/pims-import/index.ts`

**Naam-opschoning (in `parseBMEcatXml`):**
```text
const rawName = xmlGetTagFirst(block, ['DESCRIPTION_SHORT']) || code
const name = rawName.startsWith(code + ',') ? rawName.slice(code.length + 1).trim() : rawName
```

**ETIM-specificatie mapping (nieuw):**
```text
const ETIM_MAP: Record<string, string> = {
  'EF000008': 'Breedte (mm)',
  'EF000040': 'Hoogte (mm)',
  'EF000049': 'Diepte (mm)',
  'EF002680': 'Diepte met deur (mm)',
  'EF008333': 'Inbouw breedte (mm)',
  'EF008334': 'Inbouw hoogte (mm)',
  'EF002065': 'Energielabel',
  'EF004149': 'Bewaartijd storing (uur)',
  ... (ca. 20 meest voorkomende codes)
}
```

Onbekende EF-codes worden overgeslagen. Specificaties worden opgeslagen met leesbare keys.

**Afmetingen extractie (in upsert-logica):**
```text
if (specs['EF000008']) productData.width_mm = parseInt(specs['EF000008'])
if (specs['EF000040']) productData.height_mm = parseInt(specs['EF000040'])
if (specs['EF000049']) productData.depth_mm = parseInt(specs['EF000049'])
```

**Verkoopprijs berekening (in upsert-logica):**
De supplier's `price_factor` wordt opgehaald en toegepast als er geen `base_price` in de XML zit.

### Eenmalige data-correctie (SQL via insert tool)
```text
UPDATE products 
SET name = TRIM(SUBSTRING(name FROM POSITION(',' IN name) + 1))
WHERE supplier_id = 'e70c4a1a-...' 
  AND name LIKE article_code || ',%'
```

### Geen wijzigingen nodig aan
- Frontend code (productdetailpagina toont al specifications als key-value pairs)
- Andere hooks of componenten
