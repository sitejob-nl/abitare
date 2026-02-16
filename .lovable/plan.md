

# Plan: Tradeplace TradePI XML parser + apparatuur-verrijking

## Samenvatting

De Python parser en het SQL-schema worden vertaald naar een Deno/TypeScript implementatie in de bestaande `pims-import` edge function. In plaats van aparte `appliances` tabellen worden de bestaande `products`-tabellen uitgebreid met de ontbrekende kolommen (inbouwmaten, energie, kleur, etc.). Dit voorkomt dubbele data en houdt de hele productcatalogus in een systeem.

## Wat er verandert

### 1. Database: kolommen toevoegen aan `products`

Nieuwe kolommen op de bestaande `products` tabel:

| Kolom | Type | Doel |
|---|---|---|
| `depth_open_door_mm` | integer | Diepte met open deur |
| `weight_net_kg` | numeric(10,2) | Netto gewicht |
| `weight_gross_kg` | numeric(10,2) | Bruto gewicht |
| `niche_height_min_mm` | integer | Minimale nishoogte |
| `niche_height_max_mm` | integer | Maximale nishoogte |
| `niche_width_min_mm` | integer | Minimale nisbreedte |
| `niche_width_max_mm` | integer | Maximale nisbreedte |
| `niche_depth_mm` | integer | Nisdiepte |
| `energy_class` | varchar(10) | Energielabel (A-G) |
| `energy_consumption_kwh` | numeric(10,2) | Energieverbruik |
| `water_consumption_l` | numeric(10,2) | Waterverbruik |
| `noise_db` | integer | Geluidsniveau |
| `noise_class` | varchar(5) | Geluidsklasse |
| `construction_type` | varchar(50) | Inbouw / Vrijstaand |
| `installation_type` | varchar(100) | Installatietype |
| `connection_power_w` | integer | Aansluitvermogen |
| `voltage_v` | integer | Voltage |
| `current_a` | integer | Stroomsterkte |
| `color_main` | varchar(100) | Hoofdkleur |
| `color_basic` | varchar(100) | Basiskleur |
| `product_family` | varchar(100) | Productfamilie (G7000) |
| `product_series` | varchar(100) | Productserie |
| `product_status` | varchar(50) | Status (actief/uitlopend) |
| `retail_price` | numeric | Adviesprijs (RRP) |
| `datasheet_url` | text | Link naar productfiche |

Nieuwe kolom op `pims_image_queue` en `product_images`:

| Kolom | Type | Doel |
|---|---|---|
| `media_type` | varchar(50), default 'photo' | Type: photo, dimension_drawing, energy_label, datasheet, 3d_model |

### 2. Edge function: TradePI XML parser toevoegen

In `supabase/functions/pims-import/index.ts` een nieuwe parser `parseTradePlaceCatalog()` toevoegen, gebaseerd op de Python `TradeplaceParser`:

- **Metadata**: `CatalogDownloadReplyHeader` -> `CatalogName`, `CatalogCreationDate`
- **Producten**: `.//Product` -> `PIData` (artikelcode, EAN, familie) + `OtherData` (prijzen, datums, media) + `UnitOfMeasures`
- **Properties**: `PIProperty` met de volledige `PROPERTY_MAPPING` uit de Python parser (HEIGHT, WIDTH, ENERGY_CLASS_2017, etc.)
- **Media**: `PRODUCT_IMAGE`, `MEASURE_IMAGE`, `PANEL_IMAGE`, `ENERGY_LABEL`, `PRODUCT_FICHE`, `ADD_IMAGE*` + `Asset` blokken
- **Prijzen**: `RecommendedRetailPrice` -> `Amount` + `NumberOfDecimal`
- **USP's**: `USP_*` properties opslaan in specifications
- **Categorien**: `ProductFamily@familyName` als categoriecode

### 3. Format-autodetectie

De edge function herkent automatisch het XML-type:

```text
if xml bevat '<Product>' en '<PIData>'     -> parseTradePlaceCatalog()
if xml bevat '<BMECAT' of '<ARTICLE'       -> parseBMEcatXml()
```

Dit werkt zowel voor handmatige uploads als voor de M2M push-flow (raw XML content type).

### 4. Verrijkingslogica uitbreiden

Na het parsen worden de nieuwe velden (inbouwmaten, energie, kleur, etc.) mee-upsert naar de `products` tabel. De image queue krijgt een `media_type` veld zodat foto's, maattekeningen en documenten apart worden opgeslagen.

De `pims-process-images` achtergrondprocessor wordt aangepast:
- Foto's en tekeningen (PNG/JPG): downloaden naar Supabase Storage
- Documenten (PDF, ZIP): alleen URL opslaan in `product_images` (niet downloaden)

### 5. Frontend: extra formaatoptie

`PimsImportTab.tsx` wordt uitgebreid met een derde formaatoptie: "TradePI XML (Tradeplace)". Bestandsacceptatie wordt `.xml` voor alle XML-formaten. De auto-detectie in de edge function bepaalt welke parser wordt gebruikt.

### 6. Standaard categorien seeden

De 21 apparatuurcategorien uit het SQL-schema (DISHWASHERS, OVENS, etc.) worden als `product_categories` aangemaakt met code en Nederlandse naam, zodat de TradePI `ProductFamily@familyName` direct matcht.

## Bestanden die wijzigen

1. **SQL migratie** -- Nieuwe kolommen op `products`, `pims_image_queue`, `product_images` + seed categorien
2. **`supabase/functions/pims-import/index.ts`** -- TradePI parser, format-detectie, verrijkte upsert
3. **`supabase/functions/pims-process-images/index.ts`** -- Media-type bewust (PDF's als URL, foto's downloaden)
4. **`src/components/import/PimsImportTab.tsx`** -- Derde formaat-optie
5. **`src/hooks/usePimsImport.ts`** -- Format type uitbreiden met 'tradepi'
6. **`src/integrations/supabase/types.ts`** -- Nieuwe kolommen reflecteren

## Technische details

### TradePI Parser (kern)

De Python `TradeplaceParser` wordt 1-op-1 vertaald naar TypeScript met dezelfde `PROPERTY_MAPPING` en `_handle_media_property` logica. De XML-structuur is:

```text
Product
  PIData
    ProductCode          -> article_code
    EANArticleCode       -> ean_code
    ProductFamily@name   -> category mapping
    PIProperty[name=X]   -> mapped fields + specs
  OtherData
    RecommendedRetailPrice -> retail_price
    StartingDate/ChangeDate
    Asset[]              -> images + documents
  UnitOfMeasures
    UnitOfMeasure[type=PCE] -> fallback dimensions
```

### Categorie-mapping

De `familyName` uit TradePI (bijv. "DISHWASHERS") wordt gematcht op een vooraf geseede `product_categories` rij. Onbekende families worden automatisch aangemaakt onder de merkcategorie.

