
# Ontbrekende productdata zichtbaar maken

## Overzicht
Alle data die via PIMS wordt geimporteerd (Miele, straks Atag/Electrolux) wordt al opgeslagen in de database, maar veel velden worden niet getoond op de productdetailpagina. Dit plan maakt alles zichtbaar.

## Wijzigingen

### 1. ProductDetail.tsx - Extra velden in "Afmetingen en Technisch" kaart

**Nieuwe velden in lees- en bewerkingsmodus:**

Afmetingen-sectie:
- Diepte met open deur (depth_open_door_mm)

Nieuwe sectie "Gewicht":
- Netto gewicht (weight_net_kg)
- Bruto gewicht (weight_gross_kg)

Nieuwe sectie "Aansluiting":
- Bouwtype (construction_type)
- Installatietype (installation_type)
- Aansluitvermogen in W (connection_power_w)
- Spanning in V (voltage_v)
- Stroom in A (current_a)

Uitbreiding "Energie en Technisch":
- Waterverbruik in L (water_consumption_l)
- Basiskleur (color_basic)

Nieuwe sectie "Productinfo":
- Productfamilie (product_family)
- Productserie (product_series)
- Productstatus (product_status)

Datasheet-link:
- Downloadknop wanneer datasheet_url beschikbaar is

### 2. ProductDetail.tsx - Nieuwe "Specificaties" kaart

Een nieuwe Card onder de "Afmetingen en Technisch" kaart die het `specifications` JSONB-veld uitleest en toont:
- Alle key-value paren in een overzichtelijk grid
- Array-waarden (zoals USPs) als bullet-lijst
- Alleen getoond wanneer het specifications-veld data bevat

### 3. ProductImageGallery.tsx - Media-galerij met tabs

De galerij uitbreiden om alle media_types te tonen:
- Tabs: Foto's | Maattekeningen | Energielabels | Datasheets | 3D
- Alleen tabs tonen die data bevatten
- PDF/document-types als downloadlinks in plaats van afbeeldingen
- Klikbare thumbnails om een grotere preview te tonen

### 4. useProductImages.ts - media_type toevoegen

Het `media_type` veld toevoegen aan de ProductImage interface zodat we erop kunnen filteren.

## Technische details

### ProductDetail.tsx aanpassingen
- `startEditing()`: extra velden toevoegen aan form state (depth_open_door_mm, weight_net_kg, weight_gross_kg, water_consumption_l, construction_type, installation_type, connection_power_w, voltage_v, current_a, color_basic, product_family, product_series, product_status, datasheet_url)
- `handleSave()`: deze velden meenemen in de updateData
- Lees-modus: nieuwe Field-componenten voor elk veld, gegroepeerd in logische secties
- Bewerkingsmodus: bijbehorende Input-velden
- Specificaties-kaart: `product.specifications` als JSON parsen en renderen

### ProductImageGallery.tsx herschrijven
- Groepeer images op `media_type` (photo, dimension_drawing, energy_label, datasheet, 3d_model)
- Tabs component van shadcn/ui gebruiken
- ImageGrid sub-component met klikbare thumbnails
- PDF-detectie voor document-links

### useProductImages.ts
- `media_type` veld toevoegen aan ProductImage interface

### Geen database-migraties nodig
Alle kolommen bestaan al. Er zijn 6.069 foto's, 1.895 datasheets, 1.787 energielabels, 1.506 maattekeningen en 707 3D-modellen opgeslagen.
