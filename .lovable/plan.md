
# Plan: Klant-gecentreerd Offertes Overzicht

## Probleemanalyse

Uit de codebase-analyse blijkt dat:

1. **Geen klantdetailpagina bestaat** - Er is geen route `/customers/:id` waar alle offertes van een klant zichtbaar zijn
2. **Nieuwe offertes beginnen "leeg"** - Bij het aanmaken van een offerte moet je telkens zoeken naar een klant
3. **Geen overzicht van klanthistorie** - Je kunt niet snel zien welke offertes al voor een klant gemaakt zijn
4. **Dupliceren werkt wel** - Er is al een `useDuplicateQuote` hook, maar je kunt niet snel een "variatie" van een bestaande offerte maken

---

## Oplossingsplan

### 1. Klantdetailpagina

Een nieuwe pagina `/customers/:id` met:
- Klantgegevens (contactinfo, adres)
- **Tabs** voor overzicht:
  - Offertes (met statusbadges)
  - Orders (indien omgezet)
  - Notities/historie

**Quick actions op deze pagina:**
- "Nieuwe offerte voor deze klant" (pre-filled customer)
- "Kopieer offerte" vanuit de lijst

### 2. Verbeterde Klantentabel

Maak de klantrijen klikbaar:
- Klik → Navigeer naar klantdetail
- Voeg kolom toe: "Laatste offerte" of "Aantal offertes"

### 3. Snelle Offerte-aanmaak vanuit Klant

Twee manieren om snel een offerte te maken:

**a) Vanuit klantdetailpagina:**
- Button "Nieuwe offerte" opent dialog met klant al geselecteerd
- Extra optie: "Kopieer bestaande offerte" dropdown

**b) Vanuit offerteoverzicht:**
- "Snel dupliceren" knop per offerte
- "Nieuwe versie" voor variant-offertes

### 4. Pre-filled QuoteFormDialog

Pas de `QuoteFormDialog` aan om een `customerId` prop te accepteren:
- Indien meegegeven → klant automatisch geselecteerd
- Snellere workflow vanaf klantpagina

---

## Nieuwe Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `src/pages/CustomerDetail.tsx` | Klantdetailpagina met tabs |
| `src/components/customers/CustomerQuotesTab.tsx` | Offertes-tab component |
| `src/components/customers/CustomerOrdersTab.tsx` | Orders-tab component |
| `src/components/customers/CustomerInfoCard.tsx` | Klantinfo kaart |
| `src/hooks/useCustomerQuotes.ts` | Hook voor offertes per klant |
| `src/hooks/useCustomerOrders.ts` | Hook voor orders per klant |

---

## Bestaande Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Route toevoegen: `/customers/:id` |
| `src/pages/Customers.tsx` | Rijen klikbaar maken → navigatie |
| `src/components/quotes/QuoteFormDialog.tsx` | Prop `customerId` toevoegen voor pre-fill |

---

## Technische Details

### Nieuwe Hook: `useCustomerQuotes`

```text
useCustomerQuotes(customerId: string)

Query:
  SELECT * FROM quotes
  WHERE customer_id = $customerId
  ORDER BY created_at DESC
  
Returns: Quote[] met status, bedrag, datum
```

### CustomerDetail Page Structuur

```text
┌─────────────────────────────────────────────────┐
│  ← Terug    Klant #1234 - Van der Berg         │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌───────────────────┐ │
│ │ Contactgegevens     │  │ Actions           │ │
│ │ - Email             │  │ [+ Nieuwe offerte]│ │
│ │ - Telefoon          │  │ [Bewerken]        │ │
│ │ - Adres             │  │                   │ │
│ └─────────────────────┘  └───────────────────┘ │
├─────────────────────────────────────────────────┤
│  [Offertes (3)]  [Orders (1)]  [Notities]      │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ #2024-042  │  Concept   │  €12.450  │ → │   │
│  │ #2024-038  │  Verstuurd │  €8.200   │ → │   │
│  │ #2024-021  │  Accepted  │  €15.800  │ → │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [+ Kopieer #2024-042 als nieuwe offerte]      │
└─────────────────────────────────────────────────┘
```

### QuoteFormDialog met Pre-fill

Wijziging in props:
```text
interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;  // NIEUW: pre-fill klant
}
```

Gedrag:
- Als `customerId` is meegegeven:
  - Klant-selector is disabled en toont geselecteerde klant
  - Focus gaat direct naar geldig-tot datum

---

## Verwacht Resultaat

Na implementatie kan een verkoper:

1. **Vanuit klantenoverzicht:**
   - Klikken op klant → opent klantdetail
   - Direct alle offertes en orders zien

2. **Vanuit klantdetail:**
   - "Nieuwe offerte" → dialog met klant al ingevuld
   - "Kopieer offerte" → dupliceert bestaande offerte

3. **Betere navigatie:**
   - Snel schakelen tussen offertes van dezelfde klant
   - Overzicht van klanthistorie op één plek

4. **Workflow versnelling:**
   - Minder klikken voor nieuwe offerte
   - Variaties maken door dupliceren
