
# Plan: Microsoft Entra (Outlook) Integratie voor Agenda & Mail

## Overzicht

Elke gebruiker kan zijn eigen Microsoft 365 account koppelen om:
- **Agenda synchronisatie**: Orders/montages in Outlook agenda zetten
- **Mail toegang**: Emails lezen/versturen vanuit de app

De integratie volgt hetzelfde patroon als de bestaande Exact Online koppeling.

---

## Stap 1: Azure Portal - App Registratie

Voordat we code schrijven, moet je een app registreren in Microsoft Entra:

### 1.1 Ga naar Azure Portal
1. Ga naar https://portal.azure.com
2. Zoek naar "App registrations" (of "App-registraties")
3. Klik op "+ New registration"

### 1.2 Registreer de applicatie
- **Name**: `Abitare Keukens`
- **Supported account types**: Kies "Accounts in any organizational directory and personal Microsoft accounts"
- **Redirect URI**: 
  - Platform: `Web`
  - URL: `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/microsoft-auth-callback`

### 1.3 Noteer de credentials
Na registratie, noteer:
- **Application (client) ID** → wordt `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** → wordt `MICROSOFT_TENANT_ID` (gebruik "common" voor multi-tenant)

### 1.4 Client Secret aanmaken
1. Ga naar "Certificates & secrets"
2. Klik op "+ New client secret"
3. Beschrijving: `Abitare Production`
4. Expiratie: 24 maanden
5. Noteer de **Value** → wordt `MICROSOFT_CLIENT_SECRET`

### 1.5 API Permissions instellen
Ga naar "API permissions" en voeg toe:

| API | Permission | Type |
|-----|------------|------|
| Microsoft Graph | `Calendars.ReadWrite` | Delegated |
| Microsoft Graph | `Mail.ReadWrite` | Delegated |
| Microsoft Graph | `Mail.Send` | Delegated |
| Microsoft Graph | `User.Read` | Delegated |
| Microsoft Graph | `offline_access` | Delegated |

Klik daarna op "Grant admin consent" (optioneel, afhankelijk van policy).

---

## Stap 2: Supabase Secrets Toevoegen

In Supabase Dashboard → Settings → Edge Functions → Secrets:

| Secret | Waarde |
|--------|--------|
| `MICROSOFT_CLIENT_ID` | Jouw Application ID |
| `MICROSOFT_CLIENT_SECRET` | Jouw Client Secret |
| `MICROSOFT_TENANT_ID` | `common` (voor multi-tenant) |

---

## Stap 3: Database Migratie

Nieuwe tabel voor gebruiker-specifieke Microsoft koppelingen:

```sql
CREATE TABLE public.microsoft_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,
  microsoft_user_id TEXT,
  microsoft_email TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

-- RLS: gebruikers zien alleen hun eigen connectie
ALTER TABLE public.microsoft_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection"
ON public.microsoft_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connection"
ON public.microsoft_connections FOR DELETE
USING (auth.uid() = user_id);
```

---

## Stap 4: Edge Functions

### 4.1 `microsoft-auth` - Start OAuth flow

```text
supabase/functions/microsoft-auth/index.ts
```

- Ontvangt user ID
- Bouwt Microsoft OAuth URL met juiste scopes
- Returnt redirect URL naar Microsoft login

### 4.2 `microsoft-auth-callback` - Handle OAuth response

```text
supabase/functions/microsoft-auth-callback/index.ts
```

- Ontvangt authorization code van Microsoft
- Wisselt code in voor access + refresh token
- Haalt gebruiker info op via Graph API
- Slaat tokens encrypted op in database
- Redirect terug naar app

### 4.3 `microsoft-api` - Proxy voor Graph API calls

```text
supabase/functions/microsoft-api/index.ts
```

- Verifieert user authenticated
- Haalt tokens op uit database
- Refresh token indien nodig
- Voert Graph API call uit
- Returnt resultaat

---

## Stap 5: Frontend Componenten

### 5.1 Settings component: `MicrosoftSettings.tsx`

Locatie in Account tab (niet Koppelingen, want dit is per-gebruiker):

```text
src/components/settings/MicrosoftSettings.tsx
```

- Toont koppelstatus per ingelogde gebruiker
- "Koppel Outlook" knop → start OAuth
- "Ontkoppelen" knop indien verbonden
- Sync opties: handmatig agenda sync

### 5.2 Hook: `useMicrosoftConnection.ts`

```text
src/hooks/useMicrosoftConnection.ts
```

- `useMicrosoftConnection()` - haal connectie status
- `useStartMicrosoftAuth()` - start OAuth
- `useDisconnectMicrosoft()` - verwijder connectie
- `useMicrosoftCalendar()` - agenda operaties
- `useMicrosoftMail()` - mail operaties

---

## Stap 6: Agenda Integratie

### Sync naar Outlook
Wanneer een order een montagedatum krijgt:
1. Maak een Outlook calendar event
2. Sla event ID op bij order voor updates/deletes

### Velden in event:
- **Subject**: `Montage #1234 - Van den Berg`
- **Location**: Klant adres
- **Body**: Order details, producten
- **Start/End**: Montagedatum (hele dag of specifieke tijd)

### Database uitbreiding:
```sql
ALTER TABLE orders 
ADD COLUMN outlook_event_id TEXT;
```

---

## Stap 7: Mail Integratie (Fase 2)

Mogelijke features:
- Inbox widget met recente emails
- Email versturen vanuit order/offerte
- Email templates

---

## Bestandsstructuur

### Nieuwe bestanden:

```text
supabase/functions/
  microsoft-auth/index.ts
  microsoft-auth-callback/index.ts
  microsoft-api/index.ts
  microsoft-calendar-sync/index.ts

src/components/settings/
  MicrosoftSettings.tsx

src/hooks/
  useMicrosoftConnection.ts
```

### Aangepaste bestanden:

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/Settings.tsx` | MicrosoftSettings toevoegen in Account tab |
| `src/pages/OrderDetail.tsx` | "Sync naar Outlook" knop (optioneel) |

---

## Visueel Ontwerp

### Account Tab - Microsoft Koppeling

```text
┌─────────────────────────────────────────────────────────────┐
│  Microsoft 365 Koppeling                                    │
│  Koppel je Outlook account voor agenda en email integratie  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ○ Niet gekoppeld                                           │
│                                                             │
│  [🔗 Koppel Microsoft Account]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

// Of indien gekoppeld:

┌─────────────────────────────────────────────────────────────┐
│  Microsoft 365 Koppeling                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ Gekoppeld als jan@abitare.nl                             │
│    Gekoppeld op: 4 februari 2026                            │
│                                                             │
│  ☐ Automatisch montages naar agenda                         │
│  ☐ Automatisch leveringen naar agenda                       │
│                                                             │
│  [Synchroniseer Nu]  [Ontkoppelen]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fasering

### Fase 1: Basis OAuth (dit plan)
- App registratie in Azure
- Edge functions voor auth flow
- Database tabel
- Settings UI voor koppelen/ontkoppelen

### Fase 2: Agenda Sync
- Calendar events aanmaken bij montage/levering
- Events bijwerken bij datum wijziging
- Events verwijderen bij annulering

### Fase 3: Mail Integratie
- Inbox widget
- Email versturen vanuit app
- Email threading per klant/order

---

## Volgende Stappen

1. **Eerst**: Registreer de app in Azure Portal (instructies hierboven)
2. **Dan**: Voeg secrets toe in Supabase
3. **Dan**: Ik implementeer de code

Wil je dat ik de Azure Portal stappen in meer detail uitleg, of ben je klaar om de app te registreren?
