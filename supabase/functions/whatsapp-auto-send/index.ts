import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// WhatsApp Auto-Send — processes whatsapp_send_queue
// Triggered by cron or manually. Sends template messages
// for order status changes.
// ============================================================

const BATCH_SIZE = 20

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get WhatsApp config
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .single()

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp niet geconfigureerd' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch pending queue items
    const { data: queue, error: fetchErr } = await supabase
      .from('whatsapp_send_queue' as any)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchErr) {
      console.error('[wa-auto] Fetch error:', fetchErr.message)
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!queue || queue.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'Queue empty' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0

    for (const item of queue as any[]) {
      try {
        // Mark as processing
        await supabase
          .from('whatsapp_send_queue' as any)
          .update({ status: 'processing' })
          .eq('id', item.id)

        // Build template message
        const normalizedPhone = normalizePhone(item.phone_number)

        const metaBody: Record<string, unknown> = {
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'template',
          template: {
            name: item.template_name,
            language: { code: item.template_language || 'nl' },
            components: item.template_params ? JSON.parse(
              typeof item.template_params === 'string' ? item.template_params : JSON.stringify(item.template_params)
            ) : [],
          },
        }

        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metaBody),
          }
        )

        const result = await metaRes.json()

        if (!metaRes.ok) {
          throw new Error(result?.error?.message || `Meta API ${metaRes.status}`)
        }

        const wamid = result.messages?.[0]?.id || null

        // Mark as sent
        await supabase
          .from('whatsapp_send_queue' as any)
          .update({ status: 'sent', processed_at: new Date().toISOString(), external_message_id: wamid })
          .eq('id', item.id)

        // Log in communication_log
        await supabase.from('communication_log').insert({
          type: 'whatsapp',
          direction: 'outbound',
          subject: `Auto WhatsApp: ${item.template_name}`,
          body_preview: `Template: ${item.template_name} (automatisch)`,
          customer_id: item.customer_id || null,
          order_id: item.order_id || null,
          sent_at: new Date().toISOString(),
          external_message_id: wamid,
          metadata: { auto: true, template_name: item.template_name, trigger: item.trigger_status },
        })

        sent++
      } catch (err) {
        console.error(`[wa-auto] Failed item ${item.id}:`, err)
        await supabase
          .from('whatsapp_send_queue' as any)
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        failed++
      }
    }

    console.log(`[wa-auto] Done: ${sent} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({ processed: sent + failed, sent, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[wa-auto] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2)
  if (cleaned.startsWith('06')) cleaned = '316' + cleaned.slice(2)
  return cleaned
}
