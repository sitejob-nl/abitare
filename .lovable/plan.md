

# Fix PIMS Import: XML Parsing en Logging

## Probleem

De `pims-import` functie ontvangt de 1.2MB BMEcat XML van Tradeplace maar retourneert direct een 400 error. Er zijn geen logs na "Received raw XML" omdat de error-paden geen logging bevatten. De oorzaak is waarschijnlijk:

1. De XML-supplier detectie (`SUPPLIER_NAME` tag) matcht niet met de werkelijke BMEcat structuur
2. Of de product parser vindt 0 artikelen (BMEcat 2005 wraps artikelen in `T_NEW_CATALOG`)

## Oplossing

### 1. Betere logging toevoegen

Op **elk 400-error pad** een `console.error` toevoegen zodat we exact zien waar het fout gaat:
- Na de supplier naam extractie: log wat gevonden werd (of `null`)
- Na de supplier matching: log welke suppliers vergeleken werden
- Na het parsen: log hoeveel producten er gevonden zijn

### 2. Robuustere supplier-detectie

De huidige `xmlGetTagFirst` zoekt alleen naar directe tags. BMEcat XML heeft soms:
- Geneste structuren: `<SUPPLIER><SUPPLIER_NAME>...</SUPPLIER_NAME></SUPPLIER>`  
- Namespace prefixes: `<bme:SUPPLIER_NAME>`
- `<PARTY>` blokken met `<PARTY_ROLE>supplier</PARTY_ROLE>` + `<PARTY_ID>`

Aanpassingen:
- Fallback: als `SUPPLIER_NAME` niet direct gevonden wordt, zoek binnen een `<SUPPLIER>` of `<HEADER>` blok
- Namespace-tolerante regex (negeer prefixes)

### 3. Robuustere product-parsing

BMEcat 2005 structuur is typisch:
```text
<BMECAT>
  <HEADER>...</HEADER>
  <T_NEW_CATALOG>
    <ARTICLE>...</ARTICLE>
    <ARTICLE>...</ARTICLE>
  </T_NEW_CATALOG>
</BMECAT>
```

De huidige parser zoekt `ARTICLE` blocks in de hele XML string, wat zou moeten werken. Maar als het niet matcht, voeg fallbacks toe voor `PRODUCT` en `T_NEW_CATALOG > ARTICLE` patronen.

### 4. Debug-modus

Voeg een `?debug=true` query parameter toe die extra details retourneert in de response (eerste 500 chars van de XML header, gevonden tags, etc.) zodat je vanuit Tradeplace kan troubleshooten.

## Technische wijzigingen

**Bestand: `supabase/functions/pims-import/index.ts`**

- Voeg `console.log/error` toe op regels 239, 264, 270, 304 (de faal-paden)
- Maak `xmlGetTagFirst` namespace-tolerant met regex: `<(?:\\w+:)?SUPPLIER_NAME>`
- Voeg een debug-response optie toe
- Voeg een fallback toe die de `HEADER` sectie doorzoekt voor supplier info
- Log een sample van de XML (eerste 500 chars) bij onbekende fouten
