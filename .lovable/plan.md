

# WhatsApp Config endpoint + crash fix

## 1. Nieuwe edge function: `whatsapp-config`

Ontvangt credentials van SiteJob Connect via webhook en slaat ze op in `whatsapp_config`.

**Bestand:** `supabase/functions/whatsapp-config/index.ts`

- Accepteert alleen POST
- Verifieert `X-Webhook-Secret` header tegen `WHATSAPP_WEBHOOK_SECRET` secret
- Upsert naar `whatsapp_config` met vast ID `00000000-0000-0000-0000-000000000001`
- CORS headers meegeven

**Bestand:** `supabase/config.toml`

- Toevoegen: `[functions.whatsapp-config]` met `verify_jwt = false` (webhook vanuit extern systeem, geen JWT)

## 2. Fix: Customer pagina crash

De `useWhatsAppTemplates` hook gooit een error als WhatsApp niet geconfigureerd is (400 response). React Query retry't dit 3x, wat de pagina laat hangen.

**Bestand:** `src/hooks/useWhatsAppTemplates.ts`

- `retry: false` toevoegen
- Bij error of `data?.error`: return lege array in plaats van gooien

**Bestand:** `src/components/customers/CustomerCommunicationTab.tsx`

- `ComposeWhatsAppDialog` alleen renderen als `showWhatsAppDialog === true` (regel 430-438)
- Dit voorkomt dat de templates query start voordat de gebruiker de dialog opent

## Samenvatting bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/whatsapp-config/index.ts` | Nieuw |
| `supabase/config.toml` | `whatsapp-config` entry toevoegen |
| `src/hooks/useWhatsAppTemplates.ts` | `retry: false`, graceful error handling |
| `src/components/customers/CustomerCommunicationTab.tsx` | Conditional render van dialog |
