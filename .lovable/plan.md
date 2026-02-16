

# Plan: Sneller laden van het systeem

## Probleem

Het systeem heeft 18.400+ actieve producten. De productenpagina laadt ze **allemaal in een keer** zonder paginatie. Daarnaast worden alle 30+ pagina's **eager geimporteerd** in `App.tsx` — dus de hele applicatie wordt als een groot JavaScript-bestand geladen, ook als je alleen het dashboard nodig hebt.

## Oplossingen (in volgorde van impact)

### 1. Server-side paginatie op producten (grootste impact)

De `useProducts` hook en productenpagina krijgen echte paginatie:

- Supabase `.range(from, to)` toevoegen aan de query (bijv. 50 per pagina)
- Pagina-navigatie component onderaan de tabel
- Totaal-telling via een aparte `count` query (Supabase `{ count: 'exact', head: true }`)
- Zoeken, filteren en sorteren blijven server-side

**Bestanden:**
- `src/hooks/useProducts.ts` -- `page` parameter toevoegen, `.range()` gebruiken
- `src/pages/Products.tsx` -- Paginatie-buttons toevoegen

### 2. Lazy loading van pagina's (snellere eerste load)

Alle route-pagina's worden `React.lazy()` met `Suspense`, zodat alleen de code voor de huidige pagina wordt geladen. Dit verkleint de initiiele bundle aanzienlijk.

**Bestand:**
- `src/App.tsx` -- Alle imports omzetten naar `React.lazy(() => import(...))`

### 3. React Query staleTime instellen

Momenteel wordt elke query opnieuw opgehaald bij elke navigatie (staleTime = 0). Door een standaard `staleTime` van 30 seconden in te stellen, worden herhaalde API-calls vermeden bij snel navigeren.

**Bestand:**
- `src/App.tsx` -- `QueryClient` configureren met `defaultOptions.queries.staleTime: 30_000`

### 4. Debounce fixen op productzoeken

De huidige debounce is een `setTimeout` zonder cleanup, wat dubbele requests veroorzaakt. Dit wordt vervangen door een echte debounce.

**Bestand:**
- `src/pages/Products.tsx` -- Debounce met `useEffect` + cleanup

## Technische details

### Paginatie (useProducts)

```text
Nieuwe parameters:
  page: number (default 1)
  pageSize: number (default 50)

Query aanpassing:
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

Aparte count-query:
  supabase.from("products").select("*", { count: "exact", head: true })
    .eq("is_active", true)
    ... (zelfde filters)

Return: { data, count, page, pageSize, totalPages }
```

### Lazy loading (App.tsx)

```text
// Voor (eager):
import Dashboard from "./pages/Dashboard";

// Na (lazy):
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Routes wrappen in:
<Suspense fallback={<PageLoader />}>
  <Routes>...</Routes>
</Suspense>
```

### QueryClient optimalisatie

```text
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 sec: voorkom onnodige refetches
      gcTime: 10 * 60 * 1000,    // 10 min cache
      refetchOnWindowFocus: false,
    },
  },
});
```

## Verwacht resultaat

| Maatregel | Effect |
|---|---|
| Paginatie producten | Laadtijd productpagina van ~5s naar <0.5s |
| Lazy loading routes | Initiiele bundle ~60% kleiner |
| staleTime | Minder API-calls bij navigatie |
| Debounce fix | Geen dubbele zoek-requests |

## Bestanden die wijzigen

1. `src/hooks/useProducts.ts` -- Paginatie toevoegen
2. `src/pages/Products.tsx` -- Paginatie UI + debounce fix
3. `src/App.tsx` -- Lazy imports + QueryClient configuratie

