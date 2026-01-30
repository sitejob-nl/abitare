
# UI-Database Koppeling - Analyse & Implementatieplan

## Huidige Status: Fase 1 Voltooid ✅

### Geïmplementeerd:
- ✅ Database trigger `on_auth_user_created` voor automatisch profiel aanmaken
- ✅ AuthContext met sessie management en rol-ondersteuning
- ✅ Login pagina met email/wachtwoord authenticatie
- ✅ ProtectedRoute component voor beveiligde pagina's
- ✅ Sidebar toont ingelogde gebruiker (naam, initialen, rol)

| Component | Status | Probleem |
|-----------|--------|----------|
| `Customers.tsx` | Hardcoded array (regel 27-88) | 5 fake klanten in JavaScript |
| `RecentOrders.tsx` | Hardcoded array (regel 11-33) | 3 fake orders |
| `ActionList.tsx` | Hardcoded array (regel 11-40) | 4 fake actiepunten |
| `AgendaToday.tsx` | Hardcoded array | 4 fake agenda items |
| `ServiceBudget.tsx` | Hardcoded values | Fake budget cijfers |
| `StatCard.tsx` | Props met hardcoded waarden | Dashboard stats zijn fake |
| `Sidebar.tsx` | Hardcoded "Roermond" (regel 71) | Geen echte vestigingen |

**De Supabase client is wel correct geconfigureerd**, maar wordt nergens gebruikt in de applicatie.

---

## Wat Moet Gebeuren

### Blokkerende Factor: Authenticatie

Voordat de UI kan koppelen aan de database, moet **authenticatie** geïmplementeerd worden. Dit is noodzakelijk omdat:

1. **RLS Policies** - Alle tabellen hebben Row Level Security die `auth.uid()` gebruikt
2. **Vestiging-isolatie** - Data filtering is gebaseerd op de ingelogde gebruiker
3. **Rol-gebaseerde toegang** - Functionaliteit verschilt per gebruikersrol

Zonder authenticatie retourneren alle queries **lege resultaten** vanwege de RLS policies.

---

## Implementatieplan in 3 Fasen

### Fase 1: Authenticatie Systeem
- Login pagina met email/wachtwoord
- Registratie pagina (optioneel, kan admin-only zijn)
- Auth context provider voor sessie management
- Protected routes wrapper
- Automatisch profiel aanmaken bij registratie via database trigger

### Fase 2: Data Hooks & Providers
- Custom React hooks voor database operaties:
  - `useCustomers()` - CRUD voor klanten
  - `useOrders()` - Orders ophalen met filters
  - `useQuotes()` - Offertes beheren
  - `useDivisions()` - Vestigingen laden
  - `useCurrentUser()` - Gebruikersprofiel en rol
- TanStack Query integratie voor caching en real-time updates
- Loading states en error handling

### Fase 3: UI Componenten Koppelen
**Sidebar:**
- Vestigingen dynamisch laden uit `divisions` tabel
- Gebruiker info uit `profiles` tabel
- Rol weergeven uit `user_roles` tabel

**Dashboard:**
- Stats ophalen via aggregate queries (COUNT, SUM)
- Recente orders uit `orders` tabel met customer join
- Agenda items (vereist nog een `appointments` tabel of view)
- Service budget uit `service_budgets` tabel

**Klanten pagina:**
- Alle klanten ophalen met TanStack Query
- Zoeken, filteren op vestiging en status
- Klant toevoegen/bewerken formulieren
- Initialen genereren uit naam

---

## Technische Aanpak

### Auth Flow
```text
App Start
    │
    ▼
┌─────────────┐
│ Check Auth  │
└──────┬──────┘
       │
   Logged in?
       │
  No ──┴── Yes
   │        │
   ▼        ▼
┌──────┐  ┌──────────┐
│Login │  │ Laad     │
│Page  │  │ Profile  │
└──────┘  │ + Roles  │
          └────┬─────┘
               │
               ▼
         ┌───────────┐
         │ Dashboard │
         └───────────┘
```

### Data Hook Voorbeeld (useCustomers)
De hook zal:
- `useQuery` gebruiken voor data fetching
- Filters accepteren (division_id, search, status)
- Automatisch herladen bij wijzigingen
- Loading en error states teruggeven

---

## Vereiste Database Wijzigingen

1. **Trigger voor profile aanmaken** - Bij nieuwe auth.user automatisch profiel record maken
2. **Seed data** - Initiële vestigingen, categorieën en admin gebruiker toevoegen
3. **Dashboard views** (optioneel) - Voor efficiënte aggregate queries

---

## Aanbevolen Volgorde

1. **Eerst**: Authenticatie implementeren met login pagina
2. **Dan**: Seed data toevoegen (vestigingen, admin user)
3. **Daarna**: Klanten pagina koppelen aan database
4. **Vervolgens**: Dashboard componenten koppelen
5. **Tot slot**: Overige pagina's (Offertes, Orders, etc.)

---

## Samenvatting

| Onderdeel | Actie |
|-----------|-------|
| Supabase Client | Correct geconfigureerd |
| Database Schema | Volledig aanwezig (22 tabellen) |
| RLS Policies | Actief en werkend |
| TypeScript Types | Automatisch gegenereerd |
| **UI Koppeling** | **NIET AANWEZIG - moet gebouwd worden** |
| **Authenticatie** | **NIET AANWEZIG - is vereist voor UI koppeling** |

Wil je dat ik begin met **Fase 1: Authenticatie** implementeren?
