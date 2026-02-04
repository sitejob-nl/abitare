
# Plan: Wachtwoord Wijzigen in Instellingen

## Overzicht

Een nieuwe "Account" tab toevoegen aan de instellingenpagina waar elke ingelogde gebruiker zijn eigen wachtwoord kan wijzigen. Dit is toegankelijk voor alle gebruikers, niet alleen admins.

## Huidige Situatie

- De instellingenpagina (`/settings`) is momenteel alleen toegankelijk voor admins
- Er is al een `SetPassword.tsx` pagina met wachtwoord validatie logica die we kunnen hergebruiken
- Wachtwoord wijzigen kan via `supabase.auth.updateUser({ password: ... })`

## Aanpak

### 1. Nieuwe Component: ChangePasswordCard

Een aparte component maken voor het wachtwoord wijzigen formulier:

**Functionaliteit:**
- Huidig wachtwoord invoeren (optioneel - Supabase vereist dit niet als je ingelogd bent)
- Nieuw wachtwoord invoeren
- Bevestig nieuw wachtwoord
- Wachtwoord tonen/verbergen toggle
- Validatie: minimaal 8 tekens, wachtwoorden moeten overeenkomen
- Succes/fout feedback via toast

### 2. Settings Pagina Aanpassen

De instellingenpagina aanpassen zodat:
- Niet-admins nu ook toegang hebben (voor hun eigen account instellingen)
- Nieuwe "Account" tab toevoegen met wachtwoord wijzigen
- Admin-only tabs (Vestigingen, Gebruikers, Koppelingen) blijven alleen voor admins zichtbaar

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/settings/ChangePasswordCard.tsx` | **NIEUW** - Wachtwoord wijzigen formulier |
| `src/pages/Settings.tsx` | Account tab toevoegen, toegang voor alle gebruikers |

## Technische Details

### ChangePasswordCard Component

```text
┌─────────────────────────────────────────┐
│  Wachtwoord Wijzigen                    │
├─────────────────────────────────────────┤
│                                         │
│  Nieuw wachtwoord                       │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••                    👁  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Bevestig nieuw wachtwoord              │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ✓ Minimaal 8 tekens                    │
│  ✓ Wachtwoorden komen overeen           │
│                                         │
│  [    Wachtwoord wijzigen     ]         │
│                                         │
└─────────────────────────────────────────┘
```

### Settings.tsx Wijzigingen

```text
Tabs voor ALLE gebruikers:
┌────────────┐
│  Account   │  ← Nieuwe tab (wachtwoord wijzigen)
└────────────┘

Tabs alleen voor ADMINS:
┌─────────────┬────────────┬─────────────┐
│ Vestigingen │ Gebruikers │ Koppelingen │
└─────────────┴────────────┴─────────────┘
```

**Logica:**
- Default tab = "account" voor iedereen
- Als `!isAdmin`: toon alleen "Account" tab
- Als `isAdmin`: toon alle tabs

## Resultaat

- Elke ingelogde gebruiker kan nu naar `/settings` gaan
- Daar ziet iedereen minimaal de "Account" tab met wachtwoord wijzigen
- Admins zien daarnaast ook de bestaande tabs voor beheer
- Consistente UI met de rest van de applicatie
