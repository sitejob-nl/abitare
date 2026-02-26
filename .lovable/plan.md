

## Analyse: Verschil demo-bestand vs huidige implementatie

Na vergelijking van de huidige code met de eerder geanalyseerde demo vallen deze ontbrekende onderdelen op:

### Wat nog ontbreekt

1. **Hex-kleurbolletjes bij kleur-selectors** -- De demo toont een gekleurd rondje (`●`) naast elke kleur in alle dropdowns (front, corpus, greep, plint). De huidige `StosaConfigPanel` toont alleen tekst in de `SelectItem`s.

2. **Opvouwbare sectiekaarten** -- In de demo zijn secties standaard ingeklapt (alleen header + subtotaal zichtbaar). Met een klik klap je de regels open. De huidige `SortableSectionCard` is altijd volledig open.

3. **Kleur-gecodeerde sectie-header achtergrond** -- De demo geeft de volledige header-achtergrond de sectiekleur (lichtblauw, lichtoranje, lichtgroen), niet alleen een smal bolletje. De huidige implementatie heeft alleen een `w-1 h-5 rounded-full` stip.

4. **Configuratie-samenvatting onder sectie-header** -- De demo toont een compacte inline samenvatting van de configuratie (model, kleur, greep) direct onder de sectie-header. De huidige `SectionConfigDisplay` bestaat maar is niet visueel compact zoals de demo.

5. **Product-filters (categorie/breedte)** -- De demo filtert producten op categorie-tabs en breedte-slider bij het toevoegen. De huidige `AddProductDialog` heeft alleen een zoekveld.

6. **Energielabels bij apparatuur** -- De demo toont energielabel-badges (A+++, A++) bij apparatuurproducten. Dit ontbreekt volledig.

7. **Zijbalk met live totalen** -- De demo heeft een sticky samenvattingspaneel aan de rechterkant dat meeloopt met scrollen. De huidige pagina toont totalen alleen onderaan.

---

### Implementatieplan

**Stap 1: Hex-kleurbolletjes in alle kleur-selectors**
- `StosaConfigPanel.tsx`: Voeg een `<div className="w-3 h-3 rounded-full border" style={{ backgroundColor: hex }}/>` toe in elke `SelectItem` voor front-, corpus-, greep- en plintkleur.

**Stap 2: Opvouwbare sectiekaarten**
- `SortableSectionCard.tsx`: Voeg een `isCollapsed` state toe. In collapsed mode: toon alleen header + subtotaal. Toggle met een chevron-knop. Gebruik `Collapsible` van Radix.

**Stap 3: Volledige kleur-gecodeerde header-achtergrond**
- `SortableSectionCard.tsx`: Vervang de `w-1` stip door een achtergrondkleur op de hele `CardHeader`. Gebruik lichte varianten: `bg-sky-50`, `bg-orange-50`, `bg-emerald-50`, etc.

**Stap 4: Compacte configuratie-samenvatting**
- `SortableSectionCard.tsx`: Toon onder de header een compacte regel met kleurbolletjes en labels (bijv. "Alev | E3 | Noce Eucalipto ● | Greeploos") wanneer `configuration` JSONB beschikbaar is.

**Stap 5: Categorie-/breedte-filters in AddProductDialog**
- `AddProductDialog.tsx`: Voeg filter-tabs toe voor categorie (bovenkast, onderkast, hoge kast) en een breedte-filter dropdown (30, 45, 60, 90 cm). Filter de productenlijst op `category` en `width_mm`.

**Stap 6: Sticky totalen-sidebar op QuoteDetail**
- `QuoteDetail.tsx`: Op desktop (lg+), toon een sticky sidebar rechts met de live QuoteTotals. Op mobiel blijft het onderaan.

