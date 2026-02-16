

# Optimalisatie PIMS Import: Batch Processing zonder Time-outs

## Probleem

De huidige `pims-import` edge function doet alles in een enkel request:
- XML parsen (snel)
- Producten upserten (matig snel)
- Afbeeldingen downloaden en uploaden naar Storage (TRAAG - 15s timeout per image x honderden producten)

Supabase Edge Functions hebben een executielimiet van ~150 seconden. Een BMEcat bestand van 1.2MB met honderden producten en afbeeldingen overschrijdt dit ruim.

## Oplossing: Twee-fasen architectuur

**Fase 1 - Snel (pims-import):** Parse XML, upsert alle producten, sla image-URLs op in een wachtrij-tabel. Reageert direct met succes naar Tradeplace.

**Fase 2 - Achtergrond (pims-process-images):** Een aparte edge function die de wachtrij verwerkt in batches. Wordt automatisch aangeroepen door fase 1 na het upserten.

```text
Tradeplace POST XML
        |
        v
 [pims-import]  ──>  Parse XML + Upsert producten + Vul image_queue
        |                        (< 30 sec)
        |── Return 200 OK naar Tradeplace
        |
        └──> Fire-and-forget call naar [pims-process-images]
                        |
                        v
              Download images in batches van 10
              Upload naar Storage
              Update product records
              (draait los, geen time-out druk)
```

## Technische stappen

### 1. Nieuwe database tabel: `pims_image_queue`

Migratie aanmaken met kolommen:
- `id` (uuid, PK)
- `product_id` (uuid, FK naar products)
- `supplier_id` (uuid)
- `article_code` (text)
- `image_url` (text)
- `image_index` (integer)
- `status` (text: pending / processing / done / failed)
- `error_message` (text, nullable)
- `created_at`, `processed_at` (timestamps)

RLS uitschakelen (alleen service role gebruikt deze tabel).

### 2. Aanpassen `pims-import` edge function

- **Verwijder** alle image-download logica uit de hoofdflow
- Na het upserten van producten: bulk-insert image URLs in `pims_image_queue` met status `pending`
- Aan het einde: fire-and-forget fetch naar `pims-process-images`
- Retourneer direct het resultaat (inserted/updated counts) zonder te wachten op images

### 3. Nieuwe edge function: `pims-process-images`

- Haalt batches van 10 `pending` items uit `pims_image_queue`
- Markeert ze als `processing`
- Downloadt en uploadt parallel (Promise.allSettled)
- Update status naar `done` of `failed`
- Herhaalt tot de queue leeg is of een eigen tijdslimiet van ~120 seconden bereikt
- Als er nog items over zijn: roept zichzelf opnieuw aan (self-chaining)

### 4. Config update

Toevoegen aan `supabase/config.toml`:
```toml
[functions.pims-process-images]
verify_jwt = false
```

### 5. UI aanpassing (optioneel, klein)

- `PimsImportTab` resultaatscherm toont een melding dat afbeeldingen op de achtergrond worden verwerkt
- Eventueel een indicator op de producten-pagina voor "images pending"

## Voordelen

- Tradeplace krijgt binnen ~10-20 seconden een 200 OK (geen time-out meer)
- Afbeeldingen worden betrouwbaar verwerkt, ook bij honderden producten
- Bij fouten: individuele items in de queue zijn traceerbaar
- De UI-upload flow blijft ook werken (dezelfde twee-fasen aanpak)

