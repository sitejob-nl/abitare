
# Plan: Strikte Monteur-Omgeving Afdwingen

## Probleem

De monteur (`info@sitejob.nl`) kan nog steeds alle admin-pagina's bezoeken door direct naar een URL te gaan (bijv. `/service`). De huidige fix redirect alleen van `/` naar `/monteur`, maar blokkeert geen andere pagina's.

**Huidige logica in `ProtectedRoute.tsx`:**
```typescript
if (isOnlyInstaller && location.pathname === "/") {
  return <Navigate to="/monteur" replace />;
}
```

Dit werkt alleen voor de homepage, niet voor `/service`, `/orders`, `/customers`, etc.

## Oplossing

Breid de check uit zodat monteurs (zonder admin/manager rol) worden omgeleid naar `/monteur` voor ALLE routes die niet beginnen met `/monteur`.

## Code Wijziging

**Bestand:** `src/components/auth/ProtectedRoute.tsx`

```typescript
// Huidige code (regel 54-62):
const isOnlyInstaller = roles.includes("monteur") && 
                        !roles.includes("admin") && 
                        !roles.includes("manager");

if (isOnlyInstaller && location.pathname === "/") {
  return <Navigate to="/monteur" replace />;
}

// Nieuwe code:
const isOnlyInstaller = roles.includes("monteur") && 
                        !roles.includes("admin") && 
                        !roles.includes("manager");

// Monteurs mogen ALLEEN de /monteur/* routes gebruiken
if (isOnlyInstaller && !location.pathname.startsWith("/monteur")) {
  return <Navigate to="/monteur" replace />;
}
```

## Resultaat

Na deze wijziging:

| Route | Admin/Manager | Monteur |
|-------|---------------|---------|
| `/` | Dashboard | → Redirect naar `/monteur` |
| `/service` | Service pagina | → Redirect naar `/monteur` |
| `/orders` | Orders pagina | → Redirect naar `/monteur` |
| `/customers` | Klanten pagina | → Redirect naar `/monteur` |
| `/monteur` | Monteur dashboard | Monteur dashboard |
| `/monteur/opdracht/:id` | Order detail | Order detail |
| `/monteur/werkbon/:id` | Werkbon formulier | Werkbon formulier |

## Technische Details

- De `InstallerRoute` component staat al toe dat admins/managers ook de monteur-routes kunnen bezoeken (handig voor testing)
- Data-niveau beveiliging blijft intact via RLS policies
- Geen wijzigingen nodig in routing (`App.tsx`) of andere componenten
