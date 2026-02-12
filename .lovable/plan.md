

# JSON Import toevoegen aan ProductImport pagina

## Probleem
De huidige import-pagina accepteert alleen Excel/CSV bestanden. De Stosa JSON chunks (gegenereerd door `stosa_import.py`) bevatten kant-en-klare data maar kunnen niet worden geimporteerd via de UI.

## Oplossing
De ProductImport pagina uitbreiden zodat JSON bestanden (enkel en meervoudig) direct naar de Edge Function gestuurd kunnen worden, inclusief voortgangsindicatie.

---

## Wijzigingen

### 1. Bestandsacceptatie uitbreiden
- File input `accept` uitbreiden met `.json`
- Hint-tekst aanpassen: "CSV, XLSX, XLS of JSON"

### 2. JSON detectie en verwerking
Bij het uploaden van een `.json` bestand:
- Parse als JSON (niet via XLSX)
- Controleer of het een geldig Stosa import-formaat is (heeft `import_mode`, `price_group_data`)
- Sla de Excel-kolommap stappen over en ga direct naar een vereenvoudigd "JSON preview" scherm
- Toon: aantal producten, ranges, prijzen uit het JSON bestand
- Leverancier automatisch invullen als `supplier_id` in de JSON staat (lookup op naam of UUID)

### 3. Bulk JSON import (meerdere bestanden)
- Optie om meerdere JSON bestanden tegelijk te selecteren
- Sequentiele verwerking met voortgangsbalk per chunk
- Resultaten per chunk tonen (inserted/updated/errors)
- Pauze van 500ms tussen chunks om de Edge Function niet te overbelasten

### 4. Directe Edge Function aanroep
JSON bestanden worden 1-op-1 doorgestuurd naar de `import-products` Edge Function:
- Geen kolomdetectie nodig (data is al in het juiste formaat)
- `supplier_id` uit het JSON bestand gebruiken, of de geselecteerde leverancier
- Resultaat per chunk tonen

---

## Technische details

### Gewijzigd bestand

| Bestand | Wijziging |
|---|---|
| `src/pages/ProductImport.tsx` | JSON detectie, bulk upload, direct-send flow |

### Nieuwe flow voor JSON bestanden

```text
[Upload JSON] --> [Detecteer formaat] --> [Toon preview (producten/ranges/prijzen)]
     |                                          |
     v                                          v
[Meerdere JSONs?] --> [Sequentieel versturen] --> [Voortgang per chunk]
                                                       |
                                                       v
                                                [Resultaten samenvatting]
```

### Wijzigingen in detail

1. **`handleFileUpload`**: Check op `.json` extensie, parse via `JSON.parse()` i.p.v. XLSX, extract stats
2. **Nieuwe state**: `jsonMode: boolean`, `jsonPayloads: object[]` (voor bulk), `bulkProgress: {current, total, results[]}`
3. **Stap 2 (JSON variant)**: Simpeler scherm met alleen leverancier-selectie + preview stats, geen kolomdetectie
4. **`handleImport` (JSON variant)**: Loop door `jsonPayloads`, stuur elk direct naar Edge Function, update voortgang
5. **File input**: `multiple` attribuut wanneer JSON modus, zodat meerdere chunks tegelijk geselecteerd kunnen worden

