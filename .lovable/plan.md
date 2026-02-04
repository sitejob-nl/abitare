
# Plan: Automatische Uitnodigingsmail via Supabase + Slimme Redirect

## Overzicht

De huidige `invite-user` edge function maakt gebruikers aan maar stuurt GEEN email. Supabase Auth kan automatisch emails versturen via de ingebouwde SMTP, maar dit vereist:

1. **Gebruik van `inviteUserByEmail` i.p.v. `createUser`** - Dit triggert automatisch de Supabase "Invite" email template
2. **Aanpassen van de Supabase Email Template** - In het Supabase dashboard voor mooie HTML
3. **Slimme redirect na wachtwoord instellen** - Op basis van de gebruikersrol naar de juiste omgeving

---

## Technische Wijzigingen

### 1. Edge Function: `invite-user/index.ts`

**Wijziging**: Vervang `createUser` door `inviteUserByEmail`

```typescript
// OUD (geen email)
const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
  email,
  email_confirm: true,
  user_metadata: { full_name },
});

// NIEUW (automatische invite email)
const { data: newUser, error: createError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
  data: { full_name },
  redirectTo: `${origin}/set-password`,
});
```

**Voordelen**:
- Supabase stuurt automatisch de "Invite User" email template
- De link bevat een `type=invite` token die werkt met de SetPassword pagina
- Geen Resend of andere email service nodig

---

### 2. SetPassword Pagina: `src/pages/SetPassword.tsx`

**Wijziging 1**: Herken ook `type=invite` tokens (naast `type=recovery`)

```typescript
// Check voor recovery OF invite token
if ((type === "recovery" || type === "invite") && accessToken) {
  // ... bestaande sessie logica
}
```

**Wijziging 2**: Slimme redirect na wachtwoord instellen op basis van rol

```typescript
// Na succesvol wachtwoord instellen
const { data: rolesData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id);

const roles = rolesData?.map(r => r.role) || [];

// Monteurs naar /monteur, anderen naar dashboard
if (roles.includes("monteur") && !roles.includes("admin") && !roles.includes("manager")) {
  navigate("/monteur", { replace: true });
} else {
  navigate("/", { replace: true });
}
```

---

### 3. Supabase Dashboard: Email Template Customizen

**Locatie**: Supabase Dashboard → Authentication → Email Templates → Invite User

**Huidige template** (standaard, saai):
```html
<h2>You have been invited</h2>
<p>You have been invited to create a user on {{ .SiteURL }}.</p>
<p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>
```

**Nieuwe template** (mooi, in het Nederlands):
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background: #f5f5f5; padding: 40px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
    .logo { text-align: center; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
    .text { color: #666; line-height: 1.6; margin-bottom: 24px; }
    .button { display: inline-block; background: #0f172a; color: white; padding: 14px 28px; 
              border-radius: 8px; text-decoration: none; font-weight: 500; }
    .footer { margin-top: 32px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://abitare.lovable.app/assets/logo.svg" alt="Abitare" height="32">
    </div>
    <h1 class="title">Welkom bij Abitare!</h1>
    <p class="text">
      Je bent uitgenodigd om een account aan te maken. 
      Klik op onderstaande knop om je wachtwoord in te stellen en aan de slag te gaan.
    </p>
    <p style="text-align: center;">
      <a href="{{ .ConfirmationURL }}" class="button">Wachtwoord instellen</a>
    </p>
    <p class="footer">
      Deze link is 24 uur geldig. Als je deze uitnodiging niet verwachtte, kun je deze email negeren.
    </p>
  </div>
</body>
</html>
```

---

## Samenvatting Bestandswijzigingen

| Bestand | Actie |
|---------|-------|
| `supabase/functions/invite-user/index.ts` | Wijzig `createUser` → `inviteUserByEmail` |
| `src/pages/SetPassword.tsx` | Herken `type=invite`, redirect op basis van rol |

---

## Flow na Implementatie

```text
Admin nodigt gebruiker uit
        ↓
Edge function roept inviteUserByEmail aan
        ↓
Supabase stuurt automatisch mooie HTML email
        ↓
Gebruiker klikt op link → /set-password?token=...
        ↓
Gebruiker stelt wachtwoord in
        ↓
Check rollen in database:
  - Monteur (alleen) → redirect naar /monteur
  - Admin/Manager/etc → redirect naar /dashboard
```

---

## Handmatige Stap (door jou)

Na implementatie moet je **eenmalig** de email template aanpassen in Supabase:

1. Ga naar: https://supabase.com/dashboard/project/lqfqxspaamzhtgxhvlib/auth/templates
2. Klik op "Invite User"
3. Plak de nieuwe HTML template
4. Sla op

Dit kan niet automatisch vanuit code - het moet via het dashboard.
