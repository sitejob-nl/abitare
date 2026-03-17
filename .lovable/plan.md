

## Plan: Alle resterende fixes

Er zijn 4 concrete taken over:

### 1. Laatste `formatCurrency` duplicaten verwijderen
Nog 4 bestanden met lokale `formatCurrency`:
- `src/pages/Orders.tsx` (regel 44-50)
- `src/pages/Products.tsx` (regel 30+)
- `src/components/orders/SupplierOrdersCard.tsx` (regel 75+)
- `src/components/quotes/EditableLineRow.tsx` (regel 39+)

Vervang door import uit `@/lib/utils`.

### 2. Kanban gate bypass fixen
`OrderKanbanBoard.tsx` geeft geen `checklistComplete`, `hasInstallationAddress`, of `hasDocuments` mee in de `gateContext`. De orders query in `useOrders` haalt deze velden niet op.

**Aanpak:** De Kanban board gebruikt de `useOrders` hook die een lijst-query is — het is niet praktisch om per order checklist-items en documenten op te halen. In plaats daarvan: **block drag naar gate-beveiligde statussen** (`controle`, `bestel_klaar`, `besteld`) in de Kanban. Toon een toast dat de gebruiker via de order detail pagina moet gaan voor deze statuswijzigingen. Dit is veiliger dan incomplete gate-validatie.

### 3. Login redirect voor monteurs fixen
In `Login.tsx` navigeert de app na login naar `from` (default `/`). `ProtectedRoute` redirect monteurs dan naar `/monteur` — dubbele navigatie.

**Fix:** Na succesvolle login, haal rollen op en navigeer monteurs direct naar `/monteur`.

### 4. Toaster component opruimen
`src/components/ui/toaster.tsx` is nu een no-op. Verwijder imports waar niet meer nodig, en zorg dat `src/components/ui/use-toast.ts` (re-export bestand) correct werkt.

---

### Technische details

**Kanban gate-statussen blokkeren:**
```typescript
const GATE_PROTECTED_STATUSES: OrderStatus[] = ["controle", "bestel_klaar", "besteld"];

// In handleDragEnd, vóór validateStatusTransition:
if (GATE_PROTECTED_STATUSES.includes(newStatus)) {
  toast.error("Open de order om deze status te wijzigen");
  return;
}
```

**Login monteur redirect:**
```typescript
// Na succesvolle login in Login.tsx:
const { data: rolesData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", session.user.id);

const isOnlyInstaller = rolesData?.some(r => r.role === "monteur") 
  && !rolesData?.some(r => r.role === "admin" || r.role === "manager");

navigate(isOnlyInstaller ? "/monteur" : from, { replace: true });
```

**Geschatte impact:** 6 bestanden gewijzigd, geen database wijzigingen.

