

# Plan: Fix Login Timeout voor info@sitejob.nl

## Probleem Analyse

De console logs tonen het exacte probleem:

```
Auth state change fetchUserData timeout/error: Timeout: fetchUserData(SIGNED_IN)
```

Dit gebeurt **3 keer**, wat aangeeft dat:
1. De `onAuthStateChange` listener meerdere `SIGNED_IN` events ontvangt
2. Elke keer wordt `fetchUserData` met een 6s timeout gestart
3. Deze timeout raakt, ook al zijn de network requests succesvol (200 OK)

De paradox: de network logs tonen dat `profiles` en `user_roles` queries **wel slagen**. Dit wijst op een timing/race condition probleem.

---

## Root Cause

In `AuthContext.tsx` regel 128-136:

```typescript
if (event === 'SIGNED_IN') {
  try {
    await withTimeout(fetchUserData(currentSession.user.id), 6000, "fetchUserData(SIGNED_IN)");
  } catch (e) {
    console.error("Auth state change fetchUserData timeout/error:", e);
    setAuthInitError("Gebruikersgegevens ophalen duurt te lang...");
  }
}
```

**Probleem 1**: Bij **elke** `SIGNED_IN` event wordt dezelfde timeout-error gezet, zelfs als de initiële load al geslaagd is.

**Probleem 2**: De `onAuthStateChange` listener en `initializeAuth` runnen **parallel** en kunnen elkaar in de weg zitten.

---

## Oplossing

### Strategie: Scheiding van Initiële Load vs Ongoing Changes

1. **Initiële load** (`initializeAuth`) → controleert `isLoading`, mag `authInitError` zetten
2. **Ongoing auth changes** (`onAuthStateChange`) → update state, maar zet **geen** errors die de UI blokkeren

### Code Wijzigingen

**`src/contexts/AuthContext.tsx`**:

```typescript
// Voeg een ref toe om te tracken of initiële load klaar is
const initCompleteRef = useRef(false);

// In onAuthStateChange - ALLEEN errors loggen, niet de UI blokkeren
if (event === 'SIGNED_IN') {
  if (!initCompleteRef.current) {
    // Tijdens initiële load: wacht met timeout, maar error handling in initializeAuth
    // Doe hier NIETS anders - laat initializeAuth het afhandelen
  } else {
    // Na initiële load: fire and forget, geen timeout
    fetchUserData(currentSession.user.id).catch(err => {
      console.error("Background fetchUserData error:", err);
    });
  }
}

// In initializeAuth finally block:
initCompleteRef.current = true;
setIsLoading(false);
```

### Extra Robuustheid

- Verhoog timeout van 6s naar 10s voor `fetchUserData`
- Voeg een `abortController` toe om dubbele fetches te cancellen
- Log warnings i.p.v. errors voor non-blocking issues

---

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Fix race condition tussen initializeAuth en onAuthStateChange |

---

## Verwacht Resultaat

Na deze fix:
- Login voor `info@sitejob.nl` werkt direct
- Geen timeout errors meer in de console
- De "Kan niet laden" foutmelding verschijnt alleen bij echte netwerk problemen
- Token refresh events verstoren de UI niet meer

