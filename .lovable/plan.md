
# Plan: Fix Race Condition in AuthContext

## Probleem

De `/monteur` route redirect naar het dashboard omdat de rollen nog niet geladen zijn wanneer de route-check plaatsvindt. Dit is een **race condition**:

1. Sessie wordt opgehaald ✓
2. `isLoading` wordt `false` gezet
3. Rollen worden **asynchroon** opgehaald (niet afgewacht!)
4. Route check ziet lege `roles` array → redirect

## Oplossing

De `isLoading` status mag pas op `false` gezet worden **nadat** de rollen zijn opgehaald.

---

## Technische Wijzigingen

### Bestand: `src/contexts/AuthContext.tsx`

**Huidige code (probleem):**
```typescript
supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
  setSession(existingSession);
  setUser(existingSession?.user ?? null);

  if (existingSession?.user) {
    fetchUserData(existingSession.user.id);  // ❌ Niet afgewacht!
  }
  setIsLoading(false);  // ❌ Te vroeg!
});
```

**Nieuwe code (fix):**
```typescript
const initializeAuth = async () => {
  try {
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    
    setSession(existingSession);
    setUser(existingSession?.user ?? null);

    if (existingSession?.user) {
      await fetchUserData(existingSession.user.id);  // ✓ Wacht op rollen
    }
  } finally {
    setIsLoading(false);  // ✓ Pas na rollen laden
  }
};

initializeAuth();
```

**Aanpassing `onAuthStateChange`:**
```typescript
supabase.auth.onAuthStateChange(async (event, currentSession) => {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);

  if (currentSession?.user) {
    // Fire and forget - alleen bij SIGN_IN event wachten we
    if (event === 'SIGNED_IN') {
      await fetchUserData(currentSession.user.id);
    } else {
      fetchUserData(currentSession.user.id);
    }
  } else {
    setProfile(null);
    setRoles([]);
    setActiveDivisionId(null);
  }
  // isLoading wordt alleen door initializeAuth beheerd
});
```

---

## Volledige Herziene `useEffect`

```typescript
useEffect(() => {
  let isMounted = true;

  // Listener voor ONGOING auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, currentSession) => {
      if (!isMounted) return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Bij SIGN_IN altijd wachten op rollen
        if (event === 'SIGNED_IN') {
          await fetchUserData(currentSession.user.id);
        } else {
          // Voor andere events (TOKEN_REFRESH) fire and forget
          fetchUserData(currentSession.user.id);
        }
      } else {
        setProfile(null);
        setRoles([]);
        setActiveDivisionId(null);
      }
    }
  );

  // INITIËLE load - wacht op alles voordat isLoading false wordt
  const initializeAuth = async () => {
    try {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        await fetchUserData(existingSession.user.id);
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

---

## Samenvatting

| Aspect | Oud | Nieuw |
|--------|-----|-------|
| `getSession()` | Promise met `.then()` | `async/await` |
| `fetchUserData()` | Fire and forget | Afgewacht met `await` |
| `setIsLoading(false)` | Direct na session | Pas na rollen geladen |
| Cleanup | Geen | `isMounted` flag |

---

## Resultaat

Na deze fix:
1. De app toont een loading spinner tot de rollen zijn geladen
2. De `InstallerRoute` ontvangt de correcte `roles` array
3. Navigatie naar `/monteur` werkt correct voor gebruikers met de monteur rol
