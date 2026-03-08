

## Gevonden verbeteringen en inconsistenties

Na een grondige audit van de codebase heb ik de volgende problemen gevonden, gecategoriseerd op ernst.

---

### 1. Dubbel toast-systeem (inconsistentie)

De app gebruikt **twee verschillende toast-systemen door elkaar**:
- `toast` van `sonner` (17 bestanden)
- `toast`/`useToast` van `@/hooks/use-toast` (44+ bestanden)

Dit leidt tot inconsistente UX: sonner-toasts verschijnen rechtsonder, shadcn-toasts rechtsboven. Beide Toaster-componenten zijn gemount in `App.tsx`.

**Fix:** Kies een van de twee en migreer alle imports naar een systeem. Sonner is moderner en eenvoudiger.

---

### 2. `formatCurrency` gedupliceerd in 10+ bestanden

Dezelfde `formatCurrency` functie staat lokaal gedefinieerd in minstens 10 bestanden (`OrderDetail.tsx`, `Dashboard.tsx`, `Products.tsx`, `OrderKanbanCard.tsx`, `QuoteSectionCard.tsx`, etc.), telkens met subtiel andere defaults (sommige zonder decimalen, sommige met `€ -`, sommige met `€ 0,00`).

**Fix:** Maak een enkele `formatCurrency` utility in `src/lib/utils.ts` met optionele parameters voor decimalen, en importeer overal.

---

### 3. Excessief `as any` gebruik (type safety)

**337 `as any` casts** in pagina-bestanden alleen al. Belangrijkste voorbeelden:
- `OrderDetail.tsx`: `order.customer as any`, `(order as any).order_documents`, `(order as any).installation_street_address` — deze velden bestaan op het type maar worden niet correct getypt door de Supabase query.
- `QuoteDetail.tsx`, `Installation.tsx`, `PriceGroups.tsx`: zelfde patroon.

**Fix:** Verbeter de Supabase query types door expliciete return types te definiëren of de select-queries te matchen met het verwachte type.

---

### 4. Order status gate wordt niet meegegeven bij status change

In `OrderDetail.tsx` regel 76: `handleStatusChange` roept `updateStatus.mutateAsync` aan **zonder** `gateContext` mee te geven. De gate-validatie in `useUpdateOrderStatus` controleert alleen `if (gateContext)`, dus zonder context wordt de gate volledig overgeslagen. De gates werken alleen visueel (disabled items in de dropdown) maar zijn **niet server-side afgedwongen**.

**Fix:** Stuur de `gateContext` mee bij `updateStatus.mutateAsync`:
```typescript
await updateStatus.mutateAsync({
  orderId: id,
  status: newStatus,
  gateContext: { /* same context as passed to OrderStatusSelect */ }
});
```

---

### 5. Kanban drag-and-drop bypassed order gates

In `OrderKanbanBoard.tsx` wordt `toast` van `sonner` gebruikt en `validateStatusTransition` aangeroepen, maar de gate-context die meegegeven wordt bevat **geen** `checklistComplete`, `hasInstallationAddress`, of `hasDocuments` — deze velden worden niet opgehaald in de orders query. Hierdoor kunnen orders via drag-and-drop naar statussen verplaatst worden die geblokkeerd zouden moeten zijn.

**Fix:** Haal de benodigde gate-context velden op in de kanban query, of block drag naar gate-beveiligde statussen.

---

### 6. Test-migratiebestand met hardcoded UUIDs

Het bestand `supabase/migrations/20260308084820_...sql` bevat hardcoded order UUIDs en test-data mutaties. Dit is een migratie die op elke omgeving draait en zal falen of ongewenst gedrag veroorzaken op productie.

**Fix:** Verwijder dit migratiebestand of verplaats naar een seed-script.

---

### 7. `useRealtimeSync` luistert op `schema: "public"` zonder tabelfilter

De realtime subscription in `useRealtimeSync.ts` luistert op **alle** `postgres_changes` in het `public` schema. Dit genereert veel onnodig verkeer voor tabellen die niet in `TABLE_QUERY_MAP` staan.

**Fix:** Maak per tabel een aparte `.on()` call of gebruik een filter op tabelnaam.

---

### 8. Login redirect na inloggen werkt niet voor monteurs

In `Login.tsx` navigeert de app na inloggen naar `from` (default `/`). Maar `ProtectedRoute` redirect monteurs direct naar `/monteur`. Dit veroorzaakt een dubbele navigatie: login → `/` → redirect naar `/monteur`.

**Fix:** Controleer de rollen direct na login en navigeer monteurs rechtstreeks naar `/monteur`.

---

### 9. `activeDivisionId` niet gepersisteerd

Wanneer een admin een vestiging selecteert in de sidebar, wordt `activeDivisionId` opgeslagen in React state. Na een pagina-refresh gaat de selectie verloren en valt het terug op het profiel-default.

**Fix:** Persist `activeDivisionId` in `localStorage`.

---

### 10. `useOrders` heeft geen `staleTime`

De `useOrders` hook (de meest gebruikte orders query) heeft geen expliciete `staleTime`, waardoor het terugvalt op de default van 30 seconden. De `useQuotes` hook heeft 5 minuten. Dit is inconsistent.

---

### Samenvatting prioriteiten

| # | Issue | Ernst | Inspanning |
|---|-------|-------|------------|
| 4 | Order gates niet server-side afgedwongen | Hoog | Klein |
| 5 | Kanban bypassed gates | Hoog | Middel |
| 6 | Test-migratie met hardcoded UUIDs | Hoog | Klein |
| 1 | Dubbel toast-systeem | Middel | Middel |
| 2 | `formatCurrency` duplicatie | Middel | Klein |
| 3 | `as any` overmatig gebruik | Middel | Groot |
| 7 | Realtime luistert op alles | Laag | Klein |
| 8 | Login redirect voor monteurs | Laag | Klein |
| 9 | Division niet gepersisteerd | Laag | Klein |
| 10 | Inconsistente staleTime | Laag | Klein |

