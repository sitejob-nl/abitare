

## Analyse: stosa-import-data-abitare.xlsx

Dit Excel-bestand is **extreem waardevol**. Het bevat drie soorten data die nu ontbreken in de database:

### Wat erin zit

**Page 1 — Productprijzen (68 kasten)**
Elk product (BT15H00, BE45H00, LT60H01, etc.) met prijzen in PUNTEN over alle 13 kolommen (E1–E10, A, B, C). Dit zijn de echte kastprijzen die nu compleet ontbreken — de huidige 13.218 producten zijn alleen accessoires (spoelbakken, hardware, etc.) zonder kasten.

**Page 2 — Evolution kleuren (al geïmporteerd)**
De kleur-prijsgroep koppelingen die we net hebben geïmporteerd in `price_group_colors` (345 records). Dit is al gedaan.

**Page 3 — Art collectie kleuren (NIEUW)**
Een tweede collectie met 5 prijsgroepen (I–V) voor modellen Kaya, Sveva en Lumia. Dit bestaat nog niet in de database.

**Page 4 — Documentatie**
Bevestigt: prijzen zijn in PUNTEN (PTS), niet euro's. `points_to_eur` staat nog op NULL in de supplier.

### Huidige database-status

| Item | Status |
|---|---|
| 13 Evolution prijsgroepen | Aangemaakt |
| 345 price_group_colors | Geïmporteerd |
| Kastproducten (BT*, BE*, LT*, etc.) | **Ontbreken** — 0 van de 68 |
| product_prices voor kasten | **Ontbreken** — 0 records |
| Art collectie (I–V) | **Ontbreekt volledig** |
| points_to_eur op supplier | **NULL** — moet ingesteld worden |

### Plan

**Stap 1: 68 kastproducten importeren**
Nieuwe `products` records aanmaken met article_code (BT15H00 etc.), naam (uit kolom Omschrijving), categorie (Onderkast/Ladekast/Spoelbak/etc.), breedte, pricing_unit = STUK, supplier_id = Stosa.

**Stap 2: ~884 product_prices records**
Per product × 13 prijsgroepen = 68 × 13 = 884 records in `product_prices`. Waarden in punten (de `calc_selling_price` functie gebruikt `points_to_eur` om naar euro's om te rekenen).

**Stap 3: Art collectie opzetten**
- 5 nieuwe `price_groups`: I, II, III, IV, V (collection = "Art")
- ~20 `price_group_colors` records voor Kaya/Sveva/Lumia kleuren
- Art-kasten zijn niet in Page 1 opgenomen — die prijzen ontbreken nog. Alleen de kleuren kunnen nu geïmporteerd worden.

**Stap 4: points_to_eur instellen**
De supplier heeft `price_system = 'points'` maar `points_to_eur = NULL`. De klant moet de omrekenfactor aanleveren (bijv. 1 punt = €X). Zonder die waarde worden alle prijzen als 0 berekend.

### Aanpak

De data-insert kan volledig via SQL (geen migratie nodig, alleen data). De 68 producten + 884 prijzen worden in batches ingevoegd. De bestaande `stosa-import` edge function is ontworpen voor de grotere productcatalogus (13K+ items) — deze 68 kasten zijn de kern-kastprijzen die apart moeten worden geladen.

### Bestanden

| Actie | Wat |
|---|---|
| Data insert | 68 `products` records (kasten) |
| Data insert | 884 `product_prices` records (13 groepen × 68 producten) |
| Data insert | 5 `price_groups` records (Art: I–V) |
| Data insert | ~20 `price_group_colors` records (Art kleuren) |
| Data update | `suppliers` SET `points_to_eur` (wacht op klant) |

### Open vraag

Wat is de **points_to_eur** omrekenfactor? Zonder deze waarde kan `calc_selling_price()` geen verkoopprijzen berekenen. De klant moet dit aanleveren.

