

# Plan: Offerte PDF Template Volledig Herschrijven naar Exacte Abitare Opmaak

## Probleemanalyse

De huidige PDF implementatie wijkt significant af van de originele Abitare template. Na analyse van de echte PDF (146931-ORDER-P) zijn dit de kritieke verschillen:

### Huidige Fouten vs. Origineel

| Element | Huidige PDF | Originele Abitare PDF |
|---------|-------------|----------------------|
| **Header rechts** | Verkeerde bedrijfsgegevens, geen logo | Abitare logo met exacte bedrijfsgegevens (Jacob Romenweg 5, Roermond/Geleen nummers) |
| **Referentie/datum** | Niet aanwezig op vervolgpagina's | Elke pagina toont "Referentie [nummer]" en datum linksboven |
| **Logo rechtsboven** | Niet op elke pagina | Abitare logo met tagline op ELKE pagina rechtsboven |
| **Details grid** | 4 velden, 2 kolommen | 12+ velden inclusief Afleveradres, Adviseur, Ontwerper, Kommissiegegevens, etc. |
| **Sectie headers** | Grijze achtergrond met zwarte rand | **Gecentreerde vetgedrukte titel met onderstreping**, geen grijze achtergrond |
| **Specificaties** | Als tabel | Als lopende tekst met labels in bold (Frontnummer: MPTS GL LB, etc.) in 2 kolommen |
| **Product tabellen** | Met celranden | **Alleen horizontale lijnen**, geen verticale celranden |
| **Groepskoppen** | Grijze achtergrond | **Vetgedrukte tekst zonder achtergrond** (bijv. "Kastenwand bestaande uit:") |
| **Sub-items** | Met .1, .2 nummering | Correcte .1, .2 nummering, **geen extra omlijning** |
| **Extra omschrijving** | Op zelfde regel | Op **nieuwe regel** onder de hoofdomschrijving, ingesprongen |
| **Bedragen kolom** | Toont bedragen | **Leeg** in de orderbevestiging (alleen totaal onderaan) |
| **Pagina footer** | Simpel | Italiaanse vlag iconen + "Pagina X van Y" rechtsonder |
| **Voorwaarden** | Verkort | Volledige voorwaarden met onderstreepte kopjes |
| **Handtekeningen** | Naast elkaar met lijn | Twee kolommen, "Akkoord directie:" en "Voor akkoord:" |

---

## Technische Wijzigingen

### Bestanden te wijzigen

| Bestand | Actie |
|---------|-------|
| `src/lib/pdf/quotePdfHelpers.ts` | Volledig herschrijven met correcte opmaak |
| `src/lib/pdf/quotePdfGenerator.ts` | Aanpassen aan nieuwe helper functies |

---

## Nieuwe Structuur per Pagina

### Pagina 1 - Header & Details

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                          [ABITARE LOGO]      │
│ De heer en mevrouw [Naam]                               Abitare B.V.        │
│ [Straat]                                                keuken en interieur │
│ [Postcode] [Plaats]                                     -meubelen-verlicht- │
│                                                         Jacob Romenweg 5     │
│                                                         6042 EZ Roermond     │
│                                                                              │
│                                                         Tel Roermond: ...    │
│                                                         Tel Geleen: ...      │
│                                                         Email: info@...      │
│                                                         www.italiaanse...    │
│                                                                              │
│                                                         BTW: NL...           │
│                                                         Bank: ING BANK N.V   │
│                                                         IBAN: NL09INGB...    │
│                                                         BIC: INGBNL2A        │
│                                                         KvK: 77721799        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Offerte                                                                      │
│ ════════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│ Offertenummer:      [nummer]              Afleveradres:                      │
│ Datum offerte:      [datum]               [Aanhef]                           │
│ Datum afdruk:       [datum]               [Straat]                           │
│ Adviseur:           [naam]                [Postcode Plaats]                  │
│ Telefoon klant:     [tel]                 Tel.: [tel]                        │
│ Email-adres:        [email]               Verdieping: [n]                    │
│ Geldig tot:         [datum]                                                  │
│                                                                              │
│ Geachte heer en mevrouw [Naam],                                              │
│                                                                              │
│ Hierbij ontvangt u onze offerte voor de levering van goederen volgens        │
│ onderstaande specificatie.                                                   │
│ Wij zullen uw opdracht met de grootst mogelijke zorg uitvoeren.              │
│                                                                              │
│                              Meubelen                                        │
│ ════════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│                                                      ═══════  ═══════        │
│                                               Pagina 1 van 8                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pagina 2+ - Product Tabellen

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Referentie [nummer]                                     [ABITARE LOGO]      │
│ [datum]                                                                      │
│                                                                              │
│ [Model beschrijving in vet]                                                  │
│ Frontnummer:    MPTS GL LB            Plintkleur:       Bronze               │
│ Kleur front:    Rovere Nodato         Kolomkast hoogte: 60 (plint) + 2340    │
│ Corpuskleur:    Rose                  Scharnier kleur:  Peltro               │
│ Greepnummer:    Greeploos + pushpull  Lade kleur:       Titanium             │
│ Kleur greep:    Bronze                Aanrecht hoogte:  100 plint + 810...   │
│                                       Blad dikte:       60                   │
│ ════════════════════════════════════════════════════════════════════════════ │
│ no   code          omschrijving                       hg    br  aantal bedrag│
│ ────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│      Kastenwand bestaande uit:                                               │
│                                                                              │
│ 1    CB00T00       Hoog passtuk                       234   10   1.32        │
│                    Passtuk hoge kast 132 x 2340mm                            │
│ 2    CD60T12 L     Hoge voorraadkast                  234   60   1           │
│ 3    CH60T00 L     Hoge kast t.b.v. inbouwapparaat    234   60   1           │
│ 4    CQ60T10 L     Hoge kast t.b.v. koelkast          234   60   1           │
│                    Front uit 1 stuk! tbv vriezer                             │
│                    Met greep in het front!                                   │
│ 5    ET234-59      Zijwandafdekpaneel hoge kast       234        1           │
│                    Uitvoering TS; Termo Strutturato                          │
│ 6    BE10H00-81    Onderkast met 2 uittrekladen       81   100   1           │
│                    1050mm                                                    │
│ .1   PUSHPULL-C    Meerprijs systeem openen fronten               1          │
│                    TBV ONDERSTE LADE                                         │
│ .2   PUSH50        Ladegeleidingsrail                             1          │
│                    TBV ONDERSTE LADE                                         │
│                                                                              │
│                                                      ═══════  ═══════        │
│                                               Pagina 2 van 8                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Kritieke Styling Aanpassingen

