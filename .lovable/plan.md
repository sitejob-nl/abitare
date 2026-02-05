

# Plan: Offerte PDF Template Restylen naar Orderbevestiging Opmaak

## Overzicht

De huidige offerte PDF wordt gegenereerd met een eenvoudige opmaak. De nieuwe template volgt de stijl van het orderbevestiging-sjabloon met:
- Klantgegevens links, bedrijfsgegevens rechts
- Gedetailleerde order-informatie in een grid
- Sectieheaders met grijze achtergrond en zwarte rand links
- Specificatie-tabellen per sectie (model, frontnummer, kleur, etc.)
- Product-tabellen met kolommen: no, code, omschrijving, hg, br, aantal, bedrag
- Sub-items met ingesprongen stijl
- Totalen-sectie
- Voorwaarden en handtekeningen

---

## Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/generateQuotePdf.ts` | Volledige restyling naar orderbevestiging opmaak |
| `src/lib/generateQuotePdfBase64.ts` | Zelfde wijzigingen als generateQuotePdf.ts |

---

## Nieuwe PDF Structuur

### 1. Header Sectie
- **Links**: Klantadres (aanhef, straat, postcode plaats)
- **Rechts**: Abitare logo + bedrijfsgegevens (adres, telefoon, email, BTW, IBAN, KvK)

### 2. Documenttitel
- "Offerte" met dikke zwarte lijn eronder (in plaats van "Orderbevestiging")

### 3. Offerte Details Grid
Twee kolommen met informatie:
- Offertenummer
- Datum offerte
- Datum afdruk
- Geldig tot
- Adviseur (indien beschikbaar)
- Telefoon klant
- Email klant

### 4. Intro Tekst
Aangepaste tekst voor offertes in plaats van orderbevestiging.

### 5. Secties (Meubelen, Apparatuur, Werkbladen, etc.)

**Sectie Header**:
```
┌────────────────────────────────────────┐
│█ Meubelen                              │ (grijze achtergrond, zwarte rand links)
└────────────────────────────────────────┘
```

**Specificatie Tabel** (indien van toepassing):
```
Model: [waarde]           Plintkleur: [waarde]
Frontnummer: [waarde]     Kolomkast hoogte: [waarde]
Kleur front: [waarde]     Scharnier kleur: [waarde]
...
```

**Product Tabel**:
```
┌────┬──────────┬─────────────────────────┬────┬────┬───────┬─────────┐
│ no │ code     │ omschrijving            │ hg │ br │ aantal│ bedrag  │
├────┼──────────┼─────────────────────────┼────┼────┼───────┼─────────┤
│ 1  │ ART001   │ Onderkast 60cm          │ 85 │ 60 │   1   │ € 450,00│
│ .1 │          │   - Lade systeem        │    │    │   1   │ € 50,00 │
│ .2 │          │   - Soft-close          │    │    │   1   │ € 25,00 │
└────┴──────────┴─────────────────────────┴────┴────┴───────┴─────────┘
```

### 6. Totalen Sectie
```
────────────────────────────────────────────────
Subtotaal producten:              € 15.250,00
Subtotaal montage:                €  1.500,00
Korting:                         -€    500,00
────────────────────────────────────────────────
Subtotaal excl. BTW:              € 16.250,00
BTW 21%:                          €  3.412,50
════════════════════════════════════════════════
Totaal incl. BTW:                 € 19.662,50
```

### 7. Betalingsvoorwaarden
Sectie met betalingsvoorwaarden uit de offerte.

### 8. Algemene Voorwaarden
Verkorte versie van leveringsvoorwaarden.

### 9. Footer
- Akkoord handtekeningen (Abitare en klant)
- Pagina nummering
- Afsluiting

---

## Technische Implementatie

### Styling Constanten
```typescript
// Kleuren (aangepast naar de template)
const sectionHeaderBg: RGB = [240, 240, 240];  // Lichtgrijs
const sectionHeaderBorder: RGB = [51, 51, 51]; // Donkergrijs/zwart
const tableHeaderBg: RGB = [245, 245, 245];    // Lichtgrijs
const textColor: RGB = [51, 51, 51];           // Donkergrijs
const subItemColor: RGB = [102, 102, 102];     // Grijs voor sub-items

// Fonts
const fontFamily = "helvetica"; // Dichtstbijzijnde aan Arial in jsPDF
const baseFontSize = 10;        // 10pt basis
const smallFontSize = 9;        // 9pt voor tabellen
const tinyFontSize = 8;         // 8pt voor sub-items en details
```

### Nieuwe Helper Functies
```typescript
// Sectie header met grijze achtergrond en zwarte rand links
function drawSectionHeader(doc: jsPDF, title: string, y: number): number

// Specificatie tabel in 2x2 grid formaat
function drawSpecsTable(doc: jsPDF, section: QuoteSection, y: number): number

// Product tabel met sub-items ondersteuning
function drawProductTable(doc: jsPDF, lines: QuoteLine[], y: number): number

// Totalen sectie
function drawTotalsSection(doc: jsPDF, totals: TotalsData, y: number): number

// Voorwaarden en handtekeningen
function drawTermsAndSignatures(doc: jsPDF, y: number): number
```

### Data Interface Uitbreiding
```typescript
interface QuoteData {
  // Bestaande velden...
  
  // Nieuwe optionele velden voor extra details
  advisor_name?: string;
  delivery_week?: string;
  commission_reference?: string;
}
```

---

## Vergelijking Oud vs Nieuw

| Element | Huidige PDF | Nieuwe PDF |
|---------|-------------|------------|
| Header | Donkerblauwe balk met witte tekst | Klant links, bedrijfsinfo rechts |
| Kleur schema | Blauw/goud | Grijs/wit/zwart |
| Sectie headers | Gouden balk | Grijze balk met zwarte rand links |
| Specificaties | Inline tekst | 2x2 grid tabel |
| Sub-items | Grijze tekst | Ingesprongen + punt-nummering |
| Totalen | Box rechtsonder | Volle breedte met lijnen |
| Voorwaarden | Eén regel | Meerdere paragrafen |
| Handtekeningen | Geen | Twee kolommen |

---

## Resultaat

Na deze wijziging zal de offerte PDF:
- Professionele uitstraling hebben consistent met orderbevestigingen
- Alle sectie-configuraties tonen in overzichtelijk grid-formaat
- Sub-regels correct inspringen met punt-nummering
- Volledige voorwaarden en handtekeningvakken bevatten
- Pagina-nummering ondersteunen bij meerdere pagina's

