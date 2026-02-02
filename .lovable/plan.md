# Abitare Keukens - Development Plan

## Status: Fase 1, 2 & 3 Voltooid ✅

### Geïmplementeerd:

#### Fase 1: Authenticatie ✅
- ✅ Database trigger `on_auth_user_created` voor automatisch profiel aanmaken
- ✅ AuthContext met sessie management en rol-ondersteuning
- ✅ Login pagina met email/wachtwoord authenticatie
- ✅ ProtectedRoute component voor beveiligde pagina's
- ✅ Sidebar toont ingelogde gebruiker (naam, initialen, rol)

#### Fase 2: Data Hooks ✅
- ✅ `useCustomers()` - CRUD voor klanten met zoeken en filteren
- ✅ `useOrders()` / `useRecentOrders()` - Orders ophalen met filters
- ✅ `useDivisions()` - Vestigingen laden
- ✅ `useServiceBudget()` - Service budget voor admin/manager

#### Fase 3: UI Gekoppeld ✅
- ✅ Customers.tsx - Klanten uit database met zoeken en vestiging filter
- ✅ RecentOrders.tsx - Recente orders uit database
- ✅ ServiceBudget.tsx - Dynamisch budget uit database
- ✅ Sidebar.tsx - Vestigingen dynamisch geladen

---

## Component Status

| Component | Status | Gekoppeld aan |
|-----------|--------|---------------|
| `Customers.tsx` | ✅ Database | `customers` tabel |
| `RecentOrders.tsx` | ✅ Database | `orders` tabel + customer join |
| `ServiceBudget.tsx` | ✅ Database | `service_budgets` tabel |
| `Sidebar.tsx` | ✅ Database | `divisions` + `profiles` tabel |
| `ActionList.tsx` | ⏳ Nog hardcoded | Moet nog gekoppeld |
| `AgendaToday.tsx` | ⏳ Nog hardcoded | Vereist appointments tabel |
| `StatCard.tsx` | ⏳ Hardcoded props | Dashboard aggregate queries |

---

## Hooks Overzicht

| Hook | Bestand | Functionaliteit |
|------|---------|-----------------|
| `useCustomers` | `src/hooks/useCustomers.ts` | CRUD + zoeken + filteren |
| `useOrders` | `src/hooks/useOrders.ts` | Orders ophalen met filters |
| `useDivisions` | `src/hooks/useDivisions.ts` | Vestigingen laden |
| `useServiceBudget` | `src/hooks/useServiceBudget.ts` | Budget per jaar |

---

## Volgende Stappen

1. **Seed data toevoegen** - Vestigingen, admin gebruiker, rollen
2. **Dashboard stats** - Aggregate queries voor echte statistieken
3. **Klant CRUD** - Modal voor toevoegen/bewerken klanten
4. **Offertes pagina** - Koppelen aan quotes tabel
5. **Orders pagina** - Koppelen aan orders tabel
