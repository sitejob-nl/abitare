

## Verbetering AddProductDialog UI

De huidige dialoog heeft meerdere UX-problemen:
- Product zoeken via een combobox-popover is onhandig (extra klik, klein venster)
- Filters, zoekresultaten en formuliervelden staan allemaal gestapeld in een smalle kolom
- Na productselectie verschijnt pas het formulier, wat de flow breekt
- Veel verticale scroll nodig

### Aanpak: Breed tweepanelen-design

**Stap 1: Verbreed de dialoog en maak een tweepanelen-layout**
- Vergroot van `sm:max-w-[550px]` naar `sm:max-w-[900px]`
- Linkerpaneel (60%): filters + scrollbare productlijst als kaarten/rijen
- Rechterpaneel (40%): formuliervelden (aantal, prijs, afmetingen, omschrijving)

**Stap 2: Inline productlijst in plaats van combobox**
- Vervang de Popover/Command combobox door een directe zoekbalk + scrollbare lijst
- Toon producten als compacte rijen met artikelcode, naam, prijs, breedte en energielabel
- Klikken selecteert direct (highlight) en vult het rechterpaneel

**Stap 3: Filters bovenaan het linkerpaneel**
- Zoekbalk bovenaan
- Categorie-buttons + breedte-filter op één regel eronder
- Leverancier-toggle als subtiele checkbox

**Stap 4: Rechterpaneel altijd zichtbaar**
- Toon het formulier altijd, maar disabled/placeholder wanneer geen product geselecteerd
- Geselecteerd product bovenaan als compacte kaart met naam + artikelcode
- Daaronder: prijs, aantal, afmetingen, extra omschrijving in een compact grid
- Prijstype-toggle en override als accordion/collapsible voor gevorderde opties

**Stap 5: Vrije regel tab behouden**
- De "Vrije regel" tab blijft hetzelfde maar profiteert van de bredere dialoog
- Velden in een beter grid (2 kolommen i.p.v. 5)

### Bestanden
- `src/components/quotes/AddProductDialog.tsx` — volledige UI-herstructurering

