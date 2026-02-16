

# Plan: URL-only modus voor alle media + bestaande queue afhandelen

## Wat er verandert

### 1. `pims-process-images` edge function -- vereenvoudigen naar URL-only

De hele download-logica wordt verwijderd. Alle mediatypes (foto's, maattekeningen, energielabels, datasheets, 3D) worden nu als directe bron-URL opgeslagen in `product_images`, zonder iets te downloaden naar Supabase Storage.

**Concreet:**
- `downloadAndStoreImage()` functie verwijderen
- `DOWNLOADABLE_TYPES` / `URL_ONLY_TYPES` onderscheid verwijderen
- Alle items in de queue worden op dezelfde manier verwerkt: bron-URL opslaan in `product_images`, status naar `done`
- Hoofdfoto (photo, index 0) update op `products.image_url` blijft behouden (maar dan met de bron-URL)
- Batch size verhogen naar 100 (geen download meer = veel sneller)

### 2. Bestaande queue-items direct afhandelen

Een SQL-migratie die alle huidige `pending` en `processing` items in de `pims_image_queue` in een keer afhandelt:
- Voor elk pending item: een `product_images` rij aanmaken met de originele `image_url`
- Queue status naar `done` zetten
- Hoofdfoto's (photo, index 0) direct op `products.image_url` zetten

### 3. ProductDetail pagina -- adviesprijs + apparatuurgegevens tonen

Op `src/pages/ProductDetail.tsx`:
- **Adviesprijs (RRP)** tonen in het prijzenoverzicht
- **Inbouwmaten** sectie: nishoogte (min-max), nisbreedte (min-max), nisdiepte
- **Energie & Technisch**: energieklasse, verbruik, geluid, kleur
- Alle velden bewerkbaar in edit-modus

## Technische details

### pims-process-images (nieuwe logica)

```text
Per queue-item:
1. Normaliseer URL (voeg https://pims.tradeplace.com/ prefix toe indien nodig)
2. Upsert naar product_images met bron-URL
3. Als photo + index 0: update products.image_url (mits geen user_override)
4. Queue status -> done
```

Batch size: 100 (was 10). Geen netwerk-downloads meer, alleen database-operaties.

### SQL migratie (bulk resolve)

```text
-- Stap 1: Insert product_images voor alle pending queue items
INSERT INTO product_images (product_id, url, storage_path, type, media_type, sort_order, source)
SELECT product_id, image_url, 'url-ref/' || supplier_id || '/' || article_code || '/' || COALESCE(media_type, 'photo'),
       CASE WHEN media_type = 'photo' AND image_index = 0 THEN 'main'
            WHEN media_type = 'photo' THEN 'detail'
            ELSE COALESCE(media_type, 'photo') END,
       COALESCE(media_type, 'photo'), image_index, 'pims'
FROM pims_image_queue WHERE status IN ('pending', 'processing')
ON CONFLICT (product_id, storage_path) DO UPDATE SET url = EXCLUDED.url;

-- Stap 2: Update products.image_url voor hoofdfoto's
UPDATE products SET image_url = q.image_url
FROM pims_image_queue q
WHERE products.id = q.product_id AND q.status IN ('pending','processing')
  AND COALESCE(q.media_type,'photo') = 'photo' AND q.image_index = 0
  AND NOT COALESCE((products.user_override->>'image_url')::boolean, false);

-- Stap 3: Alles op done zetten
UPDATE pims_image_queue SET status = 'done', processed_at = NOW()
WHERE status IN ('pending', 'processing');
```

### ProductDetail uitbreiding

Nieuwe secties onder de bestaande afmetingen:

```text
Prijzen
  Adviesprijs (RRP)   € 1.789,00
  Inkoopprijs         € -

Inbouwmaten
  Nishoogte     805 - 870 mm
  Nisbreedte    600 mm
  Nisdiepte     550 mm

Energie & Technisch
  Energieklasse    C
  Verbruik         74 kWh / 100 cycli
  Geluidsniveau    45 dB (klasse B)
  Kleur            RVS / CleanSteel
```

## Bestanden die wijzigen

1. **SQL migratie** -- Bulk resolve van alle pending queue-items
2. **`supabase/functions/pims-process-images/index.ts`** -- Vereenvoudigen naar URL-only, geen downloads
3. **`src/pages/ProductDetail.tsx`** -- Adviesprijs, inbouwmaten, energie-info tonen

