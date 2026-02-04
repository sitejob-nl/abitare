
# Plan: Klant Formulier Uitbreiden + Klant Toevoegen vanuit Offerte

## Samenvatting

Twee verbeteringen aan het klantbeheer:
1. **Apart factuur- en bezorgadres** bij het aanmaken/bewerken van een klant
2. **Nieuwe klant aanmaken** direct vanuit het offerte-formulier

---

## Onderdeel 1: Gescheiden Factuur- en Bezorgadres

### Huidige situatie
De database heeft al velden voor een apart bezorgadres:
- `delivery_street_address`
- `delivery_postal_code`  
- `delivery_city`
- `delivery_floor`
- `delivery_has_elevator`

Deze worden alleen nog niet gebruikt in het klantformulier.

### Aanpassingen

**CustomerFormDialog.tsx:**
- Checkbox toevoegen: "Bezorgadres wijkt af van factuuradres"
- Bij aanvinken verschijnt een tweede adresblok voor bezorgadres
- Extra velden: verdieping en lift aanwezig (handig voor monteurs)

```text
┌─────────────────────────────────────────────────────┐
│ Factuuradres                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Straat + huisnummer: [____________________]    │ │
│ │ Postcode: [______]    Plaats: [____________]   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [✓] Bezorgadres wijkt af van factuuradres           │
│                                                     │
│ Bezorgadres                                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Straat + huisnummer: [____________________]    │ │
│ │ Postcode: [______]    Plaats: [____________]   │ │
│ │ Verdieping: [__]      [✓] Lift aanwezig        │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**CustomerInfoCard.tsx:**
- Beide adressen tonen indien verschillend
- Labels: "Factuuradres" en "Bezorgadres"

---

## Onderdeel 2: Klant Toevoegen vanuit Offerte

### Aanpassingen

**QuoteFormDialog.tsx:**
- Knop "+ Nieuwe klant" toevoegen naast de klant-zoekbalk
- Bij klik opent CustomerFormDialog als nested dialog
- Na succesvol aanmaken wordt de nieuwe klant automatisch geselecteerd

```text
┌─────────────────────────────────────────────────────┐
│ Klant *                                             │
│ [Zoek een klant...              ▼] [+ Nieuwe klant] │
└─────────────────────────────────────────────────────┘
```

**CustomerFormDialog.tsx:**
- Nieuwe prop: `onCustomerCreated?: (customer) => void`
- Na succesvol aanmaken wordt deze callback aangeroepen
- Maakt het mogelijk om de klant direct te selecteren in het offerte-formulier

---

## Technische Details

### Schema Uitbreiding (CustomerFormDialog)

```typescript
const customerSchema = z.object({
  // ... bestaande velden ...
  
  // Bezorgadres velden
  different_delivery_address: z.boolean().default(false),
  delivery_street_address: z.string().max(255).optional(),
  delivery_postal_code: z.string().max(10).optional(),
  delivery_city: z.string().max(100).optional(),
  delivery_floor: z.string().max(10).optional(),
  delivery_has_elevator: z.boolean().default(false),
});
```

### Te Wijzigen Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/customers/CustomerFormDialog.tsx` | Update - Bezorgadres velden + callback prop |
| `src/components/customers/CustomerInfoCard.tsx` | Update - Beide adressen tonen |
| `src/components/quotes/QuoteFormDialog.tsx` | Update - Nieuwe klant knop toevoegen |

### Geen Database Wijzigingen Nodig
Alle benodigde velden bestaan al in de `customers` tabel.
