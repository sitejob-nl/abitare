

# Product Import - Prijslijsten Laden

## Samenvatting

Je hebt 3 prijslijsten geüpload die ik wil importeren in de database:

| Bestand | Leverancier | Type | Formaat | Status |
|---------|-------------|------|---------|--------|
| Siemens_Prijslist.xlsx | Siemens | Apparatuur | Excel | Goed leesbaar - ~530 producten |
| ARTIMAR_PRIJSLIJST.pdf | Artimar | Werkbladen | PDF | Complex formaat - handmatige mapping nodig |
| LISTINO_VENDITA_STOSA.xlsx | Stosa | Keukens | Excel | Parsing mislukt - bestand mogelijk beschadigd |

De **Siemens prijslijst** is het makkelijkst te importeren omdat deze gestructureerd is in kolommen.

---

## Wat wordt er gebouwd?

### 1. Product Import Pagina
Een nieuwe pagina `/settings/import` waar je:
- Een prijslijst-bestand kunt uploaden (CSV/Excel)
- Een preview ziet van de data voor import
- Kolommen kunt mappen naar database velden
- De import kunt starten

### 2. Siemens Import (Directe Import)
Voor de Siemens prijslijst maak ik een directe import met mapping:

| Kolom Excel | Database Veld |
|-------------|---------------|
| Artikel | article_code |
| Omschrijving | name |
| Netto Factuur Prijs | cost_price (inkoopprijs) |
| Adviesprijs exc. BTW | base_price (verkoopprijs) |
| Artikelgroep | category (via lookup) |

**Leverancier**: Siemens (bestaat al: `c5669d28-f277-4043-a3fb-c2c593b0be63`)
**Categorie**: Apparatuur (`891805b7-58bc-4e4d-aa9f-4874954190ee`)

### 3. Artimar Leverancier Toevoegen
Artimar bestaat nog niet als leverancier. Ik voeg deze toe:

```text
Code: ARTIMAR
Naam: Artimar
Type: werkblad
Levertijd: 2 weken
```

---

## Technische Aanpak

### Edge Function: `import-products`
Een Supabase Edge Function die:
1. CSV/Excel data ontvangt (als JSON)
2. Kolom mapping toepast
3. Producten upsert (insert of update bij bestaand article_code)
4. Resultaat teruggeeft (aantal toegevoegd/bijgewerkt)

### Frontend Import Flow

```text
+------------------------------------------------------------------+
|  Product Import                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  Stap 1: Bestand selecteren                                      |
|  +------------------------------------------------------------+  |
|  | [Upload prijslijst (.xlsx, .csv)]                          |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  Stap 2: Leverancier kiezen                                      |
|  +------------------------------------------------------------+  |
|  | [Siemens                                              v]    |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  Stap 3: Kolommen mappen                                         |
|  +------------------------------------------------------------+  |
|  | Excel Kolom          ->  Database Veld                      |  |
|  | Artikel             ->  [article_code           v]         |  |
|  | Omschrijving        ->  [name                   v]         |  |
|  | Netto Factuur Prijs ->  [cost_price             v]         |  |
|  | Adviesprijs exc BTW ->  [base_price             v]         |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  Stap 4: Preview (eerste 10 rijen)                               |
|  +------------------------------------------------------------+  |
|  | Code     | Naam                  | Inkoop   | Verkoop      |  |
|  | VB578D0S0| Bakoven 90 cm Pyrolyse| € 1,275  | € 2,247      |  |
|  | HB978GUB1| Bakoven Pyrolyse      | € 1,454  | € 2,189      |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  [Annuleren]                              [Importeer 530 items]  |
+------------------------------------------------------------------+
```

---

## Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/pages/ProductImport.tsx` | Import wizard pagina |
| `src/components/import/FileUploader.tsx` | Bestand upload component |
| `src/components/import/ColumnMapper.tsx` | Kolom mapping interface |
| `src/components/import/ImportPreview.tsx` | Preview tabel |
| `src/hooks/useProductImport.ts` | Import logica en mutaties |
| `supabase/functions/import-products/index.ts` | Edge function voor bulk insert |

## Bestaande Bestanden Aanpassen

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Route toevoegen: `/settings/import` |
| Database | Artimar leverancier toevoegen via migratie |

---

## Database Migratie

```sql
-- Artimar leverancier toevoegen
INSERT INTO suppliers (code, name, supplier_type, lead_time_weeks, is_active)
VALUES ('ARTIMAR', 'Artimar', 'werkblad', 2, true);
```

---

## Import Stappen

### Fase 1: Siemens (Automatisch)
1. Lees Excel data (al geparsed)
2. Map naar product structuur
3. Bulk insert ~530 producten

### Fase 2: Artimar (Later - Handmatig)
De Artimar PDF bevat complexe tabellen met:
- Materiaalsoorten (Graniet, Composiet, Keramiek)
- Verschillende diktes (20mm, 30mm, 40mm)
- Verschillende afwerkingen (Poli, Honed, Artiskin)

Dit vereist handmatige data-extractie of een aparte import tool.

### Fase 3: Stosa (Later)
Het Stosa bestand kon niet geparsed worden. Kun je controleren of:
- Het bestand niet beschadigd is?
- Je een CSV-versie hebt?

---

## Samenvatting

| Onderdeel | Status |
|-----------|--------|
| Import pagina UI | Nieuw |
| Edge function voor bulk import | Nieuw |
| Siemens import (~530 producten) | Eerste prioriteit |
| Artimar leverancier | Nieuw (via migratie) |
| Artimar producten | Later (complex formaat) |
| Stosa producten | Later (bestand check nodig) |