### 1. Header op Elke Pagina
- **Pagina 1**: Volledig klantadres links, bedrijfsgegevens rechts
- **Vervolgpagina's**: "Referentie [nummer]" + datum linksboven, logo rechtsboven

### 2. Sectie Headers
```typescript
// FOUT (huidige implementatie):
doc.setFillColor(240, 240, 240);
doc.rect(margin, yPos, width, 8, "F");

// CORRECT (nieuwe implementatie):
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text(title, pageWidth / 2, yPos, { align: "center" });
yPos += 2;
doc.setLineWidth(0.5);
doc.line(margin, yPos, pageWidth - margin, yPos);
```

### 3. Product Tabellen Zonder Verticale Lijnen
```typescript
autoTable(doc, {
  theme: 'plain', // Geen celranden
  styles: {
    lineWidth: 0,
  },
  headStyles: {
    lineWidth: { bottom: 0.3 },
  },
  // Alleen horizontale lijn onder header
});
```

### 4. Groepskoppen in Tabel
```typescript
// Als vetgedrukte rij zonder achtergrondkleur
tableBody.push([
  { content: "", styles: {} },
  { content: "", styles: {} },
  { content: "Kastenwand bestaande uit:", styles: { fontStyle: "bold" } },
  // ... lege cellen
]);
```

### 5. Extra Omschrijving op Nieuwe Regel
```typescript
// Omschrijving op regel 1, extra_description op regel 2 (ingesprongen)
const mainDesc = line.description;
// Extra omschrijving wordt als aparte subrij toegevoegd
if (line.extra_description) {
  tableBody.push([
    { content: "", styles: {} },
    { content: "", styles: {} },
    { content: line.extra_description, styles: { fontSize: 8 } },
    // ... lege cellen
  ]);
}
```

### 6. Bedragen Kolom Leeg (voor Offertes zonder prijzen)
```typescript
// Optie om bedragen te verbergen
const showPrices = quote.show_prices !== false;
// Als false, toon lege kolom
```

### 7. Footer met Italiaanse Vlag
```typescript
// Groene en rode balkjes onderaan elke pagina
doc.setFillColor(0, 140, 69); // Groen
doc.rect(margin + 60, pageHeight - 15, 15, 3, "F");
doc.setFillColor(205, 33, 42); // Rood  
doc.rect(margin + 77, pageHeight - 15, 15, 3, "F");
```

---

## Data Vereisten

Nieuwe velden die ondersteund moeten worden (optioneel):

```typescript
interface QuoteData {
  // Bestaande velden...
  
  // Extra velden voor volledig template
  advisor_name?: string;           // Adviseur
  designer_name?: string;          // Ontwerp(st)er
  commission_reference?: string;   // Kommissiegegevens / Uw kommissie
  delivery_week?: string;          // Gepl. leverweek
  
  // Afleveradres (kan anders zijn dan factuuradres)
  delivery_address?: {
    salutation?: string;
    street_address?: string;
    postal_code?: string;
    city?: string;
    phone?: string;
    floor?: number;
  };
  
  // Opties
  show_prices?: boolean;  // false = bedragen kolom leeg
}
```

---

## Resultaat

Na deze wijzigingen zal de offerte PDF:
- Exact de Abitare huisstijl volgen
- Logo en referentie op elke pagina tonen
- Gecentreerde sectie headers met onderstreping hebben
- Tabellen zonder verticale lijnen genereren
- Extra omschrijvingen correct op nieuwe regels plaatsen
- Sub-items met .1, .2 nummering correct weergeven
- Italiaanse vlag iconen in de footer tonen
- Volledig identiek zijn aan de orderbevestiging template

