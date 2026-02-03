
# Plan: Gebruikers, Vestigingen en Facturen Beheer

## Probleemanalyse

Na onderzoek van de codebase en database heb ik de volgende ontbrekende functionaliteit geïdentificeerd:

### 1. Vestigingen (Divisions)
- **Huidige situatie**: Er bestaan al 2 vestigingen in de database (Roermond en Maastricht)
- **Probleem**: De knop "Nieuwe vestiging" op de Settings pagina doet niets - er is geen dialog of mutation om vestigingen toe te voegen/bewerken

### 2. Gebruikers (Users/Profiles)
- **Huidige situatie**: Er is 1 admin gebruiker aanwezig
- **Probleem**: De knop "Nieuwe gebruiker" doet niets - er is geen functionaliteit om:
  - Nieuwe gebruikers uit te nodigen
  - Gebruikers aan vestigingen te koppelen
  - Rollen toe te wijzen

### 3. Facturen (Invoices)
- **Huidige situatie**: Facturen worden afgeleid van orders (`useInvoices` query)
- **Probleem**: Er is geen "facturen aanmaken" functie omdat facturen automatisch ontstaan wanneer een offerte wordt omgezet naar een order - maar die "Offerte → Order" conversie ontbreekt

---

## Oplossingsplan

### Fase 1: Vestigingen Beheer

**Nieuwe componenten:**
- `DivisionFormDialog.tsx` - Dialog voor toevoegen/bewerken van vestigingen

**Uitbreiding bestaande code:**
- `useDivisions.ts` - Toevoegen van `useCreateDivision` en `useUpdateDivision` mutations
- `Settings.tsx` - Koppelen van dialogs aan de bestaande knoppen

**Functionaliteit:**
- Vestiging naam, code, adres, telefoon, email
- Actief/Inactief toggle
- RLS policies staan al correct ingesteld (alleen admin kan invoegen/wijzigen)

---

### Fase 2: Gebruikersbeheer

**Nieuwe componenten:**
- `UserFormDialog.tsx` - Dialog voor uitnodigen/bewerken van gebruikers
- `UserRoleSelect.tsx` - Component voor rol-selectie

**Uitbreiding bestaande code:**
- Nieuw hook `useUsers.ts` met:
  - `useInviteUser()` - Invite via Supabase Admin API (edge function)
  - `useUpdateUser()` - Update profiel en rollen
  - `useDeactivateUser()` - Deactiveer gebruiker

**Edge Function:**
- `invite-user/index.ts` - Server-side gebruiker uitnodiging (vereist service role key)

**Functionaliteit:**
- Gebruiker uitnodigen via email
- Vestiging toewijzen
- Rol(len) toewijzen (admin, manager, verkoper, monteur)
- Actief/Inactief toggle

---

### Fase 3: Offerte naar Order Conversie

**Nieuwe componenten:**
- `ConvertToOrderDialog.tsx` - Bevestigingsdialog voor conversie

**Uitbreiding bestaande code:**
- Nieuw hook `useConvertQuoteToOrder.ts` met logica:
  1. Maak nieuwe order aan met data van offerte
  2. Kopieer alle offerte-regels naar order-regels
  3. Update offerte status naar "geaccepteerd"
  4. Navigeer naar nieuwe order

- `QuoteActions.tsx` - Voeg "Omzetten naar order" knop toe

**Workflow:**
```
Offerte (status: geaccepteerd)
       ↓
[Omzetten naar order]
       ↓
Order wordt aangemaakt
       ↓
Order verschijnt in Facturen overzicht
```

---

## Technische Details

### Database - Geen wijzigingen nodig
Alle benodigde tabellen en RLS policies bestaan al:
- `divisions` - Vestigingen met INSERT/UPDATE voor admin
- `profiles` - Gebruikersprofielen met INSERT/UPDATE policies
- `user_roles` - Rollen met admin-only policies
- `orders` - Orders met correcte division-based policies

### Nieuwe Edge Function: `invite-user`

Nodig voor het aanmaken van gebruikers via Supabase Auth Admin API:

```text
POST /invite-user
Body: {
  email: string,
  full_name: string,
  division_id: string,
  roles: ["verkoper" | "manager" | "monteur"]
}

Response: {
  success: boolean,
  user_id: string
}
```

De functie:
1. Roept `supabase.auth.admin.createUser()` aan
2. Update het profiel met division_id
3. Voegt de gewenste rollen toe aan user_roles
4. Stuurt uitnodigingsmail (optioneel)

### Quote naar Order Conversie Logica

```text
Input: quote_id

1. Haal offerte op met alle secties en regels
2. Maak order aan:
   - customer_id: van offerte
   - division_id: van offerte
   - quote_id: link naar originele offerte
   - order_date: vandaag
   - status: "nieuw"
   - payment_status: "open"
   - Kopieer bedragen (subtotal, totals, etc.)

3. Kopieer quote_lines naar order_lines:
   - Behoud section_type, group_title
   - Kopieer alle prijzen en configuraties

4. Update offerte status naar "geaccepteerd"

5. Return nieuwe order_id
```

---

## Bestandsoverzicht

### Nieuwe bestanden:

| Bestand | Type | Doel |
|---------|------|------|
| `src/components/settings/DivisionFormDialog.tsx` | Component | Vestiging aanmaken/bewerken |
| `src/components/settings/UserFormDialog.tsx` | Component | Gebruiker uitnodigen/bewerken |
| `src/components/settings/UserRoleSelect.tsx` | Component | Rol-selectie component |
| `src/components/quotes/ConvertToOrderDialog.tsx` | Component | Bevestiging voor conversie |
| `src/hooks/useUsers.ts` | Hook | User management mutations |
| `src/hooks/useConvertQuoteToOrder.ts` | Hook | Quote → Order conversie |
| `supabase/functions/invite-user/index.ts` | Edge Function | User invitation via admin API |

### Bestaande bestanden te wijzigen:

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useDivisions.ts` | Toevoegen create/update mutations |
| `src/pages/Settings.tsx` | Integreren dialogs en acties |
| `src/components/quotes/QuoteActions.tsx` | Toevoegen "Omzetten naar order" knop |
| `supabase/config.toml` | Registreren invite-user function |

---

## Verwacht Resultaat

Na implementatie kan de admin:

1. **Vestigingen beheren**
   - Nieuwe vestiging toevoegen via dialog
   - Bestaande vestigingen bewerken
   - Vestigingen (de)activeren

2. **Gebruikers beheren**
   - Nieuwe gebruiker uitnodigen via email
   - Gebruiker aan vestiging koppelen
   - Rollen toewijzen/wijzigen
   - Gebruikers deactiveren

3. **Orders/Facturen aanmaken**
   - Geaccepteerde offerte omzetten naar order
   - Order verschijnt automatisch in Facturen overzicht
   - Synchronisatie naar Exact Online werkt op basis van orders
