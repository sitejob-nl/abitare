
# Performance Verbetering & CRUD Functionaliteit

## Gevonden Problemen

### 1. Trage Laadtijden
De RLS policies roepen bij elke query meerdere functies aan (`is_admin()`, `get_user_division_id()`) die elk een aparte database query uitvoeren. Dit veroorzaakt trage laadtijden.

**Voorbeeld van huidige RLS op `customers`:**
```
is_admin(auth.uid()) OR 
division_id = get_user_division_id(auth.uid()) OR 
salesperson_id = auth.uid()
```

Elke keer als je klanten ophaalt worden er 2+ extra queries uitgevoerd per rij.

### 2. Gebruiker Niet Gekoppeld aan Vestiging
De huidige admin gebruiker (`demo@sitejob.nl`) heeft **geen `division_id`** in het profiel, waardoor de `get_user_division_id()` functie `NULL` retourneert.

### 3. Ontbrekende CRUD Functionaliteit
De "Nieuwe offerte" en "Nieuwe klant" knoppen doen momenteel niets.

---

## Oplossingsplan

### Stap 1: Database Optimalisaties

**1.1 Koppel admin aan vestiging**
```sql
UPDATE profiles 
SET division_id = '11111111-1111-1111-1111-111111111111' 
WHERE id = '94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9';
```

**1.2 Voeg indexes toe voor RLS performance**
```sql
CREATE INDEX IF NOT EXISTS idx_customers_division_id ON customers(division_id);
CREATE INDEX IF NOT EXISTS idx_customers_salesperson_id ON customers(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_quotes_division_id ON quotes(division_id);
CREATE INDEX IF NOT EXISTS idx_quotes_salesperson_id ON quotes(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_orders_division_id ON orders(division_id);
```

**1.3 Optimaliseer RLS helper functies met SECURITY DEFINER en caching**
De functies `is_admin()` en `get_user_division_id()` worden gemarkeerd als `STABLE` zodat PostgreSQL ze kan cachen binnen dezelfde query.

### Stap 2: Klant Aanmaken Modal

**Nieuwe bestanden:**
- `src/components/customers/CustomerFormDialog.tsx`

**Functionaliteit:**
- Modal/dialog voor nieuwe klant
- Formulier met verplichte velden: achternaam
- Optionele velden: voornaam, bedrijf, email, telefoon, stad
- Automatisch division_id en salesperson_id van huidige gebruiker
- Validatie met zod + react-hook-form
- Toast feedback bij succes/fout

**Aanpassing `Customers.tsx`:**
- "Nieuwe klant" knop opent de modal
- Na aanmaken wordt de lijst automatisch ververst

### Stap 3: Offerte Aanmaken

**Nieuwe bestanden:**
- `src/components/quotes/QuoteFormDialog.tsx`

**Functionaliteit:**
- Modal voor nieuwe offerte
- Klant selecteren uit bestaande klanten (combobox/search)
- Offerte geldig tot datum (default +30 dagen)
- Automatisch: division_id, salesperson_id, created_by, status = 'concept'
- Quote_number wordt automatisch gegenereerd door database

**Aanpassing `Quotes.tsx`:**
- "Nieuwe offerte" knop opent de modal
- Na aanmaken wordt de lijst ververst

### Stap 4: Query Optimalisaties

**Pagination toevoegen aan lijsten:**
De hooks krijgen een `limit` parameter en er komt infinite scroll of pagination.

```typescript
// useCustomers update
const { data: customers } = useCustomers({
  divisionId: filter,
  search: query,
  limit: 50, // Beperk eerste load
});
```

**staleTime en cacheTime configureren:**
```typescript
{
  staleTime: 5 * 60 * 1000, // 5 minuten
  cacheTime: 30 * 60 * 1000, // 30 minuten
}
```

---

## Technische Details

### CustomerFormDialog Component

```text
┌─────────────────────────────────────┐
│  Nieuwe klant                     X │
├─────────────────────────────────────┤
│  Type: ○ Particulier ○ Zakelijk     │
│                                     │
│  Aanhef:    [Dhr./Mevr. ▼]          │
│  Voornaam:  [                ]      │
│  Achternaam:[                ] *    │
│  Bedrijf:   [                ]      │
│                                     │
│  Email:     [                ]      │
│  Telefoon:  [                ]      │
│  Mobiel:    [                ]      │
│                                     │
│  Straat:    [                ]      │
│  Postcode:  [      ] Plaats: [    ] │
│                                     │
│  [ Annuleren ]        [ Opslaan ]   │
└─────────────────────────────────────┘
```

### QuoteFormDialog Component

```text
┌─────────────────────────────────────┐
│  Nieuwe offerte                   X │
├─────────────────────────────────────┤
│  Klant: *                           │
│  [Zoek klant...              ▼]     │
│                                     │
│  Geldig tot: [dd-mm-yyyy]           │
│                                     │
│  Notities:                          │
│  [                              ]   │
│  [                              ]   │
│                                     │
│  [ Annuleren ]        [ Aanmaken ]  │
└─────────────────────────────────────┘
```

### Bestandswijzigingen

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/xxx.sql` | Database fixes + indexes |
| `src/components/customers/CustomerFormDialog.tsx` | Nieuw |
| `src/components/quotes/QuoteFormDialog.tsx` | Nieuw |
| `src/pages/Customers.tsx` | Integreer dialog |
| `src/pages/Quotes.tsx` | Integreer dialog |
| `src/hooks/useCustomers.ts` | Voeg limit + staleTime toe |
| `src/hooks/useQuotes.ts` | Voeg limit + staleTime toe |

---

## Samenvatting

| Probleem | Oplossing |
|----------|-----------|
| Trage queries | Database indexes + optimalisatie |
| Gebruiker zonder vestiging | Admin koppelen aan Roermond |
| Geen offerte aanmaken | QuoteFormDialog component |
| Geen klant aanmaken | CustomerFormDialog component |
| Geen limiet op data | Pagination/limits toevoegen |
