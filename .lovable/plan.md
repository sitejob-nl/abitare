

# Fix PIMS Import: ZIP-bestand ondersteuning

## Probleem

Tradeplace stuurt de BMEcat export als een **ZIP-bestand** (niet als raw XML). Dit is te zien aan:
- De eerste bytes zijn `PK\x03\x04` -- de standaard ZIP file signature
- De bestandsnaam `bosch export.xml` is zichtbaar in de ZIP-header
- De functie probeert de ZIP-bytes als XML te parsen, vindt geen tags, en geeft een 400 error

## Oplossing

Voeg ZIP-detectie en -decompressie toe aan de `pims-import` edge function.

### Technische aanpak

**Bestand: `supabase/functions/pims-import/index.ts`**

1. **ZIP-detectie**: Controleer of de eerste 2 bytes van de ontvangen data `PK` zijn (hex `50 4B`)
2. **Decompressie**: Gebruik de ingebouwde `DecompressionStream("deflate-raw")` Web API (beschikbaar in Deno) om het ZIP-bestand uit te pakken, of gebruik een lichtgewicht ZIP-parser die het eerste `.xml` bestand uit het archief extraheert
3. **Fallback**: Als het geen ZIP is, verwerk het als voorheen (raw XML)

### ZIP-parsing strategie

Een ZIP-bestand heeft een eenvoudige structuur:
- Local file headers beginnen met `PK\x03\x04`
- Na de header volgt de compressed data
- We zoeken het eerste bestand dat op `.xml` eindigt
- De compressed data wordt gedecomprimeerd met `DecompressionStream("deflate-raw")`

Dit is een lichtgewicht oplossing zonder externe dependencies -- alleen Web APIs die Deno/Edge Functions al ondersteunen.

### Wijzigingen

In `pims-import/index.ts`:
- Voeg een `unzipFirstXml(rawBytes: Uint8Array): string` functie toe die:
  - De ZIP local file header parsed (offset, compressed size, bestandsnaam)
  - Het eerste `.xml` bestand vindt
  - De data decomprimeert met `DecompressionStream`
  - De XML string retourneert
- Voeg ZIP-detectie toe direct na het ontvangen van de raw data, voor de XML-parsing
- Log duidelijk of het bestand als ZIP of raw XML werd verwerkt

### Flow na de fix

```text
Tradeplace POST data
        |
        v
  Is het een ZIP? (check PK header)
    |           |
   Ja          Nee
    |           |
  Unzip XML   Gebruik raw XML
    |           |
    v           v
  Parse BMEcat XML (bestaande logica)
```
