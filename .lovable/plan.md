

# PIMS Productdata Import - Edge Function + Storage + UI

## Overzicht

Een nieuwe edge function `pims-import` die BMEcat XML of CSV bestanden accepteert via HTTP POST, de productdata parsed, en synchroniseert met de `products` tabel. Productafbeeldingen worden gedownload en opgeslagen in een nieuwe Supabase Storage bucket.

## 1. Database wijzigingen

**Nieuwe tabel `product_images`** om meerdere afbeeldingen per product op te slaan:

```text
product_images (
  id          uuid PK default gen_random_uuid(),
  product_id  uuid FK -> products(id) ON DELETE CASCADE,
  url         text NOT NULL,        -- storage public URL
  storage_path text NOT NULL,       -- pad in bucket
  type        text default 'main',  -- main / detail / swatch / datasheet
  sort_order  int default 0,
  source      text default 'pims',  -- pims / manual
  created_at  timestamptz default now()
)
```

RLS policies: SELECT voor authenticated, INSERT/UPDATE/DELETE voor admin/manager.

**Nieuw kolom op `products`**:
- `image_url text` -- snelle referentie naar hoofdafbeelding (optioneel, voor lijstweergaves)
- `pims_last_synced timestamptz` -- wanneer laatst via PIMS bijgewerkt
- `specifications jsonb` -- technische specificaties uit PIMS (energielabel, gewicht, etc.)

**Nieuwe Storage bucket**: `product-images` (public)

## 2. Edge Function: `pims-import`

Accepteert een POST met multipart/form-data of JSON body:

**Optie A - JSON met base64 bestand:**
```text
{
  "supplier_id": "uuid",
  "format": "bmecat" | "csv",
  "file_content": "base64-encoded file",
  "file_name": "catalog.xml"
}
```

**Optie B - JSON met geparsede data (vanuit frontend):**
```text
{
  "supplier_id": "uuid",
  "products": [
    {
      "article_code": "BSH-12345",
      "ean_code": "8710103...",
      "name": "Vaatwasser 60cm",
      "description": "...",
      "specifications": { "energy_label": "A++", "weight_kg": 45 },
      "image_urls": ["https://pims.tradeplace.com/...jpg"],
      "cost_price": 450.00
    }
  ]
}
```

**Verwerkingslogica:**
1. Authenticatie controleren (Bearer token)
2. Als format = `bmecat`: XML parsen naar productarray (BMEcat T_NEW_CATALOG structuur)
3. Als format = `csv`: CSV parsen met kolomherkenning
4. Per product: upsert op `supplier_id + article_code` (safe upsert, `user_override` respecteren)
5. Per afbeelding-URL: downloaden, opslaan in `product-images/{supplier_id}/{article_code}/main.jpg`, URL opslaan in `product_images` tabel
6. `image_url` op product updaten naar eerste afbeelding
7. Import loggen in `import_logs`

**BMEcat XML parsing** ondersteunt de standaard elementen:
- `SUPPLIER_AID` -> article_code
- `DESCRIPTION_SHORT` / `DESCRIPTION_LONG` -> name / description
- `EAN` -> ean_code
- `MIME_SOURCE` -> image URLs om te downloaden
- `ARTICLE_PRICE` -> cost_price / base_price
- `ARTICLE_FEATURES` -> specifications JSONB

## 3. Frontend: PIMS Import tab op ProductImport pagina

Toevoegen van een "PIMS Import" tab aan de bestaande import-pagina (`/product-import`):

- Leverancier selecteren
- Bestandsformaat kiezen (BMEcat XML / CSV)
- Bestand uploaden
- Voortgangsindicator tonen
- Resultaat tonen (aantal producten, afbeeldingen, fouten)

## 4. ProductDetail: Afbeeldingen tonen

Op de productdetailpagina een afbeeldingenkaart toevoegen die afbeeldingen uit `product_images` toont.

## Bestanden die worden aangemaakt/gewijzigd

| Bestand | Actie |
|---------|-------|
| Migration SQL | Nieuw: `product_images` tabel, kolommen op `products`, storage bucket |
| `supabase/functions/pims-import/index.ts` | Nieuw: edge function |
| `supabase/config.toml` | Aanpassen: pims-import toevoegen |
| `src/hooks/usePimsImport.ts` | Nieuw: hook voor PIMS import |
| `src/hooks/useProductImages.ts` | Nieuw: hook voor product afbeeldingen |
| `src/pages/ProductImport.tsx` | Wijzigen: PIMS tab toevoegen |
| `src/pages/ProductDetail.tsx` | Wijzigen: afbeeldingen sectie toevoegen |

## Technische details

- BMEcat parsing: handmatige XML parsing met DOMParser (beschikbaar in Deno)
- Afbeeldingen: fetch van externe URL, upload naar Supabase Storage via service role key
- Safe upsert: `user_override` kolom wordt gerespecteerd (bestaand patroon uit import-products)
- Chunk verwerking: afbeeldingen worden sequentieel gedownload om rate limits te respecteren
- Maximaal 50 afbeeldingen per import-batch om edge function timeouts te voorkomen

