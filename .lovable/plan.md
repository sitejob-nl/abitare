
# Plan: Automatische Redirect voor Monteurs

## Probleem

Wanneer `info@sitejob.nl` (rol: monteur) inlogt:
1. Login redirect naar `/` (standaard)
2. De `ProtectedRoute` laat de user door (alleen check op authenticatie)
3. User ziet volledige admin Dashboard in plaats van monteur-omgeving

De gebruiker heeft WEL de juiste rol in de database, maar de app stuurt ze niet naar de juiste omgeving.

## Oplossing

### Optie A: Redirect in Login component (Aanbevolen)

Na succesvolle login, check de gebruikersrollen en redirect naar de juiste pagina:

```typescript
// src/pages/Login.tsx
const { signIn, roles, isInstaller } = useAuth();

// Na login:
if (isInstaller && !roles.includes('admin') && !roles.includes('manager')) {
  navigate('/monteur', { replace: true });
} else {
  navigate(from, { replace: true });
}
```

**Probleem**: De rollen worden async geladen NA de login, dus we moeten wachten tot ze beschikbaar zijn.

### Optie B: Redirect in ProtectedRoute (Eenvoudiger)

Voeg rol-check toe aan ProtectedRoute die monteurs automatisch redirect:

```typescript
// src/components/auth/ProtectedRoute.tsx
const { user, isLoading, roles, isInstaller, isAdmin, isAdminOrManager } = useAuth();

// Na user check:
if (isInstaller && !isAdminOrManager) {
  return <Navigate to="/monteur" replace />;
}
```

### Optie C: Aparte Redirect Component (Beste UX)

Maak een `RoleBasedRedirect` component die na login de juiste route bepaalt:

```typescript
// Nieuwe route: /redirect-after-login
// Deze analyseert rollen en redirect naar /monteur of /
```

## Aanbevolen Aanpak: Optie B

Dit is de eenvoudigste oplossing met minimale code wijzigingen:

1. Update `ProtectedRoute.tsx` om monteurs te detecteren
2. Redirect monteurs naar `/monteur` als ze `/` proberen te bezoeken
3. Andere routes blijven toegankelijk voor admins/managers

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/auth/ProtectedRoute.tsx` | Voeg rol-based redirect toe voor monteurs |

## Code Implementatie

```typescript
// src/components/auth/ProtectedRoute.tsx
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, authInitError, retryAuthInit, signOut, roles } = useAuth();
  const location = useLocation();

  // ... bestaande loading/error checks ...

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // NIEUW: Redirect monteurs naar hun eigen omgeving
  const isOnlyInstaller = roles.includes("monteur") && 
                          !roles.includes("admin") && 
                          !roles.includes("manager");
  
  if (isOnlyInstaller && location.pathname === "/") {
    return <Navigate to="/monteur" replace />;
  }

  return <>{children}</>;
}
```

## Extra Overweging

Wil je dat monteurs ALLEEN toegang hebben tot `/monteur/*` routes, of mogen ze ook andere pagina's zien (bijv. `/orders/:id` voor order details)?

**Huidige situatie**: Monteurs kunnen technisch gezien alle ProtectedRoutes bezoeken, maar de data is beperkt via RLS.

**Optie voor strikte toegang**: Voeg een check toe die monteurs blokkeert voor alle niet-monteur routes:

```typescript
if (isOnlyInstaller && !location.pathname.startsWith("/monteur")) {
  return <Navigate to="/monteur" replace />;
}
```

Dit is optioneel en kan later worden toegevoegd.
