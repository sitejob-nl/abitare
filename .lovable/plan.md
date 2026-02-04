
# Communicatie Tab voor Klantdetailpagina

## Overzicht

Toevoegen van een nieuwe "Communicatie" tab op de klantdetailpagina waar je:
1. Je emailgeschiedenis met die specifieke klant ziet (gefilterd op het email-adres van de klant)
2. Direct een email kan sturen naar de klant
3. Een bestand (zoals een offerte PDF) als bijlage kan meesturen

## Architectuur

```text
CustomerDetail.tsx
├── Tabs: Offertes | Orders | Communicatie (nieuw)
│   └── CustomerCommunicationTab (nieuw component)
│       ├── Email Lijst (gefilterd op klant email)
│       ├── Email Detail View
│       ├── Compose Dialog met bijlagen
│       └── Quote Selector voor PDF bijlage
```

## Implementatie Stappen

### Stap 1: Nieuwe Hook voor Klant-specifieke Emails

Maak `src/hooks/useCustomerEmails.ts`:

- Zoekt in Microsoft emails op het email-adres van de klant
- Filtert zowel verzonden als ontvangen berichten
- Gebruikt de Graph API search functionaliteit: `$search="from:{email} OR to:{email}"`

### Stap 2: Uitbreiden Email Verzend Functionaliteit

Werk `src/hooks/useMicrosoftMail.ts` bij:

- Voeg ondersteuning toe voor bijlagen via `attachments` array
- Gebruik Microsoft Graph API fileAttachment type:
```typescript
{
  '@odata.type': '#microsoft.graph.fileAttachment',
  name: 'Offerte_123.pdf',
  contentType: 'application/pdf',
  contentBytes: 'base64EncodedPdfContent'
}
```

### Stap 3: PDF naar Base64 Helper

Maak `src/lib/pdfToBase64.ts`:

- Functie om de bestaande `generateQuotePdf` aan te passen zodat het een base64 string teruggeeft i.p.v. direct downloaden
- Nieuwe functie `generateQuotePdfBase64()` die de PDF als base64 data URL retourneert

### Stap 4: CustomerCommunicationTab Component

Maak `src/components/customers/CustomerCommunicationTab.tsx`:

- Email lijst gefilterd op klant email (van/aan)
- Email detail weergave (hergebruik design van Inbox)
- "Nieuwe email" knop met pre-filled ontvanger (klant email)
- Compose dialog met:
  - Aan veld (pre-filled met klant email)
  - Onderwerp
  - Bericht
  - Bijlagen sectie met:
    - Dropdown om offerte te selecteren uit klant's offertes
    - "Genereer PDF" knop om offerte toe te voegen
    - Lijst van toegevoegde bijlagen

### Stap 5: Update CustomerDetail.tsx

- Importeer nieuwe CustomerCommunicationTab component
- Voeg "Communicatie" tab toe aan de TabsList
- Toon badge met aantal ongelezen emails indien beschikbaar
- Check of Microsoft account gekoppeld is, zo niet toon connect prompt

## Component Structuur

### CustomerCommunicationTab

```text
┌─────────────────────────────────────────────────────┐
│ Communicatie                     [📧 Nieuwe Email]  │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────────┐ │
│ │ Email Lijst     │ │ Email Detail                │ │
│ │ (Mobile: full)  │ │ (Mobile: Sheet)             │ │
│ │                 │ │                             │ │
│ │ [Van: Klant]    │ │ Subject: Offerte 2024-001  │ │
│ │ Onderwerp...    │ │ Van: klant@email.nl        │ │
│ │ 2 feb 2024      │ │ Datum: 2 feb 2024          │ │
│ │                 │ │                             │ │
│ │ [Aan: Klant]    │ │ Beste heer/mevrouw,        │ │
│ │ Re: Offerte...  │ │ ...email inhoud...         │ │
│ │ 1 feb 2024      │ │                             │ │
│ └─────────────────┘ │           [↩ Beantwoorden]  │ │
│                     └─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Compose Dialog met Bijlagen

```text
┌─────────────────────────────────────────────────────┐
│ Nieuwe Email                                    [X] │
├─────────────────────────────────────────────────────┤
│ Aan: [klant@email.nl                           ]    │
│ Onderwerp: [                                   ]    │
│                                                     │
│ Bericht:                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Bijlagen:                                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Selecteer offerte ▼] [📎 Voeg PDF toe]         │ │
│ │                                                 │ │
│ │ • Offerte_2024-001_Klant.pdf         [🗑]       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                   [Annuleren] [📤 Verzenden]        │
└─────────────────────────────────────────────────────┘
```

## Technische Details

### Microsoft Graph API Search

Voor het zoeken naar emails met een specifiek email-adres:
```typescript
endpoint: `/me/messages?$search="from:${customerEmail} OR to:${customerEmail}"&$top=50&$orderby=receivedDateTime desc`
```

### Bijlage Structuur (Graph API)

```typescript
interface EmailAttachment {
  '@odata.type': '#microsoft.graph.fileAttachment';
  name: string;
  contentType: string;
  contentBytes: string; // base64 encoded
}
```

### Te Wijzigen Bestanden

| Bestand | Actie |
|---------|-------|
| `src/hooks/useCustomerEmails.ts` | Nieuw - Hook voor klant emails |
| `src/hooks/useMicrosoftMail.ts` | Update - Bijlagen ondersteuning |
| `src/lib/generateQuotePdf.ts` | Update - Base64 export optie |
| `src/components/customers/CustomerCommunicationTab.tsx` | Nieuw - Main component |
| `src/components/customers/ComposeEmailDialog.tsx` | Nieuw - Email compose met bijlagen |
| `src/pages/CustomerDetail.tsx` | Update - Tab toevoegen |

### Mobile Optimalisatie

- Op mobile: email lijst full-width, detail in Sheet (zoals Inbox)
- Compose dialog responsive met stacked layout op small screens
- Touch-friendly quote selector dropdown
