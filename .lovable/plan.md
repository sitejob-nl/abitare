
# Plan: PWA Update Notificatie

## Overzicht

Wanneer er een nieuwe versie van de app beschikbaar is, krijgt de gebruiker een melding met een knop om de app bij te werken. Dit is een betere ervaring dan de huidige automatische updates zonder feedback.

## Huidige Situatie

- PWA gebruikt `registerType: "autoUpdate"` → updates gebeuren stil op de achtergrond
- Gebruiker heeft geen idee wanneer er een nieuwe versie is
- Soms moet de gebruiker handmatig de app sluiten en opnieuw openen

## Aanpak

### 1. Wijzig registerType naar "prompt"

In `vite.config.ts` veranderen we van automatische updates naar handmatige updates met een prompt:

```typescript
VitePWA({
  registerType: "prompt",  // was: "autoUpdate"
  // ...rest blijft hetzelfde
})
```

### 2. Nieuw Component: UpdatePrompt

Een nieuwe component die:
- De `useRegisterSW` hook van vite-plugin-pwa gebruikt
- Detecteert wanneer een nieuwe versie beschikbaar is (`needRefresh`)
- Een toast/melding toont met "Update beschikbaar"
- Een "Nu bijwerken" knop biedt die de app herlaadt
- Ook "offline ready" meldingen kan tonen (optioneel)

## Visueel Ontwerp

```text
┌──────────────────────────────────────────────────┐
│  🔄  Er is een update beschikbaar                │
│      Klik op bijwerken voor de nieuwste versie   │
│                                                  │
│              [Later]  [Nu bijwerken]             │
└──────────────────────────────────────────────────┘
```

De melding verschijnt als een floating card onderaan het scherm, consistent met de huidige InstallPrompt styling.

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `vite.config.ts` | `registerType` van `"autoUpdate"` naar `"prompt"` |
| `src/components/pwa/UpdatePrompt.tsx` | **NIEUW** - Update notificatie component |
| `src/vite-env.d.ts` | Type declarations voor `virtual:pwa-register/react` |
| `src/App.tsx` | UpdatePrompt component toevoegen |

## Technische Details

### UpdatePrompt Component

```typescript
import { useRegisterSW } from 'virtual:pwa-register/react'

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Optioneel: periodiek controleren op updates
      r && setInterval(() => r.update(), 60 * 60 * 1000) // elk uur
    },
  })

  // Toon update prompt als needRefresh true is
  if (!needRefresh && !offlineReady) return null;

  return (
    // UI met "Nu bijwerken" knop
  )
}
```

### Type Declarations

Voor TypeScript ondersteuning voegen we type declarations toe:

```typescript
declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(options?: {
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }): {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
```

## Gedrag

1. **Nieuwe versie beschikbaar**: Wanneer de service worker detecteert dat er nieuwe content is, wordt `needRefresh` true
2. **Gebruiker klikt "Nu bijwerken"**: `updateServiceWorker(true)` wordt aangeroepen → pagina herlaadt met nieuwe versie
3. **Gebruiker klikt "Later"**: De prompt verdwijnt, maar de update wordt toegepast bij de volgende keer dat de app wordt geopend
4. **Offline ready** (optioneel): Eenmalige melding dat de app offline kan werken

## Resultaat

- Gebruikers zien een duidelijke melding wanneer er een update beschikbaar is
- Gebruikers kunnen zelf kiezen wanneer ze updaten
- Geen verwarring meer over "waarom werkt iets niet" door outdated cache
- Betere controle over de app lifecycle
