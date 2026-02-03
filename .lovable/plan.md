
# Plan: Fix Vestigingen Functionaliteit

## Samenvatting Problemen

Er zijn 3 bugs geïdentificeerd die samen de vestigingen-functionaliteit verstoren:

1. **Klantdetail laadt niet** - Een database query fout blokkeert het laden van klantgegevens
2. **Verkeerde label in sidebar** - "Alle vestigingen" toont als "Maastricht"
3. **Cache niet geleegd bij wissel** - Oude data blijft hangen na het wisselen van vestiging

---

## Oplossingen

### Fix 1: Database Query Repareren

**Bestand:** `src/hooks/useCustomers.ts`

Het probleem zit in de self-referencing join op de `customers` tabel. Supabase PostgREST kan dit niet correct oplossen met de huidige syntax.

**Wijziging:**
- Verwijder de `referred_by` join uit de `useCustomer` hook
- Indien referral data nodig is, maak een aparte query

### Fix 2: Sidebar Division Display

**Bestand:** `src/components/layout/Sidebar.tsx`

De logica voor het tonen van de actieve divisie is incorrect:
- Als `activeDivisionId` = `null`, moet "Alle vestigingen" getoond worden
- Momenteel toont het de eerste divisie uit de lijst

**Wijziging:**
```
// OUD (fout)
const activeDivision = activeDivisionId 
  ? divisions?.find(d => d.id === activeDivisionId)
  : divisions?.[0];
const divisionName = activeDivision?.name || "Alle vestigingen";

// NIEUW (correct)
const divisionName = activeDivisionId 
  ? divisions?.find(d => d.id === activeDivisionId)?.name || "Onbekend"
  : "Alle vestigingen";
```

### Fix 3: Cache Invalidatie bij Division Wissel

**Bestand:** `src/contexts/AuthContext.tsx`

Bij het wisselen van divisie moet de React Query cache worden geleegd zodat nieuwe queries worden uitgevoerd.

**Wijziging:**
- Importeer `useQueryClient` in een wrapper component
- Roep `queryClient.clear()` aan wanneer `activeDivisionId` verandert
- Alternatief: gebruik een custom hook die cache invalideerd

---

## Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useCustomers.ts` | Verwijder self-referencing join |
| `src/components/layout/Sidebar.tsx` | Fix division name display logica |
| `src/contexts/AuthContext.tsx` | (Optioneel) Trigger cache invalidatie |

---

## Technische Details

### useCustomer Query Fix

Huidige (kapotte) query:
```
.select(`
  *,
  division:divisions(id, name),
  referred_by:customers!customers_referred_by_customer_id_fkey(id, first_name, last_name)
`)
```

Nieuwe (werkende) query:
```
.select(`
  *,
  division:divisions(id, name)
`)
```

De referral informatie kan indien nodig apart worden opgehaald met een tweede query.

### Sidebar Display Fix

De huidige code selecteert de eerste divisie als fallback wanneer geen specifieke divisie is geselecteerd. Dit moet worden aangepast zodat "Alle vestigingen" expliciet wordt getoond.

---

## Verwacht Resultaat

Na deze fixes:

1. Klantdetailpagina laadt correct
2. Sidebar toont "Alle vestigingen" wanneer geselecteerd
3. Data wordt correct gefilterd per geselecteerde vestiging
4. Wisselen tussen vestigingen toont direct de juiste data
