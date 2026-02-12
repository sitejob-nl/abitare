

# Import Geschiedenis: Producten filteren op wanneer geimporteerd

## Probleem
De `import_logs` tabel bestaat al in de database maar wordt nooit gevuld. Na een JSON import is er geen manier om te zien wanneer welke producten zijn geimporteerd, hoeveel er zijn toegevoegd/bijgewerkt, of er fouten waren.

## Oplossing
Twee aanpassingen: (1) de Edge Function gaat import-logs schrijven na elke import, en (2) de ProductImport pagina krijgt een "Import Geschiedenis" sectie.

---

## Stap 1: Edge Function -- import_logs schrijven

Na elke succesvolle (of deels succesvolle) import wordt een rij toegevoegd aan `import_logs`:

- **source**: `'json'` of `'excel'` (op basis van `import_mode`)
- **file_name**: meegegeven vanuit de frontend (bijv. `import_look_001_of_010.json`)
- **supplier_id**: de leverancier
- **total_rows**: totaal verwerkte rijen
- **inserted**: aantal nieuwe producten
- **updated**: aantal bijgewerkte producten
- **skipped**: 0 (of berekend)
- **errors**: aantal fouten
- **error_details**: JSON array met foutmeldingen
- **imported_by**: `auth.uid()` uit het JWT token
- **division_id**: ophalen via `get_user_division_id()`

Dit geldt voor zowel de standaard-import als de prijsgroep-import.

## Stap 2: Frontend -- file_name meesturen

De `useJsonImport` hook en `useProductImport` hook sturen het bestandsnaam mee in het request body zodat de Edge Function dit kan loggen.

## Stap 3: Import Geschiedenis pagina/sectie

Op de ProductImport pagina komt bovenaan (voor de upload area) een inklapbare "Import Geschiedenis" kaart met:

- Tabel met kolommen: Datum, Bestand, Leverancier, Totaal, Nieuw, Bijgewerkt, Fouten
- Sorteer op datum (nieuwste eerst)
- Leveranciernaam via join
- Fout-indicator (rode badge bij errors > 0), klikbaar voor details
- Filter op leverancier (optioneel, via dropdown)
- Laatste 50 imports tonen

---

## Technische details

### Gewijzigde bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/import-products/index.ts` | Na import: `INSERT INTO import_logs` met stats |
| `src/hooks/useJsonImport.ts` | `file_name` meesturen in request body |
| `src/pages/ProductImport.tsx` | Import geschiedenis kaart toevoegen (query op `import_logs` + suppliers join) |

### Edge Function aanpassing (in beide import flows)

Na het berekenen van de stats, voor het retourneren van de response:

```text
INSERT INTO import_logs (supplier_id, division_id, source, file_name, total_rows, inserted, updated, skipped, errors, error_details, imported_by)
VALUES (supplierId, divisionId, 'json'/'excel', fileName, total, inserted, updated, 0, errorCount, errorDetailsJson, userId)
```

De `imported_by` en `division_id` worden uit het JWT token gehaald (de supabase client heeft al de user context).

### Frontend query

```text
SELECT il.*, s.name as supplier_name
FROM import_logs il
LEFT JOIN suppliers s ON s.id = il.supplier_id
ORDER BY il.created_at DESC
LIMIT 50
```

### Uitvoervolgorde
1. Edge Function updaten (import_logs schrijven)
2. useJsonImport hook: file_name meesturen
3. ProductImport pagina: geschiedenis sectie toevoegen

